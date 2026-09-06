"""
services/ai/providers/gemini_provider.py - Official Google Gemini Provider
========================================================================
Integrates Google Gemini using the official google-genai SDK.
Handles high-speed free-tier and reasoning models (gemini-3.6-flash).
"""

import time
import logging
from typing import Optional
from django.conf import settings
from google import genai
from google.genai import types
from google.genai.errors import APIError, ClientError, ServerError

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


class GeminiProvider(BaseAIProvider):
    """
    Primary AI Provider leveraging the official Google Gemini SDK.
    Optimized for Google Gemini models with full reasoning, token scaling, and fallback support.
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
        max_tokens: int = 1000,
        temperature: float = 0.9,
        top_p: float = 0.95,
        timeout: Optional[float] = None,
    ) -> ProviderResult:
        if not self.is_configured():
            raise ProviderAuthError("Gemini API key is not configured.", provider=self.name)

        model_name = self.get_model_name()
        default_timeout = getattr(settings, "AI_PROVIDER_TIMEOUT", 15.0)
        effective_timeout = timeout or default_timeout

        client = self._get_client()

        # Configurable maximum output tokens ceiling
        configured_max_tokens = int(getattr(settings, "GEMINI_MAX_OUTPUT_TOKENS", 512))
        effective_max_tokens = max_tokens if max_tokens is not None else configured_max_tokens

        # Build clean generation config without function calling tools
        config = types.GenerateContentConfig(
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=effective_max_tokens,
            system_instruction=system_prompt if system_prompt else None,
            tools=None,
        )

        start_time = time.time()
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )

            elapsed_ms = round((time.time() - start_time) * 1000, 2)

            # Safely extract candidate finish reason
            candidate = response.candidates[0] if (response and getattr(response, "candidates", None)) else None
            finish_reason_raw = getattr(candidate, "finish_reason", None) if candidate else None
            finish_reason_str = str(finish_reason_raw).upper() if finish_reason_raw is not None else "STOP"
            if "MAX_TOKENS" in finish_reason_str:
                finish_reason_str = "MAX_TOKENS"
            elif "STOP" in finish_reason_str:
                finish_reason_str = "STOP"
            elif "SAFETY" in finish_reason_str:
                finish_reason_str = "SAFETY"

            # Safely extract usage metadata
            usage = getattr(response, "usage_metadata", None)
            prompt_tokens = getattr(usage, "prompt_token_count", None) if usage else None
            candidate_tokens = getattr(usage, "candidates_token_count", None) if usage else None
            total_tokens = (prompt_tokens or 0) + (candidate_tokens or 0) if (prompt_tokens or candidate_tokens) else None

            resp_text = (response.text or "").strip() if response else ""
            words_count = len(resp_text.split()) if resp_text else 0
            chars_count = len(resp_text)

            logger.info(
                "[GEMINI AI RESPONSE] provider=%s model=%s finish_reason=%s prompt_tokens=%s candidate_tokens=%s words=%d chars=%d latency_ms=%.2f",
                self.name, model_name, finish_reason_str, prompt_tokens, candidate_tokens, words_count, chars_count, elapsed_ms
            )

            if not resp_text:
                raise ProviderResponseError(
                    f"Gemini returned an empty response text (finish_reason={finish_reason_str}).",
                    provider=self.name
                )

            return ProviderResult(
                provider=self.name,
                model=model_name,
                text=resp_text,
                finish_reason=finish_reason_str,
                success=True,
                retryable=(finish_reason_str == "MAX_TOKENS"),
                token_usage={
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": candidate_tokens,
                    "total_tokens": total_tokens,
                },
                latency_ms=elapsed_ms,
            )

        except (ClientError, APIError) as e:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            err_msg = str(e).lower()
            code = getattr(e, "code", None)
            if code == 404 or "not found" in err_msg or "no longer available" in err_msg:
                logger.error("[GEMINI MODEL NOT FOUND] Model %s is not available or deprecated: %s", model_name, e)
                raise ProviderModelNotFoundError(f"Gemini model '{model_name}' not found: {e}", provider=self.name, details=e)
            elif code == 401 or code == 403 or "invalid api key" in err_msg or "permission" in err_msg or "unauthenticated" in err_msg:
                logger.error("[GEMINI AUTH ERROR] API key is invalid or unauthorized: %s", e)
                raise ProviderAuthError(f"Gemini authentication failed: {e}", provider=self.name, details=e)
            elif code == 429 or "resource_exhausted" in err_msg or "quota" in err_msg or "rate limit" in err_msg:
                logger.warning("[GEMINI RATE LIMIT] Quota or rate limit exceeded: %s", e)
                raise ProviderRateLimitError(f"Gemini quota / rate limit reached: {e}", provider=self.name, details=e)
            elif "deadline" in err_msg or "timeout" in err_msg:
                raise ProviderTimeoutError(f"Gemini request timed out: {e}", provider=self.name, details=e)
            else:
                raise ProviderUnavailableError(f"Gemini API error ({code}): {e}", provider=self.name, details=e)

        except TimeoutError as e:
            raise ProviderTimeoutError(f"Gemini request timed out after {effective_timeout}s: {e}", provider=self.name, details=e)

        except (ProviderAuthError, ProviderModelNotFoundError, ProviderRateLimitError, ProviderTimeoutError, ProviderResponseError, ProviderUnavailableError):
            raise

        except Exception as e:
            err_str = str(e).lower()
            if "not found" in err_str or "404" in err_str:
                raise ProviderModelNotFoundError(f"Gemini model '{model_name}' not found: {e}", provider=self.name, details=e)
            if "timeout" in err_str or "timed out" in err_str:
                raise ProviderTimeoutError(f"Gemini connection timed out: {e}", provider=self.name, details=e)
            if "rate limit" in err_str or "429" in err_str or "quota" in err_str:
                raise ProviderRateLimitError(f"Gemini rate limit: {e}", provider=self.name, details=e)
            raise ProviderUnavailableError(f"Gemini unexpected failure: {e}", provider=self.name, details=e)

