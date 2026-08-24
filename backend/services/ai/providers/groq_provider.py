"""
services/ai/providers/groq_provider.py - Official Groq Provider
=============================================================
Integrates Groq ultra-fast LPU inference using the official groq SDK.
"""

import logging
from typing import Optional
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
    ProviderAuthError,
    ProviderTimeoutError,
    ProviderRateLimitError,
    ProviderModelNotFoundError,
    ProviderUnavailableError,
    ProviderResponseError,
)

logger = logging.getLogger(__name__)


class GroqProvider(BaseAIProvider):
    """
    First Fallback AI Provider leveraging Groq's high-speed LPU inference API.
    Configurable via GROQ_MODEL environment variable (defaults to llama-3.1-8b-instant).
    """

    def __init__(self):
        self._client: Optional[Groq] = None

    @property
    def name(self) -> str:
        return "groq"

    def get_api_key(self) -> str:
        return getattr(settings, "GROQ_API_KEY", "") or ""

    def get_model_name(self) -> str:
        return getattr(settings, "GROQ_MODEL", "llama-3.1-8b-instant") or "llama-3.1-8b-instant"

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
        return Groq(api_key=api_key, timeout=timeout)

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
            raise ProviderAuthError("Groq API key is not configured.", provider=self.name)

        model_name = self.get_model_name()
        default_timeout = getattr(settings, "AI_PROVIDER_TIMEOUT", 10.0)
        effective_timeout = timeout or default_timeout

        client = self._get_client(timeout=effective_timeout)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            chat_completion = client.chat.completions.create(
                messages=messages,
                model=model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
            )

            if not chat_completion.choices or not chat_completion.choices[0].message:
                raise ProviderResponseError("Groq returned empty choices.", provider=self.name)

            content = chat_completion.choices[0].message.content or ""
            if not content.strip():
                raise ProviderResponseError("Groq returned empty content.", provider=self.name)

            return content.strip()

        except NotFoundError as e:
            logger.error("[GROQ MODEL NOT FOUND] Model %s is not available: %s", model_name, e)
            raise ProviderModelNotFoundError(f"Groq model '{model_name}' not found: {e}", provider=self.name, details=e)

        except AuthenticationError as e:
            raise ProviderAuthError(f"Groq authentication failed: {e}", provider=self.name, details=e)

        except RateLimitError as e:
            raise ProviderRateLimitError(f"Groq rate limit exceeded: {e}", provider=self.name, details=e)

        except APITimeoutError as e:
            raise ProviderTimeoutError(f"Groq request timed out after {effective_timeout}s: {e}", provider=self.name, details=e)

        except APIConnectionError as e:
            raise ProviderUnavailableError(f"Groq connection error: {e}", provider=self.name, details=e)

        except APIError as e:
            err_msg = str(e).lower()
            if "does not exist" in err_msg or "not found" in err_msg or "404" in err_msg:
                logger.error("[GROQ MODEL NOT FOUND] Model %s is not available: %s", model_name, e)
                raise ProviderModelNotFoundError(f"Groq model '{model_name}' not found: {e}", provider=self.name, details=e)
            raise ProviderUnavailableError(f"Groq API error: {e}", provider=self.name, details=e)

        except Exception as e:
            err_str = str(e).lower()
            if "not found" in err_str or "does not exist" in err_str or "404" in err_str:
                raise ProviderModelNotFoundError(f"Groq model '{model_name}' not found: {e}", provider=self.name, details=e)
            if "timeout" in err_str or "timed out" in err_str:
                raise ProviderTimeoutError(f"Groq connection timed out: {e}", provider=self.name, details=e)
            if "rate limit" in err_str or "429" in err_str:
                raise ProviderRateLimitError(f"Groq rate limit: {e}", provider=self.name, details=e)
            raise ProviderUnavailableError(f"Groq unexpected failure: {e}", provider=self.name, details=e)
