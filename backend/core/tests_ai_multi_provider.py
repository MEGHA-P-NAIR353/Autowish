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

    # ── Test 11: Multilingual & Unicode Support (Malayalam 'ൽ') ────────────────
    def test_multilingual_unicode_malayalam_with_chillu_letter(self):
        """Malayalam script ending in a chillu letter (e.g. 'ൽ') must be accepted."""
        self.gemini.return_text = "ജന്മദിനാശംസകൾ, രാഹുൽ! നിങ്ങളുടെ ഈ പ്രത്യേക ദിവസം സന്തോഷം നിറഞ്ഞതാകട്ടെ, സ്നേഹത്തോടെ രാഹുൽ"
        res = self.manager.generate("Malayalam prompt", recipient_name="രാഹുൽ", use_cache=False)
        self.assertEqual(res["provider"], "gemini")
        self.assertIn("രാഹുൽ", res["content"])
        self.assertEqual(self.groq.call_count, 0)

    # ── Test 12: Hindi Text Ending in Unicode Letter ─────────────────────────
    def test_hindi_text_ending_in_unicode_letter(self):
        """Hindi text ending in a Devanagari character without ASCII punctuation must be accepted."""
        self.gemini.return_text = "जन्मदिन की ढेर सारी शुभकामनाएं सारा आप हमेशा खुश और स्वस्थ रहें"
        res = self.manager.generate("Hindi prompt", recipient_name="सारा", use_cache=False)
        self.assertEqual(res["provider"], "gemini")
        self.assertIn("शुभकामनाएं", res["content"])
        self.assertEqual(self.groq.call_count, 0)

    # ── Test 13: English Text Without Final Punctuation ──────────────────────
    def test_english_text_without_final_punctuation_accepted(self):
        """English text that ends without punctuation must not automatically fail."""
        self.gemini.return_text = "Happy Birthday dear John wishing you a very wonderful year ahead"
        res = self.manager.generate("English prompt", recipient_name="John", use_cache=False)
        self.assertEqual(res["provider"], "gemini")
        self.assertEqual(res["content"], "Happy Birthday dear John wishing you a very wonderful year ahead")
        self.assertEqual(self.groq.call_count, 0)

    # ── Test 14: Empty Output Fails and Falls Back ───────────────────────────
    def test_empty_output_fails_and_falls_back(self):
        """Empty provider output must fail validation and fall back to next provider."""
        self.gemini.behavior = "empty_response"
        res = self.manager.generate("Prompt", recipient_name="Sam", use_cache=False)
        self.assertEqual(res["provider"], "groq")
        self.assertEqual(self.gemini.call_count, 1)
        self.assertEqual(self.groq.call_count, 1)

    # ── Test 15: Gemini MAX_TOKENS with Incomplete Delimiters Retries ─────────
    def test_gemini_max_tokens_truncated_retries_once(self):
        """When Gemini returns MAX_TOKENS with unclosed brackets, provider_manager retries once."""
        self.gemini.behavior = "max_tokens_truncated"
        res = self.manager.generate("Prompt", recipient_name="Rahul", use_cache=False)
        self.assertEqual(res["provider"], "gemini")
        # Should have called Gemini twice (initial + 1 retry) and succeeded without Groq
        self.assertEqual(self.gemini.call_count, 2)
        self.assertEqual(self.groq.call_count, 0)
        self.assertIn("Happy Birthday, Rahul!", res["content"])

    # ── Test 16: Masked Key and Privacy ────────────────────────────────────────
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

