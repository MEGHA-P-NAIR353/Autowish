"""
services/ai/providers/openrouter_provider.py - OpenRouter Fallback Provider
========================================================================
Integrates OpenRouter using the OpenAI Python SDK as the final fallback.
"""

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
    ProviderAuthError,
    ProviderTimeoutError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    ProviderResponseError,
)

logger = logging.getLogger(__name__)

DEFAULT_OPENROUTER_FALLBACKS = [
    "google/gemma-4-26b-a4b-it:free",
    "deepseek/deepseek-chat-v3:free",
    "qwen/qwen3:free",
    "nvidia/nemotron-3-super:free",
]


class OpenRouterProvider(BaseAIProvider):
    """
    Final Fallback AI Provider leveraging OpenRouter free models.
    """

    def __init__(self):
        self._client: Optional[OpenAI] = None

    @property
    def name(self) -> str:
        return "openrouter"

    def get_api_key(self) -> str:
        return getattr(settings, "OPENROUTER_API_KEY", "") or ""

    def get_model_name(self) -> str:
        return getattr(settings, "OPENROUTER_MODEL", "nvidia/nemotron-3-super:free") or "nvidia/nemotron-3-super:free"

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
        for m in DEFAULT_OPENROUTER_FALLBACKS:
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
    ) -> str:
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

        for model in models:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    top_p=top_p,
                    max_tokens=max_tokens,
                )

                if not response.choices or not response.choices[0].message:
                    raise ProviderResponseError("OpenRouter returned empty choices.", provider=self.name)

                content = response.choices[0].message.content or ""
                if not content.strip():
                    raise ProviderResponseError("OpenRouter returned empty content.", provider=self.name)

                return content.strip()

            except (AuthenticationError,) as e:
                raise ProviderAuthError(f"OpenRouter authentication failed: {e}", provider=self.name, details=e)

            except (NotFoundError, PermissionDeniedError) as e:
                logger.warning("[OPENROUTER MODEL UNAVAILABLE] model=%s: %s", model, e)
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

        raise ProviderUnavailableError(f"All OpenRouter models failed. Last error: {last_exc}", provider=self.name, details=last_exc)
