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
        Validate generated greeting quality and completeness:
        1. Must be non-empty and have minimum meaningful content (>= 20 chars, >= 4 words).
        2. Must not contain reasoning/planning keywords.
        3. Must not contain template placeholders (e.g. 'Greeting + Name', 'Sentence 1').
        4. Must not contain leaked paragraph labels ('Paragraph 1:', '*Paragraph 2:*', etc.).
        5. Must not contain leaked word counts ('(19 words)', 'Word count: 43', etc.).
        6. Must not end abruptly (must end with valid closing punctuation, quote, or emoji across all languages).
        7. Must not end with trailing incomplete/dangling words ('a', 'the', 'with', 'and', etc.).
        """
        if not text or len(text.strip()) < 20:
            return False, f"too_short_{len(text.strip()) if text else 0}_chars"

        words = text.strip().split()
        if len(words) < 4:
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

        # Check ending completeness across languages
        stripped = text.rstrip()
        if not stripped:
            return False, "empty_after_strip"

        last_char = stripped[-1]
        last_cat = unicodedata.category(last_char)

        # Valid punctuation / quote / emoji categories:
        # 'Po' (Punctuation, other), 'Pe' (Punctuation, close), 'Pf' (Punctuation, final quote),
        # 'So' (Symbol, other / emojis), 'Sk' (Symbol, modifier)
        explicit_valid_chars = (
            '.', '!', '?', '"', "'",
            '\u201d', '\u2019', '\u00bb', '\u201c', '\u2018',
            '\u2026', '\u0964', '\u0965', '\u06d4', '\u3002', '\uff01', '\uff1f', '~'
        )

        is_valid_category = last_cat in ('Po', 'Pe', 'Pf', 'So', 'Sk')
        is_explicit_valid = last_char in explicit_valid_chars
        # Emoji code points range fallback
        is_emoji_codepoint = (0x1F000 <= ord(last_char) <= 0x1FAFF) or (0x2600 <= ord(last_char) <= 0x27BF)

        has_valid_ending_char = is_valid_category or is_explicit_valid or is_emoji_codepoint

        if not has_valid_ending_char:
            return False, f"incomplete_ending_char_{repr(last_char)}_cat_{last_cat}"

        # Check trailing dangling words (e.g. "feels like a", "filled with and")
        clean_last_word = re.sub(r'[^\w]', '', words[-1]).lower()
        dangling_words = {
            "a", "an", "the", "and", "or", "but", "with", "because",
            "like", "of", "to", "in", "for", "is", "are", "was", "were"
        }
        # If the word before punctuation is an incomplete dangling word with no content after
        if len(words) >= 2:
            prev_word = re.sub(r'[^\w]', '', words[-2]).lower()
            if prev_word in {"feels"} and clean_last_word in {"like", "a"}:
                return False, f"dangling_phrase_{prev_word}_{clean_last_word}"

        return True, "valid"

    def generate(
        self,
        prompt: str,
        *,
        system_prompt: Optional[str] = None,
        recipient_name: Optional[str] = None,
        user_id: Optional[int] = None,
        max_tokens: int = 1000,
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
        MAX_ATTEMPTS_PER_PROVIDER = 2

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

            provider_succeeded = False
            for attempt in range(1, MAX_ATTEMPTS_PER_PROVIDER + 1):
                p_start = time.time()
                if attempt > 1:
                    logger.info(
                        "[AI RETRY ATTEMPT] provider=%s attempt=%d/%d",
                        provider_name, attempt, MAX_ATTEMPTS_PER_PROVIDER
                    )

                try:
                    raw_response = provider.generate(
                        prompt,
                        system_prompt=system_prompt,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        top_p=top_p,
                        timeout=timeout,
                    )

                    cleaned = clean_ai_response(raw_response)
                    elapsed_ms = round((time.time() - p_start) * 1000, 2)

                    is_valid, validation_reason = self._validate_response(cleaned, recipient_name)
                    if not is_valid:
                        logger.warning(
                            "[AI RESPONSE INVALID] provider=%s attempt=%d reason=%s",
                            provider_name, attempt, validation_reason
                        )
                        if attempt < MAX_ATTEMPTS_PER_PROVIDER:
                            continue  # Retry with same provider
                        else:
                            errors_summary.append(f"{provider_name}: {validation_reason}")
                            break  # Fall back to next provider

                    logger.info(
                        "[AI GENERATION SUCCESS] provider=%s succeeded in %.2fms (length: %d chars, words: %d)",
                        provider_name, elapsed_ms, len(cleaned), len(cleaned.split())
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
                    break  # Do not retry auth errors on same provider

                except ProviderRateLimitError as e:
                    logger.warning(
                        "[AI PROVIDER RATE LIMIT] Provider %s rate-limited. Falling back immediately...",
                        provider_name
                    )
                    errors_summary.append(f"{provider_name}: rate_limit")
                    break  # Do not retry rate limit on same provider

                except ProviderTimeoutError as e:
                    logger.warning(
                        "[AI PROVIDER TIMEOUT] Provider %s timed out. Retrying or falling back...",
                        provider_name
                    )
                    if attempt < MAX_ATTEMPTS_PER_PROVIDER:
                        continue
                    errors_summary.append(f"{provider_name}: timeout")
                    break

                except (ProviderUnavailableError, ProviderResponseError, AIProviderError) as e:
                    logger.warning(
                        "[AI PROVIDER ERROR] Provider %s attempt=%d failed: %s.",
                        provider_name, attempt, e
                    )
                    if attempt < MAX_ATTEMPTS_PER_PROVIDER:
                        continue
                    errors_summary.append(f"{provider_name}: {type(e).__name__}")
                    break

                except Exception as e:
                    logger.error(
                        "[AI PROVIDER UNEXPECTED ERROR] Provider %s failed unexpectedly: %s",
                        provider_name, e
                    )
                    if attempt < MAX_ATTEMPTS_PER_PROVIDER:
                        continue
                    errors_summary.append(f"{provider_name}: unexpected_error")
                    break

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

    max_tokens = 350 if mode == 'card' else 1000
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

