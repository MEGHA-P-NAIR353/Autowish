"""
services/ai/provider_manager.py - Multi-Provider AI Orchestrator with Fallback
=============================================================================
Orchestrates AI greeting generation with automatic fallback:
1. Gemini (Primary) -> 2. Groq (Fallback 1) -> 3. OpenRouter (Fallback 2)

Features:
- Fast failover with provider-specific timeouts.
- Universal sanitization and quality validation.
- Privacy-isolated Redis caching.
- Structured logging without leaking credentials or private data.
- User-friendly error generation when all providers fail.
"""

import time
import logging
import unicodedata
import re
from typing import Optional, Dict, Any, List, Tuple
from django.conf import settings

from .providers.base import (
    BaseAIProvider,
    AIProviderError,
    ProviderAuthError,
    ProviderTimeoutError,
    ProviderRateLimitError,
    ProviderModelNotFoundError,
    ProviderUnavailableError,
    ProviderResponseError,
)
from .providers.gemini_provider import GeminiProvider
from .providers.groq_provider import GroqProvider
from .providers.openrouter_provider import OpenRouterProvider
from .prompt_builder import build_greeting_prompt, build_system_prompt
from .cache_service import AICacheService
from .response_cleaner import clean_ai_response, contains_template_text

logger = logging.getLogger(__name__)


class AIValidationError(RuntimeError):
    """
    Raised when the AI response fails quality validation.
    Carries structured data for the frontend to trigger regeneration if needed.
    """
    def __init__(self, reason: str = "invalid_response", provider: Optional[str] = None):
        self.reason = reason
        self.provider = provider
        super().__init__(f"AI generated an invalid response. reason={reason}")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": "AI generated an invalid response. Please try again.",
            "reason": self.reason,
            "provider": self.provider,
            "retry": True,
        }


class ProviderManager:
    """
    Manager class responsible for orchestrating AI generation across multiple providers.
    Maintains provider priority order: Gemini -> Groq -> OpenRouter.
    """

    def __init__(self, providers: Optional[List[BaseAIProvider]] = None):
        if providers is not None:
            self.providers = providers
        else:
            self.providers = [
                GeminiProvider(),
                GroqProvider(),
                OpenRouterProvider(),
            ]

    def _validate_response(self, text: str, recipient_name: Optional[str] = None) -> Tuple[bool, str]:
        """
        Multilingual-safe validation for generated greeting quality and completeness:
        1. Must be non-empty and have minimum meaningful content (>= 15 chars, >= 3 words).
        2. Must not contain reasoning/planning keywords.
        3. Must not contain template placeholders (e.g. 'Greeting + Name', 'Sentence 1').
        4. Must not contain leaked paragraph labels ('Paragraph 1:', '*Paragraph 2:*', etc.).
        5. Must not contain leaked word counts ('(19 words)', 'Word count: 43', etc.).
        6. Must not have unbalanced delimiters or end with an opening delimiter '(', '[', '{'.
        7. Must not end with trailing incomplete/dangling phrases ('feels like a', etc.).

        DOES NOT reject valid responses merely because the final character is a Unicode letter
        (Malayalam 'ൽ', Devanagari, Tamil, Arabic, etc.) or lacks ASCII punctuation.
        """
        if not text or len(text.strip()) < 15:
            return False, f"too_short_{len(text.strip()) if text else 0}_chars"

        words = text.strip().split()
        if len(words) < 3:
            return False, f"too_few_words_{len(words)}"

        if contains_template_text(text):
            return False, "contains_template_placeholder"

        # Forbidden meta keywords
        forbidden_keywords = [
            "the user wants", "the user asked", "we need to", "let me write",
            "let's craft", "thinking:", "analysis:", "reasoning:", "scratchpad:",
            "word count:", "draft:", "internal notes", "output:", "result:",
        ]
        text_lower = text.lower()
        for kw in forbidden_keywords:
            if kw in text_lower:
                return False, f"forbidden_keyword_{kw}"

        # Leaked paragraph labels
        if re.search(r'^\*{0,2}\s*paragraph\s*\d+\s*[:]?\s*\*{0,2}$', text, re.IGNORECASE | re.MULTILINE):
            return False, "leaked_paragraph_label"

        # Leaked word counts
        if re.search(r'^\s*[\(\[\{]?\s*\d+\s*(?:/\s*\d+\s+)?words?\s*[\)\]\}]?\s*$', text, re.IGNORECASE | re.MULTILINE):
            return False, "leaked_word_count"

        stripped = text.rstrip()
        if not stripped:
            return False, "empty_after_strip"

        # Check for unclosed opening brackets/delimiters
        open_parens = text.count('(')
        close_parens = text.count(')')
        open_brackets = text.count('[')
        close_brackets = text.count(']')
        open_braces = text.count('{')
        close_braces = text.count('}')

        if open_parens > close_parens or open_brackets > close_brackets or open_braces > close_braces:
            return False, "unbalanced_delimiters"

        # Check if text ends abruptly with an opening delimiter
        if stripped.endswith(('(', '[', '{', '“', '‘')):
            return False, "ends_with_opening_delimiter"

        # Check trailing dangling words (e.g. "feels like a")
        clean_last_word = re.sub(r'[^\w]', '', words[-1]).lower()
        if len(words) >= 2:
            prev_word = re.sub(r'[^\w]', '', words[-2]).lower()
            if prev_word in {"feels"} and clean_last_word in {"like", "a"}:
                return False, f"dangling_phrase_{prev_word}_{clean_last_word}"

        return True, "valid"

    def _is_suspiciously_incomplete(self, result: Any, cleaned_text: str) -> Tuple[bool, str]:
        """
        Multilingual-safe completeness check.
        PRIMARY SIGNAL: finish_reason == 'MAX_TOKENS'
        SECONDARY SIGNALS:
        - Unbalanced opening delimiters: '(', '[', '{'
        - Ends with open delimiter: '(', '[', '{', '“', '‘'
        - Ends with trailing ellipsis: '...', '…'
        - Ends with trailing continuation punctuation: ',', '-', '—', ':', ';'
        - Trailing incomplete dangling words/conjunctions
        """
        finish_reason = getattr(result, "finish_reason", None)
        finish_str = str(finish_reason).upper() if finish_reason else ""
        is_max_tokens = ("MAX_TOKENS" in finish_str or "LENGTH" in finish_str)

        stripped = cleaned_text.rstrip()
        
        # Check unbalanced delimiters
        if (cleaned_text.count('(') > cleaned_text.count(')') or
            cleaned_text.count('[') > cleaned_text.count(']') or
            cleaned_text.count('{') > cleaned_text.count('}')):
            return True, "unbalanced_delimiters"

        # Check ending with opening punctuation or continuation punctuation
        if stripped.endswith(('(', '[', '{', '“', '‘', '...', '…', ',', '-', '—', ':', ';')):
            return True, "ends_with_open_or_continuation_punctuation"

        # Trailing dangling words
        words = cleaned_text.strip().split()
        if len(words) >= 1:
            clean_last_word = re.sub(r'[^\w]', '', words[-1]).lower()
            if clean_last_word in {"and", "or", "with", "to", "for", "that", "the", "a", "an", "because", "but"}:
                return True, f"dangling_word_{clean_last_word}"

        if is_max_tokens:
            return True, "finish_reason_max_tokens"

        return False, "ok"

    def _is_clearly_complete(self, result: Any, cleaned_text: str) -> bool:
        """
        Determine whether a response is clearly complete despite a MAX_TOKENS finish_reason.
        """
        if not cleaned_text or len(cleaned_text.strip()) < 30:
            return False
        words = cleaned_text.strip().split()
        if len(words) < 6:
            return False
        stripped = cleaned_text.rstrip()
        if stripped.endswith(('(', '[', '{', '“', '‘', '...', '…', ',', '-', '—', ':', ';')):
            return False
        if (cleaned_text.count('(') > cleaned_text.count(')') or
            cleaned_text.count('[') > cleaned_text.count(']') or
            cleaned_text.count('{') > cleaned_text.count('}')):
            return False
        clean_last_word = re.sub(r'[^\w]', '', words[-1]).lower()
        if clean_last_word in {"and", "or", "with", "to", "for", "that", "the", "a", "an", "because", "but"}:
            return False
        return True

    def generate(
        self,
        prompt: str,
        *,
        system_prompt: Optional[str] = None,
        recipient_name: Optional[str] = None,
        user_id: Optional[int] = None,
        max_tokens: int = 512,
        temperature: float = 0.9,
        top_p: float = 0.95,
        timeout: Optional[float] = None,
        cache_key: Optional[str] = None,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        Execute generation across configured providers in priority order.

        Returns:
            Dict containing:
                "content": str (cleaned greeting text)
                "provider": str (e.g. "gemini", "groq", "openrouter", "cache")
                "cached": bool
                "latency_ms": float
        """
        # 1. Check Redis Cache
        if use_cache and cache_key:
            cached_content = AICacheService.get_cached_wish(cache_key)
            if cached_content:
                cleaned_cached = clean_ai_response(cached_content)
                is_valid, invalid_reason = self._validate_response(cleaned_cached, recipient_name)
                if is_valid:
                    logger.info("[AI CACHE HIT VALID] key=%s", cache_key)
                    return {
                        "content": cleaned_cached,
                        "provider": "cache",
                        "cached": True,
                        "latency_ms": 0.0,
                    }
                else:
                    logger.warning("[AI CACHE INVALID] key=%s reason=%s. Invalidating cache...", cache_key, invalid_reason)
                    AICacheService.delete_cached_wish(cache_key)
        elif not use_cache:
            logger.info("[AI REGENERATE] cache_bypass=true key=%s", cache_key)

        errors_summary = []
        start_overall = time.time()
        gemini_max_truncation_retries = int(getattr(settings, "GEMINI_MAX_TRUNCATION_RETRIES", 1))
        gemini_retry_max_tokens = int(getattr(settings, "GEMINI_RETRY_MAX_OUTPUT_TOKENS", 768))

        for provider in self.providers:
            if not provider.is_configured():
                logger.info(
                    "[AI PROVIDER SKIPPED] Provider %s is not configured (missing API key).",
                    provider.name
                )
                continue

            provider_name = provider.name
            model_name = provider.get_model_name()
            logger.info(
                "[AI GENERATION ATTEMPT] Starting generation with provider=%s model=%s",
                provider_name, model_name
            )

            p_start = time.time()
            try:
                raw_result = provider.generate(
                    prompt,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    timeout=timeout,
                )

                # Extract text and metadata
                if hasattr(raw_result, "text"):
                    resp_text = raw_result.text
                    used_model = getattr(raw_result, "model", model_name)
                    finish_reason = getattr(raw_result, "finish_reason", "STOP")
                    elapsed_ms = getattr(raw_result, "latency_ms", round((time.time() - p_start) * 1000, 2))
                else:
                    resp_text = str(raw_result)
                    used_model = model_name
                    finish_reason = "STOP"
                    elapsed_ms = round((time.time() - p_start) * 1000, 2)

                cleaned = clean_ai_response(resp_text)

                # Check if provider reported MAX_TOKENS or response is incomplete
                is_truncated, trunc_reason = self._is_suspiciously_incomplete(raw_result, cleaned)
                if is_truncated and provider_name == "gemini" and gemini_max_truncation_retries > 0:
                    logger.warning(
                        "[AI TRUNCATED RESPONSE DETECTED] provider=%s finish_reason=%s reason=%s. Retrying with max_tokens=%d...",
                        provider_name, finish_reason, trunc_reason, gemini_retry_max_tokens
                    )
                    try:
                        retry_result = provider.generate(
                            prompt,
                            system_prompt=system_prompt,
                            max_tokens=gemini_retry_max_tokens,
                            temperature=temperature,
                            top_p=top_p,
                            timeout=timeout,
                        )
                        retry_text = retry_result.text if hasattr(retry_result, "text") else str(retry_result)
                        retry_cleaned = clean_ai_response(retry_text)
                        retry_finish = getattr(retry_result, "finish_reason", "STOP")
                        elapsed_ms = getattr(retry_result, "latency_ms", round((time.time() - p_start) * 1000, 2))

                        if retry_finish == "STOP":
                            is_valid, validation_reason = self._validate_response(retry_cleaned, recipient_name)
                            if is_valid:
                                cleaned = retry_cleaned
                                raw_result = retry_result
                                used_model = getattr(retry_result, "model", used_model)
                            else:
                                logger.warning("[AI RETRY INVALID] provider=%s reason=%s", provider_name, validation_reason)
                                errors_summary.append(f"{provider_name}: {validation_reason}")
                                continue
                        else:
                            # Second attempt still reached MAX_TOKENS
                            if self._is_clearly_complete(retry_result, retry_cleaned):
                                is_valid, validation_reason = self._validate_response(retry_cleaned, recipient_name)
                                if is_valid:
                                    cleaned = retry_cleaned
                                    raw_result = retry_result
                                    used_model = getattr(retry_result, "model", used_model)
                                else:
                                    errors_summary.append(f"{provider_name}: {validation_reason}")
                                    continue
                            else:
                                logger.warning("[AI RETRY STILL TRUNCATED] provider=%s max_tokens exhausted after retry. Falling back to next provider...", provider_name)
                                errors_summary.append(f"{provider_name}: truncated_max_tokens_after_retry")
                                continue
                    except Exception as retry_err:
                        logger.warning("[AI RETRY FAILED] provider=%s retry failed: %s. Falling back...", provider_name, retry_err)
                        errors_summary.append(f"{provider_name}: retry_failed_{type(retry_err).__name__}")
                        continue
                elif is_truncated and (provider_name != "gemini" or gemini_max_truncation_retries == 0):
                    if not self._is_clearly_complete(raw_result, cleaned):
                        logger.warning(
                            "[AI TRUNCATED RESPONSE REJECTED] provider=%s finish_reason=%s reason=%s. Falling back...",
                            provider_name, finish_reason, trunc_reason
                        )
                        errors_summary.append(f"{provider_name}: {trunc_reason}")
                        continue

                is_valid, validation_reason = self._validate_response(cleaned, recipient_name)
                if not is_valid:
                    logger.warning(
                        "[AI RESPONSE INVALID] provider=%s reason=%s. Falling back to next provider...",
                        provider_name, validation_reason
                    )
                    errors_summary.append(f"{provider_name}: {validation_reason}")
                    continue

                logger.info(
                    "[AI GENERATION SUCCESS] provider=%s model=%s succeeded in %.2fms (length: %d chars, words: %d)",
                    provider_name, used_model, elapsed_ms, len(cleaned), len(cleaned.split())
                )

                # Store in cache if cache is enabled
                if use_cache and cache_key:
                    AICacheService.set_cached_wish(cache_key, cleaned)

                return {
                    "content": cleaned,
                    "provider": provider_name,
                    "cached": False,
                    "latency_ms": elapsed_ms,
                }

            except ProviderAuthError as e:
                logger.error("[AI PROVIDER AUTH ERROR] Provider %s: %s", provider_name, e)
                errors_summary.append(f"{provider_name}: auth_error")
                continue

            except ProviderModelNotFoundError as e:
                logger.warning("[AI PROVIDER MODEL NOT FOUND] Provider %s model unavailable: %s", provider_name, e)
                errors_summary.append(f"{provider_name}: model_not_found")
                continue

            except ProviderRateLimitError as e:
                logger.warning(
                    "[AI PROVIDER RATE LIMIT] Provider %s rate-limited. Falling back immediately...",
                    provider_name
                )
                errors_summary.append(f"{provider_name}: rate_limit")
                continue

            except ProviderTimeoutError as e:
                logger.warning(
                    "[AI PROVIDER TIMEOUT] Provider %s timed out. Falling back immediately...",
                    provider_name
                )
                errors_summary.append(f"{provider_name}: timeout")
                continue

            except (ProviderUnavailableError, ProviderResponseError, AIProviderError) as e:
                logger.warning(
                    "[AI PROVIDER ERROR] Provider %s failed: %s. Falling back...",
                    provider_name, e
                )
                errors_summary.append(f"{provider_name}: {type(e).__name__}")
                continue

            except Exception as e:
                logger.error(
                    "[AI PROVIDER UNEXPECTED ERROR] Provider %s failed unexpectedly: %s",
                    provider_name, e
                )
                errors_summary.append(f"{provider_name}: unexpected_error")
                continue

        total_elapsed = round((time.time() - start_overall) * 1000, 2)
        logger.error(
            "[AI GENERATION EXHAUSTED] All AI providers failed in %.2fms. Errors: %s",
            total_elapsed, ", ".join(errors_summary)
        )
        raise RuntimeError("AI generation is temporarily unavailable. All providers failed.")



# Singleton default manager
_default_manager: Optional[ProviderManager] = None


def get_provider_manager() -> ProviderManager:
    global _default_manager
    if _default_manager is None:
        _default_manager = ProviderManager()
    return _default_manager


def generate_ai_wish(
    *,
    recipient_name: str,
    occasion: str = 'Birthday',
    tone: str = 'Friendly',
    language: str = 'en',
    relationship: str = 'Friend',
    age: Optional[int] = None,
    interests: Optional[Any] = None,
    custom_context: Optional[str] = None,
    mode: str = 'standard',
    user_id: Optional[int] = None,
    use_cache: bool = True,
    timeout: Optional[float] = None,
) -> Dict[str, Any]:
    """
    High-level greeting generation function combining prompt construction,
    user-isolated caching, and multi-provider fallback.
    """
    prompt = build_greeting_prompt(
        recipient_name=recipient_name,
        occasion=occasion,
        tone=tone,
        language=language,
        relationship=relationship,
        age=age,
        interests=interests,
        custom_context=custom_context,
    )

    system_prompt = build_system_prompt(
        recipient_name=recipient_name,
        occasion=occasion,
        tone=tone,
        language=language,
        mode=mode,
    )

    cache_key = AICacheService.generate_cache_key(
        user_id=user_id,
        recipient_name=recipient_name,
        occasion=occasion,
        tone=tone,
        language=language,
        relationship=relationship,
        age=age,
        interests=interests,
        custom_context=custom_context,
        mode=mode,
    )

    default_max_tokens = int(getattr(settings, "GEMINI_MAX_OUTPUT_TOKENS", 512))
    max_tokens = 350 if mode == 'card' else default_max_tokens
    temperature = 0.85 if mode == 'card' else 0.9
    top_p = 0.92 if mode == 'card' else 0.95

    manager = get_provider_manager()
    return manager.generate(
        prompt=prompt,
        system_prompt=system_prompt,
        recipient_name=recipient_name,
        user_id=user_id,
        max_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p,
        timeout=timeout,
        cache_key=cache_key,
        use_cache=use_cache,
    )

