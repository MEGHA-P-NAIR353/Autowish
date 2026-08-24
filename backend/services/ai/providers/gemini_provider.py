"""
services/ai/providers/gemini_provider.py - Official Google Gemini Provider
========================================================================
Integrates Google Gemini using the official google-genai SDK.
"""

import logging
from typing import Optional
from django.conf import settings
from google import genai
from google.genai import types
from google.genai.errors import APIError

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


class GeminiProvider(BaseAIProvider):
    """
    Primary AI Provider leveraging the official Google Gemini SDK.
    Optimized for high-speed free-tier models (gemini-3.6-flash / gemini-2.5-flash).
    """

    def __init__(self):
        self._client: Optional[genai.Client] = None

    @property
    def name(self) -> str:
        return "gemini"

    def get_api_key(self) -> str:
        return getattr(settings, "GEMINI_API_KEY", "") or ""

    def get_model_name(self) -> str:
        return getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash") or "gemini-3.6-flash"

    def is_configured(self) -> bool:
        return bool(self.get_api_key().strip())

    def masked_key(self) -> str:
        key = self.get_api_key().strip()
        if not key:
            return "NONE"
        return f"****{key[-4:]}" if len(key) >= 4 else "****"

    def _get_client(self) -> genai.Client:
        api_key = self.get_api_key().strip()
        if not api_key:
            raise ProviderAuthError("GEMINI_API_KEY is not configured.", provider=self.name)
        if self._client is None:
            self._client = genai.Client(api_key=api_key)
        return self._client

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
            raise ProviderAuthError("Gemini API key is not configured.", provider=self.name)

        model_name = self.get_model_name()
        default_timeout = getattr(settings, "AI_PROVIDER_TIMEOUT", 10.0)
        effective_timeout = timeout or default_timeout

        client = self._get_client()

        # Build clean generation config without automatic function calling / tools
        config = types.GenerateContentConfig(
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=max_tokens,
            system_instruction=system_prompt if system_prompt else None,
            tools=None,  # Explicitly disable tools / AFC for simple text generation
        )

        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )

            # Safely extract candidate finish reason
            candidate = response.candidates[0] if (response and getattr(response, "candidates", None)) else None
            finish_reason_raw = getattr(candidate, "finish_reason", None) if candidate else None
            finish_reason_str = str(finish_reason_raw).upper() if finish_reason_raw is not None else "UNKNOWN"

            # Safely extract usage metadata
            usage = getattr(response, "usage_metadata", None)
            prompt_tokens = getattr(usage, "prompt_token_count", None) if usage else None
            candidate_tokens = getattr(usage, "candidates_token_count", None) if usage else None

            resp_text = (response.text or "").strip() if response else ""
            words_count = len(resp_text.split()) if resp_text else 0
            chars_count = len(resp_text)

            logger.info(
                "[AI RESPONSE] provider=%s model=%s finish_reason=%s prompt_tokens=%s candidate_tokens=%s words=%d chars=%d",
                self.name, model_name, finish_reason_str, prompt_tokens, candidate_tokens, words_count, chars_count
            )

            if not resp_text:
                raise ProviderResponseError(
                    f"Gemini returned an empty response text (finish_reason={finish_reason_str}).",
                    provider=self.name
                )

            # Check if generation was truncated due to token limit
            if "MAX_TOKENS" in finish_reason_str or "LENGTH" in finish_reason_str:
                logger.warning(
                    "[AI RESPONSE TRUNCATED] provider=%s model=%s hit max tokens limit (finish_reason=%s)",
                    self.name, model_name, finish_reason_str
                )
                raise ProviderResponseError(
                    f"Gemini output was truncated due to token limit (finish_reason={finish_reason_str}).",
                    provider=self.name
                )

            return resp_text

        except APIError as e:
            err_msg = str(e).lower()
            code = getattr(e, "code", None)
            if code == 404 or "not found" in err_msg or "no longer available" in err_msg:
                logger.error("[GEMINI MODEL NOT FOUND] Model %s is not available or deprecated: %s", model_name, e)
                raise ProviderModelNotFoundError(f"Gemini model '{model_name}' not found: {e}", provider=self.name, details=e)
            elif code == 401 or code == 403 or "invalid api key" in err_msg or "permission" in err_msg:
                raise ProviderAuthError(f"Gemini authentication failed: {e}", provider=self.name, details=e)
            elif code == 429 or "resource_exhausted" in err_msg or "quota" in err_msg or "rate limit" in err_msg:
                raise ProviderRateLimitError(f"Gemini quota / rate limit reached: {e}", provider=self.name, details=e)
            elif "deadline" in err_msg or "timeout" in err_msg:
                raise ProviderTimeoutError(f"Gemini request timed out: {e}", provider=self.name, details=e)
            else:
                raise ProviderUnavailableError(f"Gemini API error: {e}", provider=self.name, details=e)

        except TimeoutError as e:
            raise ProviderTimeoutError(f"Gemini request timed out after {effective_timeout}s: {e}", provider=self.name, details=e)

        except Exception as e:
            err_str = str(e).lower()
            if "not found" in err_str or "404" in err_str:
                raise ProviderModelNotFoundError(f"Gemini model '{model_name}' not found: {e}", provider=self.name, details=e)
            if "timeout" in err_str or "timed out" in err_str:
                raise ProviderTimeoutError(f"Gemini connection timed out: {e}", provider=self.name, details=e)
            if "rate limit" in err_str or "429" in err_str or "quota" in err_str:
                raise ProviderRateLimitError(f"Gemini rate limit: {e}", provider=self.name, details=e)
            raise ProviderUnavailableError(f"Gemini unexpected failure: {e}", provider=self.name, details=e)
