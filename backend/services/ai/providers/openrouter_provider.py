"""
services/ai/providers/openrouter_provider.py - OpenRouter Fallback Provider
========================================================================
Integrates OpenRouter using the OpenAI Python SDK as the final fallback.
"""

import time
import logging
from typing import Optional, List
import httpx
from django.conf import settings
from openai import (
    OpenAI,
    APIError,
    AuthenticationError,
    RateLimitError,
    APITimeoutError,
    APIConnectionError,
    NotFoundError,
    PermissionDeniedError,
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

DEFAULT_OPENROUTER_FALLBACKS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
    "mistralai/mistral-7b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free",
]


class OpenRouterProvider(BaseAIProvider):
    """
    Final Fallback AI Provider leveraging OpenRouter free and high-availability models.
    Configurable via OPENROUTER_MODEL and OPENROUTER_FALLBACK_MODELS environment variables.
    """

    def __init__(self):
        self._client: Optional[OpenAI] = None

    @property
    def name(self) -> str:
        return "openrouter"

    def get_api_key(self) -> str:
        return getattr(settings, "OPENROUTER_API_KEY", "") or ""

    def get_model_name(self) -> str:
        return getattr(settings, "OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free") or "meta-llama/llama-3.3-70b-instruct:free"

    def is_configured(self) -> bool:
        return bool(self.get_api_key().strip())

    def masked_key(self) -> str:
        key = self.get_api_key().strip()
        if not key:
            return "NONE"
        return f"****{key[-4:]}" if len(key) >= 4 else "****"

    def _get_client(self, timeout: float) -> OpenAI:
        api_key = self.get_api_key().strip()
        if not api_key:
            raise ProviderAuthError("OPENROUTER_API_KEY is not configured.", provider=self.name)
        base_url = getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1") or "https://openrouter.ai/api/v1"
        http_client = httpx.Client(trust_env=False, timeout=timeout)
        return OpenAI(
            api_key=api_key,
            base_url=base_url,
            http_client=http_client,
        )

    def get_models_list(self) -> List[str]:
        primary = self.get_model_name()
        models = [primary]

        configured_fallbacks = getattr(settings, "OPENROUTER_FALLBACK_MODELS", None)
        if configured_fallbacks:
            if isinstance(configured_fallbacks, str):
                fallback_list = [m.strip() for m in configured_fallbacks.split(",") if m.strip()]
            else:
                fallback_list = list(configured_fallbacks)
        else:
            fallback_list = DEFAULT_OPENROUTER_FALLBACKS

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
            raise ProviderAuthError("OpenRouter API key is not configured.", provider=self.name)

        default_timeout = getattr(settings, "AI_PROVIDER_TIMEOUT", 10.0)
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
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    top_p=top_p,
                    max_tokens=max_tokens,
                )

                elapsed_ms = round((time.time() - start_time) * 1000, 2)

                if not response.choices or not response.choices[0].message:
                    raise ProviderResponseError("OpenRouter returned empty choices.", provider=self.name)

                content = response.choices[0].message.content or ""
                if not content.strip():
                    raise ProviderResponseError("OpenRouter returned empty content.", provider=self.name)

                choice = response.choices[0]
                finish_reason_raw = getattr(choice, "finish_reason", None)
                finish_reason_str = str(finish_reason_raw).upper() if finish_reason_raw is not None else "STOP"
                if "LENGTH" in finish_reason_str or "MAX_TOKENS" in finish_reason_str:
                    finish_reason_str = "MAX_TOKENS"
                elif "STOP" in finish_reason_str:
                    finish_reason_str = "STOP"

                usage = getattr(response, "usage", None)
                prompt_tokens = getattr(usage, "prompt_tokens", None) if usage else None
                completion_tokens = getattr(usage, "completion_tokens", None) if usage else None
                total_tokens = getattr(usage, "total_tokens", None) if usage else None

                logger.info(
                    "[OPENROUTER AI RESPONSE] provider=%s model=%s finish_reason=%s prompt_tokens=%s completion_tokens=%s latency_ms=%.2f",
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

            except (AuthenticationError,) as e:
                logger.error("[OPENROUTER AUTH ERROR] Authentication failed: %s", e)
                raise ProviderAuthError(f"OpenRouter authentication failed: {e}", provider=self.name, details=e)

            except (NotFoundError, PermissionDeniedError) as e:
                logger.warning("[OPENROUTER MODEL UNAVAILABLE] model=%s: %s. Skipping to next model...", model, e)
                has_not_found = True
                last_exc = e
                continue

            except (RateLimitError,) as e:
                logger.warning("[OPENROUTER RATE LIMIT] model=%s: %s", model, e)
                last_exc = e
                continue

            except (APITimeoutError,) as e:
                logger.warning("[OPENROUTER TIMEOUT] model=%s timed out: %s", model, e)
                last_exc = e
                continue

            except (APIConnectionError, APIError) as e:
                err_msg = str(e).lower()
                if "404" in err_msg or "not found" in err_msg or "no endpoints found" in err_msg or "unavailable" in err_msg:
                    logger.warning("[OPENROUTER MODEL UNAVAILABLE] model=%s: %s. Skipping to next model...", model, e)
                    has_not_found = True
                    last_exc = e
                    continue
                logger.warning("[OPENROUTER API ERROR] model=%s: %s", model, e)
                last_exc = e
                continue

            except Exception as e:
                logger.warning("[OPENROUTER UNEXPECTED ERROR] model=%s: %s", model, e)
                last_exc = e
                continue

        if isinstance(last_exc, RateLimitError):
            raise ProviderRateLimitError(f"All OpenRouter models rate limited: {last_exc}", provider=self.name, details=last_exc)
        if isinstance(last_exc, APITimeoutError):
            raise ProviderTimeoutError(f"OpenRouter timed out: {last_exc}", provider=self.name, details=last_exc)
        if isinstance(last_exc, (NotFoundError, PermissionDeniedError)) or has_not_found:
            raise ProviderModelNotFoundError(f"OpenRouter model not found or unavailable: {last_exc}", provider=self.name, details=last_exc)

        raise ProviderUnavailableError(f"All OpenRouter models failed. Last error: {last_exc}", provider=self.name, details=last_exc)

