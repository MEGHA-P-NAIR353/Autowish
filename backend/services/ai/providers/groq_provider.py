"""
services/ai/providers/groq_provider.py - Official Groq Provider
=============================================================
Integrates Groq ultra-fast LPU inference using the official groq SDK.
"""

import time
import logging
from typing import Optional, List
from django.conf import settings
from groq import (
    Groq,
    APIError,
    AuthenticationError,
    RateLimitError,
    APITimeoutError,
    APIConnectionError,
    NotFoundError,
)

from .base import (
    BaseAIProvider,
    ProviderResult,
    ProviderAuthError,
    ProviderTimeoutError,
    ProviderRateLimitError,
    ProviderModelNotFoundError,
    ProviderUnavailableError,
    ProviderResponseError,
)

logger = logging.getLogger(__name__)

DEFAULT_GROQ_FALLBACK_MODELS = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "groq/compound-mini",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
]


class GroqProvider(BaseAIProvider):
    """
    First Fallback AI Provider leveraging Groq's high-speed LPU inference API.
    Configurable via GROQ_MODEL and GROQ_FALLBACK_MODELS environment variables.
    """

    def __init__(self):
        self._client: Optional[Groq] = None

    @property
    def name(self) -> str:
        return "groq"

    def get_api_key(self) -> str:
        return getattr(settings, "GROQ_API_KEY", "") or ""

    def get_model_name(self) -> str:
        return getattr(settings, "GROQ_MODEL", "openai/gpt-oss-120b") or "openai/gpt-oss-120b"

    def is_configured(self) -> bool:
        return bool(self.get_api_key().strip())

    def masked_key(self) -> str:
        key = self.get_api_key().strip()
        if not key:
            return "NONE"
        return f"****{key[-4:]}" if len(key) >= 4 else "****"

    def _get_client(self, timeout: float) -> Groq:
        api_key = self.get_api_key().strip()
        if not api_key:
            raise ProviderAuthError("GROQ_API_KEY is not configured.", provider=self.name)
        return Groq(api_key=api_key, timeout=timeout, max_retries=0)

    def get_models_list(self) -> List[str]:
        primary = self.get_model_name()
        models = [primary]

        configured_fallbacks = getattr(settings, "GROQ_FALLBACK_MODELS", None)
        if configured_fallbacks:
            if isinstance(configured_fallbacks, str):
                fallback_list = [m.strip() for m in configured_fallbacks.split(",") if m.strip()]
            else:
                fallback_list = list(configured_fallbacks)
        else:
            fallback_list = DEFAULT_GROQ_FALLBACK_MODELS

        for m in fallback_list:
            if m not in models:
                models.append(m)
        return models

    def generate(
        self,
        prompt: str,
        *,
        system_prompt: Optional[str] = None,
        max_tokens: int = 600,
        temperature: float = 0.9,
        top_p: float = 0.95,
        timeout: Optional[float] = None,
    ) -> ProviderResult:
        if not self.is_configured():
            raise ProviderAuthError("Groq API key is not configured.", provider=self.name)

        default_timeout = getattr(settings, "AI_PROVIDER_TIMEOUT", 15.0)
        effective_timeout = timeout or default_timeout

        client = self._get_client(timeout=effective_timeout)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        models = self.get_models_list()
        last_exc: Optional[Exception] = None
        has_not_found = False

        for model in models:
            start_time = time.time()
            try:
                chat_completion = client.chat.completions.create(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p,
                )

                elapsed_ms = round((time.time() - start_time) * 1000, 2)

                if not chat_completion.choices or not chat_completion.choices[0].message:
                    raise ProviderResponseError("Groq returned empty choices.", provider=self.name)

                content = chat_completion.choices[0].message.content or ""
                if not content.strip():
                    raise ProviderResponseError("Groq returned empty content.", provider=self.name)

                choice = chat_completion.choices[0]
                finish_reason_raw = getattr(choice, "finish_reason", None)
                finish_reason_str = str(finish_reason_raw).upper() if finish_reason_raw is not None else "STOP"
                if "LENGTH" in finish_reason_str or "MAX_TOKENS" in finish_reason_str:
                    finish_reason_str = "MAX_TOKENS"
                elif "STOP" in finish_reason_str:
                    finish_reason_str = "STOP"

                usage = getattr(chat_completion, "usage", None)
                prompt_tokens = getattr(usage, "prompt_tokens", None) if usage else None
                completion_tokens = getattr(usage, "completion_tokens", None) if usage else None
                total_tokens = getattr(usage, "total_tokens", None) if usage else None

                logger.info(
                    "[GROQ AI RESPONSE] provider=%s model=%s finish_reason=%s prompt_tokens=%s completion_tokens=%s latency_ms=%.2f",
                    self.name, model, finish_reason_str, prompt_tokens, completion_tokens, elapsed_ms
                )

                return ProviderResult(
                    provider=self.name,
                    model=model,
                    text=content.strip(),
                    finish_reason=finish_reason_str,
                    success=True,
                    retryable=(finish_reason_str == "MAX_TOKENS"),
                    token_usage={
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens,
                    },
                    latency_ms=elapsed_ms,
                )

            except AuthenticationError as e:
                logger.error("[GROQ AUTH ERROR] Authentication failed: %s", e)
                raise ProviderAuthError(f"Groq authentication failed: {e}", provider=self.name, details=e)

            except (NotFoundError, APIError) as e:
                err_msg = str(e).lower()
                if "does not exist" in err_msg or "not found" in err_msg or "404" in err_msg or "400" in err_msg or "decommissioned" in err_msg or "deprecated" in err_msg or "model_not_found" in err_msg:
                    logger.warning("[GROQ MODEL UNAVAILABLE] model=%s: %s. Skipping immediately to next model...", model, e)
                    has_not_found = True
                    last_exc = e
                    continue
                last_exc = e
                break

            except RateLimitError as e:
                logger.warning("[GROQ RATE LIMIT] model=%s: %s", model, e)
                last_exc = e
                continue

            except APITimeoutError as e:
                logger.warning("[GROQ TIMEOUT] model=%s timed out: %s", model, e)
                last_exc = e
                continue

            except APIConnectionError as e:
                logger.warning("[GROQ CONNECTION ERROR] model=%s: %s", model, e)
                last_exc = e
                continue

            except Exception as e:
                logger.warning("[GROQ UNEXPECTED ERROR] model=%s: %s", model, e)
                last_exc = e
                continue

        if isinstance(last_exc, RateLimitError):
            raise ProviderRateLimitError(f"Groq rate limit: {last_exc}", provider=self.name, details=last_exc)
        if isinstance(last_exc, APITimeoutError):
            raise ProviderTimeoutError(f"Groq request timed out after {effective_timeout}s: {last_exc}", provider=self.name, details=last_exc)
        if isinstance(last_exc, NotFoundError) or has_not_found:
            raise ProviderModelNotFoundError(f"Groq model not found or decommissioned: {last_exc}", provider=self.name, details=last_exc)

        raise ProviderUnavailableError(f"Groq provider error: {last_exc}", provider=self.name, details=last_exc)

