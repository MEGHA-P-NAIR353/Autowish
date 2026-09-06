"""
core/tests_ai_multi_provider.py - Multi-Provider AI Architecture Test Suite
===========================================================================
Comprehensive unit and integration tests covering:
1. Gemini success (Primary)
2. Gemini model-not-found / failure -> Groq fallback success (Fallback 1)
3. Groq model-not-found / failure -> OpenRouter fallback success (Fallback 2)
4. Gemini success does NOT call Groq
5. All providers failing -> Raises clean application exception
6. Timeout handling per provider
7. Rate-limit detection & non-blocking immediate fallback
8. Empty/malformed response validation & rejection
9. Redis cache hit (returns instantly without invoking any provider)
10. Redis cache miss (invokes primary provider, caches result)
11. Cache privacy isolation between different users
12. Multilingual & Unicode support (Malayalam, Hindi, Tamil, emojis preserved)
13. API endpoint /api/ai/generate/ contract compatibility
14. API keys & secrets are never leaked in logs or error payloads
"""

from unittest.mock import MagicMock, patch
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status

from services.ai.providers.base import (
    BaseAIProvider,
    ProviderResult,
    ProviderAuthError,
    ProviderTimeoutError,
    ProviderRateLimitError,
    ProviderModelNotFoundError,
    ProviderUnavailableError,
    ProviderResponseError,
)
from services.ai.providers.gemini_provider import GeminiProvider
from services.ai.providers.groq_provider import GroqProvider
from services.ai.providers.openrouter_provider import OpenRouterProvider
from services.ai.provider_manager import ProviderManager, generate_ai_wish
from services.ai.cache_service import AICacheService
from core.models import UserProfile, Contact, GeneratedGreeting

# Use LocMemCache during test suite so tests are deterministic even if Redis is stopped
TEST_CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-ai-cache',
    }
}


class MockProvider(BaseAIProvider):
    """Configurable mock AI provider for testing without real API calls."""

    def __init__(self, name: str, configured: bool = True, model_name: str = "mock-model"):
        self._name = name
        self._configured = configured
        self._model_name = model_name
        self.call_count = 0
        self.behavior = "success"
        self.return_text = f"Happy Birthday from {name}! 🎂 Wishing you all the best."
        self.return_finish_reason = "STOP"
        self.exception_to_raise = None
        self.call_args_list = []

    @property
    def name(self) -> str:
        return self._name

    def is_configured(self) -> bool:
        return self._configured

    def get_model_name(self) -> str:
        return self._model_name

    def generate(self, prompt: str, **kwargs) -> ProviderResult:
        self.call_count += 1
        self.call_args_list.append((prompt, kwargs))
        if self.behavior == "model_not_found":
            raise ProviderModelNotFoundError(f"Model {self._model_name} not found", provider=self.name)
        elif self.behavior == "auth_error":
            raise ProviderAuthError("Auth failed", provider=self.name)
        elif self.behavior == "timeout":
            raise ProviderTimeoutError("Request timed out", provider=self.name)
        elif self.behavior == "rate_limit":
            raise ProviderRateLimitError("Rate limit reached", provider=self.name)
        elif self.behavior == "unavailable":
            raise ProviderUnavailableError("Service down", provider=self.name)
        elif self.behavior == "empty_response":
            return ProviderResult(provider=self.name, model=self._model_name, text="")
        elif self.behavior == "template_text":
            return ProviderResult(provider=self.name, model=self._model_name, text="Greeting + Name")
        elif self.behavior == "reasoning_text":
            return ProviderResult(provider=self.name, model=self._model_name, text="Thinking: generate wish\nDraft:\nHappy Birthday, Rahul! 🎉")
        elif self.behavior == "max_tokens_truncated":
            # First call returns truncated, second call returns completed
            if self.call_count == 1:
                return ProviderResult(
                    provider=self.name,
                    model=self._model_name,
                    text="Happy Birthday, Rahul! Wishing you joy (and wonderful memories",
                    finish_reason="MAX_TOKENS",
                )
            else:
                return ProviderResult(
                    provider=self.name,
                    model=self._model_name,
                    text="Happy Birthday, Rahul! Wishing you joy and wonderful memories! 🎉",
                    finish_reason="STOP",
                )
        elif self.behavior == "custom_exception" and self.exception_to_raise:
            raise self.exception_to_raise

        return ProviderResult(
            provider=self.name,
            model=self._model_name,
            text=self.return_text,
            finish_reason=self.return_finish_reason,
            latency_ms=10.0,
        )


@override_settings(CACHES=TEST_CACHES)
class MultiProviderAITests(TestCase):

    def setUp(self):
        cache.clear()
        self.gemini = MockProvider("gemini", configured=True, model_name="gemini-3.6-flash")
        self.groq = MockProvider("groq", configured=True, model_name="llama-3.3-70b-versatile")
        self.openrouter = MockProvider("openrouter", configured=True, model_name="meta-llama/llama-3.3-70b-instruct:free")
        self.manager = ProviderManager(providers=[self.gemini, self.groq, self.openrouter])

    def tearDown(self):
        cache.clear()

    # ── Test 1: Gemini Success (Primary) & Does NOT Call Groq ─────────────────
    def test_gemini_primary_success_does_not_call_groq(self):
        """Primary provider (Gemini) should succeed and NOT invoke Groq or OpenRouter."""
        res = self.manager.generate("Happy Birthday", recipient_name="Alice", use_cache=False)
        self.assertEqual(res["provider"], "gemini")
        self.assertFalse(res["cached"])
        self.assertEqual(self.gemini.call_count, 1)
        self.assertEqual(self.groq.call_count, 0)
        self.assertEqual(self.openrouter.call_count, 0)
        self.assertIn("Happy Birthday from gemini!", res["content"])

    # ── Test 2: Gemini Model Not Found (404) -> Groq Fallback ──────────────────
    def test_gemini_model_not_found_fallback_to_groq(self):
        """If Gemini returns 404 model not found, it must immediately fall back to Groq."""
        self.gemini.behavior = "model_not_found"
        res = self.manager.generate("Happy Birthday", recipient_name="Alice", use_cache=False)
        self.assertEqual(res["provider"], "groq")
        self.assertEqual(self.gemini.call_count, 1)
        self.assertEqual(self.groq.call_count, 1)
        self.assertEqual(self.openrouter.call_count, 0)
        self.assertIn("Happy Birthday from groq!", res["content"])

    # ── Test 3: Groq Model Not Found (404) -> OpenRouter Fallback ─────────────
    def test_groq_model_not_found_fallback_to_openrouter(self):
        """If Gemini fails and Groq returns 404 model not found, fall back to OpenRouter."""
        self.gemini.behavior = "timeout"
        self.groq.behavior = "model_not_found"
        res = self.manager.generate("Happy Birthday", recipient_name="Alice", use_cache=False)
        self.assertEqual(res["provider"], "openrouter")
        self.assertEqual(self.gemini.call_count, 1)
        self.assertEqual(self.groq.call_count, 1)
        self.assertEqual(self.openrouter.call_count, 1)
        self.assertIn("Happy Birthday from openrouter!", res["content"])

    # ── Test 4: All Providers Failing ─────────────────────────────────────────
    def test_all_providers_failing_raises_controlled_error(self):
        """If all providers fail, a clean application RuntimeError is raised."""
        self.gemini.behavior = "timeout"
        self.groq.behavior = "rate_limit"
        self.openrouter.behavior = "unavailable"
        with self.assertRaises(RuntimeError) as ctx:
            self.manager.generate("Happy Birthday", recipient_name="Alice", use_cache=False)
        self.assertIn("All providers failed", str(ctx.exception))

    # ── Test 5: Timeout Handling ──────────────────────────────────────────────
    def test_timeout_handling_immediate_fallback(self):
        """Provider timeouts should fail over immediately to the next provider."""
        self.gemini.behavior = "timeout"
        res = self.manager.generate("Wish text", recipient_name="Bob", use_cache=False)
        self.assertEqual(res["provider"], "groq")
        self.assertEqual(self.gemini.call_count, 1)
        self.assertEqual(self.groq.call_count, 1)

    # ── Test 6: Rate-Limit Handling ───────────────────────────────────────────
    def test_rate_limit_handling_no_retry_storm(self):
        """Rate limit error should fail over immediately to next provider without loop storms."""
        self.gemini.behavior = "rate_limit"
        self.groq.behavior = "rate_limit"
        res = self.manager.generate("Wish text", recipient_name="Carol", use_cache=False)
        self.assertEqual(res["provider"], "openrouter")
        self.assertEqual(self.gemini.call_count, 1)
        self.assertEqual(self.groq.call_count, 1)
        self.assertEqual(self.openrouter.call_count, 1)

    # ── Test 7: Empty and Malformed Output Validation ─────────────────────────
    def test_invalid_template_output_rejected_and_fallback(self):
        """Provider returning template text e.g. 'Greeting + Name' is rejected and falls back."""
        self.gemini.behavior = "template_text"
        res = self.manager.generate("Wish text", recipient_name="Dave", use_cache=False)
        self.assertEqual(res["provider"], "groq")
        self.assertEqual(self.gemini.call_count, 1)
        self.assertEqual(self.groq.call_count, 1)

    # ── Test 8 & 9: Redis Cache Miss and Hit ───────────────────────────────────
    def test_cache_miss_then_hit(self):
        """First request populates cache; second request hits cache without calling any provider."""
        cache_key = AICacheService.generate_cache_key(
            user_id=1,
            recipient_name="Alice",
            occasion="Birthday",
            tone="Warm",
            language="en",
        )
        # Miss
        res1 = self.manager.generate(
            "Wish prompt",
            recipient_name="Alice",
            cache_key=cache_key,
            use_cache=True,
        )
        self.assertFalse(res1["cached"])
        self.assertEqual(self.gemini.call_count, 1)

        # Hit
        res2 = self.manager.generate(
            "Wish prompt",
            recipient_name="Alice",
            cache_key=cache_key,
            use_cache=True,
        )
        self.assertTrue(res2["cached"])
        self.assertEqual(res2["provider"], "cache")
        self.assertEqual(self.gemini.call_count, 1)  # No additional provider invocation
        self.assertEqual(res1["content"], res2["content"])

    # ── Test 10: Cache Privacy Isolation Between Users ─────────────────────────
    def test_cache_privacy_isolation_between_users(self):
        """User A and User B requesting same input MUST have isolated cache keys."""
        key_user_a = AICacheService.generate_cache_key(
            user_id=101,
            recipient_name="Secret Name",
            occasion="Birthday",
            tone="Warm",
            language="en",
        )
        key_user_b = AICacheService.generate_cache_key(
            user_id=202,
            recipient_name="Secret Name",
            occasion="Birthday",
            tone="Warm",
            language="en",
        )
        self.assertNotEqual(key_user_a, key_user_b)
        self.assertIn("u_101", key_user_a)
        self.assertIn("u_202", key_user_b)

        # Store for user A
        AICacheService.set_cached_wish(key_user_a, "Private wish for User A")
        self.assertEqual(AICacheService.get_cached_wish(key_user_a), "Private wish for User A")
        self.assertIsNone(AICacheService.get_cached_wish(key_user_b))

    # ── Test 1: Gemini FINISH response returns immediately ───────────────────
    def test_gemini_finish_response_returns_immediately(self):
        """Gemini returning FINISH/STOP completes immediately on first attempt without retry."""
        self.gemini.return_finish_reason = "STOP"
        self.gemini.return_text = "Happy Birthday Alice! Wishing you a fantastic day ahead!"
        res = self.manager.generate("Happy Birthday", recipient_name="Alice", use_cache=False)
        self.assertEqual(res["provider"], "gemini")
        self.assertEqual(self.gemini.call_count, 1)
        self.assertEqual(self.groq.call_count, 0)
        self.assertEqual(self.openrouter.call_count, 0)
        self.assertIn("Happy Birthday Alice!", res["content"])

    # ── Test 2: Gemini MAX_TOKENS triggers one retry ──────────────────────────
    def test_gemini_max_tokens_triggers_one_retry(self):
        """When Gemini returns MAX_TOKENS, provider_manager retries Gemini once."""
        self.gemini.behavior = "max_tokens_truncated"
        res = self.manager.generate("Happy Birthday", recipient_name="Rahul", use_cache=False)
        self.assertEqual(res["provider"], "gemini")
        self.assertEqual(self.gemini.call_count, 2)
        self.assertEqual(self.groq.call_count, 0)
        self.assertIn("Happy Birthday, Rahul!", res["content"])

    # ── Test 3: Retry uses a larger output token limit (768) ───────────────────
    @override_settings(GEMINI_MAX_OUTPUT_TOKENS=512, GEMINI_RETRY_MAX_OUTPUT_TOKENS=768, GEMINI_MAX_TRUNCATION_RETRIES=1)
    def test_retry_uses_larger_output_token_limit(self):
        """Retry must pass GEMINI_RETRY_MAX_OUTPUT_TOKENS (768) as max_tokens."""
        self.gemini.behavior = "max_tokens_truncated"
        res = self.manager.generate("Happy Birthday", recipient_name="Rahul", use_cache=False)
        self.assertEqual(self.gemini.call_count, 2)
        # Check initial call max_tokens and retry call max_tokens
        first_call_kwargs = self.gemini.call_args_list[0][1]
        second_call_kwargs = self.gemini.call_args_list[1][1]
        self.assertEqual(first_call_kwargs.get("max_tokens"), 512)
        self.assertEqual(second_call_kwargs.get("max_tokens"), 768)

    # ── Test 4: Malayalam response ending with Malayalam characters is valid ───
    def test_malayalam_response_ending_with_malayalam_characters_is_valid(self):
        """Malayalam greetings ending in words like സന്തോഷം, സ്നേഹം, നന്ദി must be valid."""
        for ending_word in ["സന്തോഷം", "സ്നേഹം", "നന്ദി"]:
            text = f"പ്രിയപ്പെട്ട രാഹുൽ, നിങ്ങൾക്ക് ഹൃദയം നിറഞ്ഞ ജന്മദിനാശംസകൾ നേരുന്നു ഈ ദിവസം എന്നും {ending_word}"
            is_valid, reason = self.manager._validate_response(text)
            self.assertTrue(is_valid, f"Failed for ending word {ending_word}: {reason}")

    # ── Test 5: Malayalam text is not rejected because final Unicode category is Lo ───
    def test_malayalam_text_not_rejected_for_unicode_category_lo(self):
        """Ensure Unicode category 'Lo' (like Malayalam 'ൽ' in രാഹുൽ) is never rejected."""
        import unicodedata
        char = 'ൽ'
        self.assertEqual(unicodedata.category(char), 'Lo')
        text = "പ്രിയപ്പെട്ട രാഹുൽ, നിങ്ങൾക്ക് എന്റെ ഹൃദയം നിറഞ്ഞ ജന്മദിനാശംസകൾ നേരുന്നു രാഹുൽ"
        is_valid, reason = self.manager._validate_response(text)
        self.assertTrue(is_valid, f"Rejected Malayalam text with reason: {reason}")

    # ── Test 6: A response ending without punctuation can still be valid ──────
    def test_response_ending_without_punctuation_can_be_valid(self):
        """Multilingual responses ending without English punctuation must be valid."""
        text_en = "Happy Birthday dear John wishing you a very wonderful year ahead with love"
        is_valid_en, reason_en = self.manager._validate_response(text_en)
        self.assertTrue(is_valid_en, f"English unpunctuated rejected: {reason_en}")

        text_hi = "जन्मदिन की हार्दिक शुभकामनाएं आप हमेशा खुश और स्वस्थ रहें"
        is_valid_hi, reason_hi = self.manager._validate_response(text_hi)
        self.assertTrue(is_valid_hi, f"Hindi unpunctuated rejected: {reason_hi}")

    # ── Test 7: Clearly truncated MAX_TOKENS response is not sent to frontend ───
    def test_clearly_truncated_max_tokens_response_not_sent_to_frontend(self):
        """If Gemini returns truncated MAX_TOKENS on initial and retry, it falls back to Groq."""
        # Custom mock where both calls return truncated MAX_TOKENS
        def custom_generate(prompt, **kwargs):
            self.gemini.call_count += 1
            self.gemini.call_args_list.append((prompt, kwargs))
            return ProviderResult(
                provider="gemini",
                model="gemini-3.6-flash",
                text="പ്രിയ രാഹുൽ, നിങ്ങൾക്ക് ജന്മദിനാശംസകൾ നേരുന്നു ഈ പ്രത്യേക (",
                finish_reason="MAX_TOKENS",
            )
        self.gemini.generate = custom_generate

        res = self.manager.generate("Wish text", recipient_name="Rahul", use_cache=False)
        self.assertEqual(res["provider"], "groq")
        self.assertEqual(self.gemini.call_count, 2)  # initial + 1 retry
        self.assertEqual(self.groq.call_count, 1)    # fell back to Groq
        self.assertIn("Happy Birthday from groq!", res["content"])

    # ── Test 8: Retry count never exceeds GEMINI_MAX_TRUNCATION_RETRIES ────────
    @override_settings(GEMINI_MAX_TRUNCATION_RETRIES=1)
    def test_retry_count_never_exceeds_max_truncation_retries(self):
        """Retry count should strictly adhere to GEMINI_MAX_TRUNCATION_RETRIES (1 max retry = 2 total calls)."""
        def custom_generate(prompt, **kwargs):
            self.gemini.call_count += 1
            self.gemini.call_args_list.append((prompt, kwargs))
            return ProviderResult(
                provider="gemini",
                model="gemini-3.6-flash",
                text="Truncated text (",
                finish_reason="MAX_TOKENS",
            )
        self.gemini.generate = custom_generate

        res = self.manager.generate("Wish text", recipient_name="Alice", use_cache=False)
        self.assertEqual(self.gemini.call_count, 2)  # exactly 1 retry
        self.assertEqual(res["provider"], "groq")

    # ── Test 9: Provider fallback still works when Gemini genuinely fails ──────
    def test_provider_fallback_when_gemini_genuinely_fails(self):
        """When Gemini throws ProviderUnavailableError, provider manager cleanly falls back to Groq."""
        self.gemini.behavior = "unavailable"
        res = self.manager.generate("Wish text", recipient_name="Alice", use_cache=False)
        self.assertEqual(res["provider"], "groq")
        self.assertEqual(self.gemini.call_count, 1)
        self.assertEqual(self.groq.call_count, 1)
        self.assertIn("Happy Birthday from groq!", res["content"])

    # ── Test 10: Masked Key and Privacy ────────────────────────────────────────
    def test_masked_keys_do_not_leak_secrets(self):
        """Masked keys helper must never reveal full key strings."""
        gemini = GeminiProvider()
        groq = GroqProvider()
        openrouter = OpenRouterProvider()
        for p in [gemini, groq, openrouter]:
            m = p.masked_key()
            if p.is_configured():
                self.assertTrue(m.startswith("****"))
                self.assertLessEqual(len(m), 8)


@override_settings(CACHES=TEST_CACHES)
class ProviderModelFailoverUnitTests(TestCase):
    """Unit tests for individual provider fallback and model skip behaviors."""

    @patch("services.ai.providers.groq_provider.Groq")
    @override_settings(GROQ_API_KEY="test_groq_key", GROQ_MODEL="decommissioned-model", GROQ_FALLBACK_MODELS="decommissioned-model,llama-3.3-70b-versatile")
    def test_groq_skips_decommissioned_model_immediately(self, mock_groq_class):
        """GroqProvider should skip decommissioned/not-found model immediately without repeated retries."""
        from groq import NotFoundError
        mock_client = MagicMock()
        mock_groq_class.return_value = mock_client

        # First model fails with NotFoundError (404/decommissioned), second model succeeds
        mock_success_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Warm Birthday greetings from Groq! 🌟"
        mock_choice.finish_reason = "stop"
        mock_success_response.choices = [mock_choice]
        mock_success_response.usage = None

        mock_client.chat.completions.create.side_effect = [
            NotFoundError("Model decommissioned-model is decommissioned", response=MagicMock(status_code=404), body=None),
            mock_success_response,
        ]

        provider = GroqProvider()
        result = provider.generate("Wish prompt")
        self.assertIsInstance(result, ProviderResult)
        self.assertEqual(result.model, "llama-3.3-70b-versatile")
        self.assertEqual(result.text, "Warm Birthday greetings from Groq! 🌟")
        self.assertEqual(mock_client.chat.completions.create.call_count, 2)

    @patch("services.ai.providers.openrouter_provider.OpenAI")
    @override_settings(OPENROUTER_API_KEY="test_or_key", OPENROUTER_MODEL="unsupported-free-model", OPENROUTER_FALLBACK_MODELS="unsupported-free-model,meta-llama/llama-3.3-70b-instruct:free")
    def test_openrouter_skips_404_model_immediately(self, mock_openai_class):
        """OpenRouterProvider should skip 404 unavailable models immediately and try next fallback."""
        from openai import NotFoundError
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_success = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Heartfelt Birthday wish from OpenRouter! ✨"
        mock_choice.finish_reason = "stop"
        mock_success.choices = [mock_choice]
        mock_success.usage = None

        mock_client.chat.completions.create.side_effect = [
            NotFoundError("Model unsupported-free-model not found", response=MagicMock(status_code=404), body=None),
            mock_success,
        ]

        provider = OpenRouterProvider()
        result = provider.generate("Wish prompt")
        self.assertIsInstance(result, ProviderResult)
        self.assertEqual(result.model, "meta-llama/llama-3.3-70b-instruct:free")
        self.assertEqual(result.text, "Heartfelt Birthday wish from OpenRouter! ✨")
        self.assertEqual(mock_client.chat.completions.create.call_count, 2)


@override_settings(CACHES=TEST_CACHES)
class APIEndpointIntegrationTests(TestCase):

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword123",
            first_name="Test"
        )
        self.client.force_authenticate(user=self.user)
        self.contact = Contact.objects.create(
            user=self.user,
            name="Rahul Sharma",
            relationship="Friend",
            email="rahul@example.com"
        )

    def tearDown(self):
        cache.clear()

    # ── Test 17: Existing AI API Endpoint Compatibility ────────────────────────
    @patch("services.ai.provider_manager.get_provider_manager")
    def test_ai_generate_endpoint_success_and_contract(self, mock_get_manager):
        """Verify POST /api/ai/generate/ returns correct response format with id, greeting, provider, etc."""
        mock_mgr = MagicMock()
        mock_mgr.generate.return_value = {
            "content": "Happy Birthday, Rahul! 🎉 Wishing you a year full of success and joy!",
            "provider": "gemini",
            "cached": False,
            "latency_ms": 250.0,
        }
        mock_get_manager.return_value = mock_mgr

        payload = {
            "contact_id": self.contact.id,
            "occasion": "Birthday",
            "tone": "Warm",
            "language": "en",
        }

        response = self.client.post("/api/ai/generate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("id", data)
        self.assertIn("greeting", data)
        self.assertEqual(data["recipient"], "Rahul Sharma")
        self.assertEqual(data["provider"], "gemini")
        self.assertFalse(data["cached"])

        # Check database object created
        self.assertTrue(GeneratedGreeting.objects.filter(id=data["id"]).exists())

    @patch("services.ai.provider_manager.get_provider_manager")
    def test_ai_generate_endpoint_all_fail_clean_error(self, mock_get_manager):
        """When AI providers fail, endpoint returns clean 500 without leaking stack traces or keys."""
        mock_mgr = MagicMock()
        mock_mgr.generate.side_effect = RuntimeError("AI generation is temporarily unavailable. All providers failed.")
        mock_get_manager.return_value = mock_mgr

        payload = {
            "contact_id": self.contact.id,
            "occasion": "Birthday",
            "tone": "Warm",
            "language": "en",
        }

        response = self.client.post("/api/ai/generate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"], "AI generation is temporarily unavailable. Please try again.")
        # Ensure no tracebacks or keys in response
        self.assertNotIn("Traceback", str(data))
        self.assertNotIn("API_KEY", str(data))

