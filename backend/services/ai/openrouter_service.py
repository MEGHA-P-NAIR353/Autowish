"""
openrouter_service.py - AutoWish AI backend
============================================
Enterprise OpenRouter AI Service with OpenAI SDK integration.

Features:
- Single client instance reuse with proxy isolation via httpx.
- Dynamic fallback models (Gemma 4 -> DeepSeek V3 -> Qwen 3 -> Nemotron 3).
- Stateless generation: every request is exactly [system, user] — no history, no memory.
- Token-expand retry on truncation (finish_reason == 'length') instead of continuation.
- Universal response sanitization stripping reasoning/thinking metadata.
- Validation checks for recipient name, punctuation, length, and non-reasoning content.
- Structured AIValidationError raised on persistent validation failure (signals frontend retry).
- Modular architecture (_build_messages, _call_openrouter, _validate_response,
  _clean_response, _log_usage).
- Detailed token, latency, finish_reason, and retry logging without logging API keys.
"""

import time
import logging
import inspect
from typing import Optional, Dict, Any, List, Tuple
import httpx
from django.conf import settings
from openai import (
    OpenAI,
    APIError,
    AuthenticationError,
    RateLimitError,
    APIConnectionError,
    APITimeoutError,
    NotFoundError,
    PermissionDeniedError,
)

from .response_cleaner import clean_ai_response, contains_template_text

# Alias for backward compatibility with legacy tests
clean_response = clean_ai_response

logger = logging.getLogger(__name__)

# Reusable client singleton instance
_client_instance: Optional[OpenAI] = None

# Fallback models configuration order
DEFAULT_MODEL_FALLBACKS = [
    "google/gemma-4-26b-a4b-it:free",
    "deepseek/deepseek-chat-v3:free",
    "qwen/qwen3:free",
    "nvidia/nemotron-3-super:free",
]


class AIValidationError(RuntimeError):
    """
    Raised when the AI response fails quality validation after all retries.
    Carries a structured payload for the frontend to trigger automatic re-generation.
    """
    def __init__(self, reason: str = "invalid_response"):
        self.reason = reason
        super().__init__(f"AI generated an invalid response. reason={reason}")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": "AI generated an invalid response. Please try again.",
            "reason": self.reason,
            "retry": True,
        }


def get_openrouter_client() -> OpenAI:
    """Return a thread-safe singleton OpenAI client configured for OpenRouter."""
    global _client_instance
    if _client_instance is None:
        api_key = getattr(settings, "OPENROUTER_API_KEY", "") or ""
        base_url = getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1") or "https://openrouter.ai/api/v1"
        # Explicit httpx client prevents proxy kwarg incompatibility issues in httpx 0.28+
        http_client = httpx.Client(trust_env=False)
        _client_instance = OpenAI(
            api_key=api_key,
            base_url=base_url,
            http_client=http_client,
        )
    return _client_instance


def reset_client_instance():
    """Reset singleton instance (useful in tests or config changes)."""
    global _client_instance
    _client_instance = None


def get_api_key() -> str:
    """Return configured OpenRouter API key."""
    return getattr(settings, "OPENROUTER_API_KEY", "") or ""


def get_configured_model() -> str:
    """Return primary model from settings or env."""
    return getattr(settings, "OPENROUTER_MODEL", "google/gemma-4-26b-a4b-it:free") or "google/gemma-4-26b-a4b-it:free"


def get_fallback_models() -> List[str]:
    """Return list of fallback models starting with primary configured model."""
    primary = get_configured_model()
    models = [primary]
    for fb in DEFAULT_MODEL_FALLBACKS:
        if fb not in models:
            models.append(fb)
    return models


def masked_key() -> str:
    """Return masked API key for safe logging."""
    key = get_api_key()
    if not key:
        return "NONE"
    return f"****{key[-4:]}" if len(key) >= 4 else "****"


def startup_validate() -> None:
    """Validate startup config for all AI providers without making network calls or leaking secrets."""
    # 1. Gemini
    gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""
    gemini_model = getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash")
    if gemini_key:
        masked = f"****{gemini_key[-4:]}" if len(gemini_key) >= 4 else "****"
        print(f"[STARTUP] Gemini configured: key={masked}, model={gemini_model} (PRIMARY - OK)")
    else:
        print("[STARTUP NOTICE] GEMINI_API_KEY is not configured.")

    # 2. Groq
    groq_key = getattr(settings, "GROQ_API_KEY", "") or ""
    groq_model = getattr(settings, "GROQ_MODEL", "llama-3.1-8b-instant")
    if groq_key:
        masked = f"****{groq_key[-4:]}" if len(groq_key) >= 4 else "****"
        print(f"[STARTUP] Groq configured: key={masked}, model={groq_model} (FALLBACK 1 - OK)")
    else:
        print("[STARTUP NOTICE] GROQ_API_KEY is not configured.")

    # 3. OpenRouter
    key = get_api_key()
    primary_model = get_configured_model()
    base_url = getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

    if not key:
        print("[STARTUP NOTICE] OPENROUTER_API_KEY is not configured.")
    else:
        print(f"[STARTUP] OpenRouter configured: key={masked_key()}, primary_model={primary_model}, base_url={base_url} (FALLBACK 2 - OK)")


class OpenRouterService:
    """Modular, stateless OpenRouter AI generation service."""

    # Reasoning keywords used by both validation and cleaner — must stay in sync
    _REASONING_KEYWORDS = [
        "the user wants",
        "the user asked",
        "the user now says",
        "we need to",
        "we previously generated",
        "let's craft",
        "let me write",
        "let me craft",
        "let me think",
        "i'll write",
        "i will write",
        "thinking:",
        "analysis:",
        "reasoning:",
        "word count:",
        "step 1",
        "step 2",
        "draft:",
        "scratchpad:",
        "output:",
        "result:",
        "translation:",
        "my response:",
        "final answer:",
        "greeting in",
        "in english:",
        "in hindi:",
        "in tamil:",
        "in malayalam:",
    ]

    @staticmethod
    def _build_messages(prompt: str, system_prompt: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Construct exactly two role messages for the OpenAI chat completions API.

        CRITICAL: Always returns [system, user] — never more, never less.
        Greeting generation is stateless. No history. No continuation.
        """
        default_system = (
            "You are an expert, empathetic multilingual greeting message writer. "
            "Write ONLY the final greeting message. "
            "The very first character of your response MUST be the first character of the greeting. "
            "The very last character of your response MUST be the final punctuation mark (. ! ? or an emoji). "
            "Never include reasoning, planning, thinking, word counts, draft notes, "
            "language titles, headers, or any meta-text before or after the greeting."
        )
        sys_content = system_prompt if system_prompt else default_system
        return [
            {"role": "system", "content": sys_content},
            {"role": "user", "content": prompt},
        ]

    @staticmethod
    def _token_kwarg(max_tokens: int) -> Dict[str, int]:
        """Dynamically select max_completion_tokens or max_tokens depending on SDK support."""
        try:
            from openai.resources.chat.completions import Completions
            sig = inspect.signature(Completions.create)
            if "max_completion_tokens" in sig.parameters:
                return {"max_completion_tokens": max_tokens}
        except Exception:
            pass
        return {"max_tokens": max_tokens}

    @classmethod
    def _call_openrouter(
        cls,
        client: OpenAI,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.9,
        top_p: float = 0.95,
        max_tokens: int = 600,
    ) -> Tuple[Any, float]:
        """Execute a stateless chat completion request and measure latency."""
        token_param = cls._token_kwarg(max_tokens)
        start_time = time.time()

        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            **token_param,
        }

        response = client.chat.completions.create(**kwargs)
        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        return response, elapsed_ms

    @classmethod
    def _log_usage(
        cls,
        model: str,
        elapsed_ms: float,
        response: Any,
        raw_len: int,
        clean_len: int,
        attempt: int,
        finish_reason: str,
    ) -> None:
        """Log structured performance and usage metrics."""
        usage_info = {}
        if hasattr(response, "usage") and response.usage:
            usage_info = {
                "prompt_tokens": getattr(response.usage, "prompt_tokens", None),
                "completion_tokens": getattr(response.usage, "completion_tokens", None),
                "total_tokens": getattr(response.usage, "total_tokens", None),
            }

        logger.info(
            "[OPENROUTER METRICS] provider=OpenRouter model=%s attempt=%d latency_ms=%.2f "
            "finish_reason=%s prompt_tokens=%s completion_tokens=%s total_tokens=%s "
            "raw_length=%d cleaned_length=%d",
            model,
            attempt,
            elapsed_ms,
            finish_reason,
            usage_info.get("prompt_tokens"),
            usage_info.get("completion_tokens"),
            usage_info.get("total_tokens"),
            raw_len,
            clean_len,
        )

    @classmethod
    def _clean_response(cls, text: str) -> str:
        """Clean raw response text via response_cleaner."""
        return clean_ai_response(text)

    @classmethod
    def _validate_response(cls, text: str, recipient_name: Optional[str] = None) -> bool:
        """
        Validate generated greeting quality:
        - Must be non-empty (>= 15 chars)
        - Must not contain any reasoning keywords or prompt leakage labels
        - Must not contain template/placeholder text (e.g. "Greeting + Name", "Closing", "Sentence 1")
        - Should end with valid punctuation or symbol
        """
        if not text or len(text.strip()) < 15:
            logger.warning("[VALIDATION FAILED] Greeting text too short (%d chars)", len(text) if text else 0)
            return False

        text_lower = text.lower()
        forbidden_keywords = [
            "sentence", "count", "word count", "let's count", "lets count",
            "reasoning", "analysis", "thought", "step", "prompt", "instruction",
            "xml", "markdown", "json", "internal notes"
        ]
        
        for kw in cls._REASONING_KEYWORDS + forbidden_keywords:
            if kw in text_lower:
                logger.warning("[VALIDATION FAILED] Greeting contains forbidden meta keyword: %r", kw)
                return False

        # Check for template/placeholder text (e.g. "Greeting + Name", "Closing", "Sentence 1")
        if contains_template_text(text):
            logger.warning("[VALIDATION FAILED] Greeting contains template/placeholder text patterns")
            return False

        # Validate valid end punctuation or emoji symbol
        valid_endings = ('.', '!', '?', '"', "'", '\u201d', '\u2019', '😊', '🎉', '🎂', '✨', '💖', '❤️', '🌟', '🙏', '🌺')
        if not text.rstrip().endswith(valid_endings):
            last_char = text.rstrip()[-1] if text.rstrip() else ''
            if last_char.isalnum() and len(text.split()) < 5:
                logger.warning("[VALIDATION FAILED] Greeting ends abruptly without punctuation.")
                return False

        return True


def generate_text(
    prompt: str,
    *,
    system_prompt: Optional[str] = None,
    recipient_name: Optional[str] = None,
    temperature: float = 0.9,
    top_p: float = 0.95,
    max_tokens: int = 600,
    max_retries: int = 3,
    user_id: Optional[int] = None,
) -> str:
    """
    Generate text using Multi-Provider AI architecture (Gemini -> Groq -> OpenRouter).
    Preserves backward compatibility with existing callers.
    """
    from .provider_manager import get_provider_manager
    manager = get_provider_manager()
    try:
        res = manager.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            recipient_name=recipient_name,
            user_id=user_id,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            use_cache=False,
        )
        return res["content"]
    except Exception as e:
        logger.warning("[PROVIDER MANAGER DELEGATION FAILED] Falling back to direct OpenRouter: %s", e)

    # Fallback to direct OpenRouter if ProviderManager raised an error
    api_key = get_api_key()
    if not api_key:
        logger.error("[OPENROUTER ERROR] OPENROUTER_API_KEY is not set.")
        raise ValueError("AI service is not configured. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in .env.")

    client = get_openrouter_client()
    models_to_try = get_fallback_models()

    # Build stateless messages once — never mutated inside the loop
    messages = OpenRouterService._build_messages(prompt, system_prompt)

    last_exception: Optional[Exception] = None
    validation_failed_models: List[str] = []

    for model in models_to_try:
        logger.info("[OPENROUTER] Attempting stateless generation with model=%s", model)

        for attempt in range(1, max_retries + 1):
            # On retry after truncation, increase token budget by 50%
            current_max_tokens = max_tokens
            if attempt > 1:
                current_max_tokens = int(max_tokens * 1.5)
                logger.info(
                    "[OPENROUTER TOKEN EXPAND] Retry attempt %d with expanded token budget: %d",
                    attempt, current_max_tokens,
                )

            try:
                response, elapsed_ms = OpenRouterService._call_openrouter(
                    client, model, messages, temperature, top_p, current_max_tokens
                )

                if not response.choices or not response.choices[0].message:
                    raise RuntimeError("Empty response choices received from OpenRouter.")

                choice = response.choices[0]
                raw_content = choice.message.content or ""
                finish_reason = getattr(choice, "finish_reason", "stop") or "stop"

                if not raw_content.strip():
                    raise RuntimeError("Received empty message content from OpenRouter.")

                # Log truncation — do NOT append history, retry with larger token budget instead
                if finish_reason == "length":
                    logger.warning(
                        "[OPENROUTER TRUNCATION] model=%s attempt=%d finish_reason=length. "
                        "Will retry stateless with larger token budget.",
                        model, attempt,
                    )
                    if attempt < max_retries:
                        time.sleep(0.5)
                        continue  # next attempt uses current_max_tokens * 1.5

                # Clean response (always stateless output)
                cleaned = OpenRouterService._clean_response(raw_content)

                # Validate response quality
                if not OpenRouterService._validate_response(cleaned, recipient_name):
                    logger.warning(
                        "[OPENROUTER VALIDATION REJECT] model=%s attempt=%d output failed validation.",
                        model, attempt,
                    )
                    if attempt < max_retries:
                        time.sleep(1.0)
                        continue
                    else:
                        validation_failed_models.append(model)
                        break  # Try next model

                # Log performance metrics
                OpenRouterService._log_usage(
                    model, elapsed_ms, response, len(raw_content), len(cleaned), attempt, finish_reason
                )

                return cleaned

            except (NotFoundError, PermissionDeniedError) as exc:
                logger.warning(
                    "[OPENROUTER MODEL UNAVAILABLE] model=%s returned %s. Trying fallback...",
                    model, type(exc).__name__,
                )
                last_exception = exc
                break  # Skip remaining retries for this model

            except (AuthenticationError,) as exc:
                logger.error("[OPENROUTER AUTH ERROR] Authentication failed: %s", exc)
                raise ValueError("Authentication failed with OpenRouter API. Please check your API key.") from exc

            except (RateLimitError, APIConnectionError, APITimeoutError, APIError) as exc:
                last_exception = exc
                logger.warning(
                    "[OPENROUTER RETRYABLE ERROR] model=%s attempt %d/%d failed: %s",
                    model, attempt, max_retries, exc,
                )
                if attempt < max_retries:
                    time.sleep(1.5 * attempt)

            except Exception as exc:
                last_exception = exc
                logger.error(
                    "[OPENROUTER UNEXPECTED ERROR] model=%s attempt %d failed: %s",
                    model, attempt, exc,
                )
                if attempt < max_retries:
                    time.sleep(1.0)

    # All models exhausted — determine correct error type
    if validation_failed_models and not last_exception:
        logger.error(
            "[OPENROUTER VALIDATION EXHAUSTED] All models failed quality validation: %s",
            validation_failed_models,
        )
        raise AIValidationError(reason="reasoning_detected")

    logger.error(
        "[OPENROUTER EXHAUSTED] All models and retries failed. Last error: %s", last_exception
    )
    raise RuntimeError(f"AI greeting generation failed. Details: {last_exception}")
