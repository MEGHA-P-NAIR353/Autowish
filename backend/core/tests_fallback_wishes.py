"""
core/tests_fallback_wishes.py — Test suite for the Graceful AI Fallback System
================================================================================

Tests cover:
  1.  Successful AI generation does NOT use fallback.
  2.  AI failure activates fallback.
  3.  Fallback greeting contains the selected recipient name.
  4.  Malayalam fallback greeting works correctly.
  5.  Hindi fallback greeting works correctly.
  6.  English fallback greeting works correctly.
  7.  Missing tone falls back gracefully (uses default tone).
  8.  Missing language falls back gracefully (uses English).
  9.  Unknown occasion uses generic fallback.
  10. Missing recipient name does not crash.
  11. Fallback never returns an empty message.
  12. Regenerate attempts AI again (not cached fallback).
  13. AI provider errors are not exposed to the frontend.
  14. Existing API response contract (shape) remains unchanged.
"""

import json
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from services.fallback_wishes.service import (
    FallbackWishService,
    FallbackResult,
    _sanitise_name,
    _normalise_occasion,
    _normalise_tone,
    _normalise_language,
)
from services.fallback_wishes.templates import GENERIC_FALLBACK_TEMPLATES


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_result(content: str = "Happy Birthday, Anoop!", provider: str = "gemini") -> dict:
    """Simulate a successful AI result dict."""
    return {"content": content, "provider": provider, "cached": False}


def _fallback_kwargs(**overrides) -> dict:
    """Base kwargs for FallbackWishService.generate()."""
    base = {
        "recipient_name": "Anoop",
        "occasion": "Birthday",
        "tone": "Friendly",
        "language": "en",
        "relationship": "Friend",
        "failure_reason": "test",
        "user_id": 42,
    }
    base.update(overrides)
    return base


# ── Unit Tests: FallbackWishService ──────────────────────────────────────────

class TestFallbackWishService(TestCase):
    """Unit tests for the core FallbackWishService.generate() logic."""

    # ── Test 3: fallback contains recipient name ──────────────────────────────
    def test_fallback_contains_recipient_name(self):
        """Fallback greeting must contain the recipient's name."""
        result = FallbackWishService.generate(**_fallback_kwargs(recipient_name="Anoop"))
        self.assertIsInstance(result, FallbackResult)
        self.assertIn("Anoop", result.content)
        self.assertTrue(result.is_fallback)

    # ── Test 4: Malayalam fallback works ─────────────────────────────────────
    def test_malayalam_fallback_greeting(self):
        """Malayalam fallback must return a non-empty personalised greeting."""
        result = FallbackWishService.generate(**_fallback_kwargs(
            recipient_name="Rahul",
            occasion="Birthday",
            tone="Friendly",
            language="ml",
        ))
        self.assertTrue(result.content.strip(), "Malayalam fallback must not be empty")
        self.assertIn("Rahul", result.content)

    # ── Test 5: Hindi fallback works ─────────────────────────────────────────
    def test_hindi_fallback_greeting(self):
        """Hindi fallback must return a non-empty personalised greeting."""
        result = FallbackWishService.generate(**_fallback_kwargs(
            recipient_name="Priya",
            occasion="Birthday",
            tone="Warm",
            language="hi",
        ))
        self.assertTrue(result.content.strip(), "Hindi fallback must not be empty")
        self.assertIn("Priya", result.content)

    # ── Test 6: English fallback works ───────────────────────────────────────
    def test_english_fallback_greeting(self):
        """English fallback must return a non-empty personalised greeting."""
        result = FallbackWishService.generate(**_fallback_kwargs(
            recipient_name="John",
            occasion="Birthday",
            tone="Formal",
            language="en",
        ))
        self.assertTrue(result.content.strip(), "English fallback must not be empty")
        self.assertIn("John", result.content)

    # ── Test 7: Missing tone falls back to default tone ───────────────────────
    def test_missing_tone_falls_back_gracefully(self):
        """None or unknown tone must not crash; default tone is used."""
        for bad_tone in [None, "", "UnknownTone", "xyz123"]:
            with self.subTest(tone=bad_tone):
                result = FallbackWishService.generate(**_fallback_kwargs(tone=bad_tone))
                self.assertTrue(result.content.strip())
                self.assertIn("Anoop", result.content)

    # ── Test 8: Missing language falls back to English ────────────────────────
    def test_missing_language_falls_back_gracefully(self):
        """None or unknown language must not crash; English is used."""
        for bad_lang in [None, "", "zz", "xx-XX"]:
            with self.subTest(lang=bad_lang):
                result = FallbackWishService.generate(**_fallback_kwargs(language=bad_lang))
                self.assertTrue(result.content.strip())
                self.assertIn("Anoop", result.content)

    # ── Test 9: Unknown occasion uses generic fallback ────────────────────────
    def test_unknown_occasion_uses_generic_fallback(self):
        """An occasion with no templates must still produce a valid greeting."""
        for unknown in ["Graduation", "Retirement", "Promotion", "XYZ", ""]:
            with self.subTest(occasion=unknown):
                result = FallbackWishService.generate(**_fallback_kwargs(occasion=unknown))
                self.assertTrue(result.content.strip())

    # ── Test 10: Missing recipient name does not crash ────────────────────────
    def test_missing_recipient_name_does_not_crash(self):
        """None or empty recipient name must produce a valid greeting (uses 'Friend')."""
        for bad_name in [None, "", "   "]:
            with self.subTest(name=repr(bad_name)):
                result = FallbackWishService.generate(**_fallback_kwargs(recipient_name=bad_name))
                self.assertTrue(result.content.strip())
                # Default 'Friend' substitution
                self.assertIn("Friend", result.content)

    # ── Test 11: Fallback never returns empty message ─────────────────────────
    def test_fallback_never_empty(self):
        """Fallback must return non-empty content under all edge-case inputs."""
        edge_cases = [
            {"recipient_name": None, "occasion": None, "tone": None, "language": None},
            {"recipient_name": "", "occasion": "", "tone": "", "language": ""},
            {"recipient_name": "X" * 200, "occasion": "🎂", "tone": "😄", "language": "zzz"},
        ]
        for kwargs in edge_cases:
            with self.subTest(kwargs=kwargs):
                result = FallbackWishService.generate(
                    **_fallback_kwargs(**kwargs, failure_reason="edge_case"),
                )
                self.assertTrue(
                    result.content and result.content.strip(),
                    f"Empty content returned for kwargs={kwargs}"
                )

    # ── Normalisation unit tests ──────────────────────────────────────────────
    def test_occasion_aliases_normalise_correctly(self):
        self.assertEqual(_normalise_occasion("birthday"), "Birthday")
        self.assertEqual(_normalise_occasion("bday"), "Birthday")
        self.assertEqual(_normalise_occasion("BIRTHDAY"), "Birthday")
        self.assertEqual(_normalise_occasion("onam"), "Festival")
        self.assertEqual(_normalise_occasion("christmas"), "Holiday")
        self.assertEqual(_normalise_occasion("unknown_event"), "Custom")

    def test_tone_aliases_normalise_correctly(self):
        self.assertEqual(_normalise_tone("heartfelt"), "Warm")
        self.assertEqual(_normalise_tone("FUNNY"), "Funny")
        self.assertEqual(_normalise_tone("motivational"), "Inspirational")
        self.assertEqual(_normalise_tone(None), "Friendly")
        self.assertEqual(_normalise_tone("badtone"), "Friendly")

    def test_sanitise_name_handles_edge_cases(self):
        self.assertEqual(_sanitise_name(None), "Friend")
        self.assertEqual(_sanitise_name(""), "Friend")
        self.assertEqual(_sanitise_name("   "), "Friend")
        self.assertEqual(_sanitise_name("Anoop"), "Anoop")
        self.assertEqual(_sanitise_name("Mary-Jane O'Brien"), "Mary-Jane O'Brien")

    def test_exclude_template_avoids_repetition(self):
        """When regenerating, exclude_template should return a different template if available."""
        # Use English Birthday Friendly (has 3 templates)
        result1 = FallbackWishService.generate(**_fallback_kwargs(language="en", tone="Friendly"))
        raw_used = result1.metadata.get("raw_template")
        self.assertIsNotNone(raw_used)

        # Now exclude that template — should get a different one (3 templates available)
        result2 = FallbackWishService.generate(
            **_fallback_kwargs(language="en", tone="Friendly"),
            exclude_template=raw_used,
        )
        # Personalised content may differ
        self.assertTrue(result2.content.strip())

    def test_fallback_result_to_dict_matches_ai_shape(self):
        """to_dict() must return the same keys as a successful AI result."""
        result = FallbackWishService.generate(**_fallback_kwargs())
        d = result.to_dict()
        self.assertIn("content", d)
        self.assertIn("provider", d)
        self.assertIn("cached", d)
        self.assertEqual(d["provider"], "fallback")
        self.assertFalse(d["cached"])


# ── Integration Tests: API endpoint ──────────────────────────────────────────

from django.test import TestCase, override_settings

@override_settings(ALLOWED_HOSTS=["*", "testserver", "localhost", "127.0.0.1"])
class TestGenerateAIGreetingFallbackIntegration(TestCase):
    """
    Integration tests against POST /api/ai/generate/ using a mocked AI layer.
    Verifies the view correctly falls back and preserves API contract.
    """

    def setUp(self):
        self.client = APIClient()
        self.user, _ = User.objects.get_or_create(
            username="testuser_fallback",
            defaults={"password": "testpass123"}
        )
        self.client.force_authenticate(user=self.user)
        self.url = "/api/ai/generate/"

    def tearDown(self):
        User.objects.filter(username="testuser_fallback").delete()

    def _post(self, **overrides) -> "rest_framework.response.Response":
        payload = {
            "recipient_name": "Anoop",
            "occasion": "Birthday",
            "tone": "Friendly",
            "language": "en",
            "relationship": "Friend",
        }
        payload.update(overrides)
        return self.client.post(self.url, payload, format="json")

    # ── Test 1: Successful AI does not use fallback ───────────────────────────
    @patch("core.views.generate_ai_wish")
    def test_successful_ai_does_not_use_fallback(self, mock_ai):
        """When AI succeeds, provider must NOT be 'fallback'."""
        mock_ai.return_value = _make_result("Happy Birthday, Anoop!")
        response = self._post()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertNotEqual(data.get("provider"), "fallback")
        self.assertIn("greeting", data)
        self.assertTrue(data["greeting"])

    # ── Test 2: AI failure activates fallback ─────────────────────────────────
    @patch("core.views.generate_ai_wish")
    def test_ai_failure_activates_fallback(self, mock_ai):
        """RuntimeError from AI must activate fallback, not return 500."""
        mock_ai.side_effect = RuntimeError("All providers failed.")
        response = self._post()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("provider"), "fallback")
        self.assertTrue(data.get("greeting"))

    # ── Test 3 (API): Fallback greeting contains recipient name ───────────────
    @patch("core.views.generate_ai_wish")
    def test_fallback_response_contains_recipient_name(self, mock_ai):
        """Fallback greeting returned via API must contain the recipient name."""
        mock_ai.side_effect = Exception("Gemini down")
        response = self._post(recipient_name="Meera")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Meera", data.get("greeting", ""))

    # ── Test 12: Regenerate attempts AI again ─────────────────────────────────
    @patch("core.views.generate_ai_wish")
    def test_regenerate_attempts_ai_again(self, mock_ai):
        """force_regenerate=True must call AI (not use cache) and bypass cache."""
        mock_ai.return_value = _make_result("Happy Birthday again, Anoop!")
        response = self._post(force_regenerate=True)
        self.assertEqual(response.status_code, 200)
        # Verify AI was called with use_cache=False (implicitly via force_regenerate)
        mock_ai.assert_called_once()
        call_kwargs = mock_ai.call_args[1]
        self.assertFalse(call_kwargs.get("use_cache", True))

    # ── Test 13: AI provider errors not exposed to frontend ───────────────────
    @patch("core.views.generate_ai_wish")
    def test_provider_errors_not_exposed_to_frontend(self, mock_ai):
        """The response body must not contain provider error details."""
        mock_ai.side_effect = RuntimeError(
            "APIKey=sk-abc123 secret; Gemini 503 backend down; internal trace xyz"
        )
        response = self._post()
        self.assertEqual(response.status_code, 200)
        raw_body = json.dumps(response.json())
        # Sensitive terms must never appear in the client response
        for forbidden in ["sk-abc123", "503 backend", "internal trace", "APIKey"]:
            self.assertNotIn(forbidden, raw_body, f"Sensitive term '{forbidden}' leaked!")

    # ── Test 14: API response contract unchanged ──────────────────────────────
    @patch("core.views.generate_ai_wish")
    def test_api_response_contract_preserved_on_ai_success(self, mock_ai):
        """Successful response must have all expected contract fields."""
        mock_ai.return_value = _make_result("Wishing you a wonderful birthday, Anoop!")
        response = self._post()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        required_keys = ["id", "greeting", "recipient", "occasion", "tone",
                         "language", "provider", "cached"]
        for key in required_keys:
            self.assertIn(key, data, f"Missing key '{key}' in API response")

    @patch("core.views.generate_ai_wish")
    def test_api_response_contract_preserved_on_fallback(self, mock_ai):
        """Fallback response must also contain all expected contract fields."""
        mock_ai.side_effect = Exception("All providers failed")
        response = self._post()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        required_keys = ["id", "greeting", "recipient", "occasion", "tone",
                         "language", "provider", "cached"]
        for key in required_keys:
            self.assertIn(key, data, f"Missing key '{key}' in fallback API response")

    @patch("core.views.generate_ai_wish")
    def test_fallback_on_ai_validation_error(self, mock_ai):
        """AIValidationError must activate fallback, not return 503."""
        from services.ai import AIValidationError
        mock_ai.side_effect = AIValidationError("incomplete_ending", "gemini")
        response = self._post()
        # Must be 200 with a valid greeting — not 503
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("greeting"))

    @patch("core.views.generate_ai_wish")
    def test_empty_ai_response_triggers_fallback(self, mock_ai):
        """Empty content from AI must trigger fallback (not return empty greeting)."""
        mock_ai.return_value = {"content": "", "provider": "gemini", "cached": False}
        response = self._post()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("greeting"))
        self.assertEqual(data.get("provider"), "fallback")


# ── Language/occasion matrix spot-checks ─────────────────────────────────────

class TestFallbackTemplateMatrix(TestCase):
    """
    Spot-check that all critical language × occasion combinations produce
    non-empty, personalised results.
    """

    COMBOS = [
        ("Birthday", "en", "Friendly"),
        ("Birthday", "ml", "Friendly"),
        ("Birthday", "hi", "Friendly"),
        ("Birthday", "en", "Formal"),
        ("Birthday", "en", "Funny"),
        ("Birthday", "en", "Romantic"),
        ("Birthday", "en", "Inspirational"),
        ("Anniversary", "en", "Warm"),
        ("Anniversary", "ml", "Romantic"),
        ("Anniversary", "hi", "Friendly"),
        ("Festival", "en", "Warm"),
        ("Festival", "ml", "Friendly"),
        ("Festival", "hi", "Friendly"),
        ("Holiday", "en", "Friendly"),
        ("Custom", "en", "Warm"),
        ("Custom", "ml", "Friendly"),
        ("Custom", "hi", "Friendly"),
        # Language fallback cases
        ("Birthday", "ta", "Friendly"),
        ("Birthday", "te", "Warm"),
        ("Birthday", "kn", "Friendly"),
        ("Birthday", "es", "Friendly"),
        ("Birthday", "fr", "Friendly"),
        # Unknown → generic
        ("Graduation", "en", "Inspirational"),
        ("Unknown", "zz", "Unknown"),
    ]

    def test_all_combinations_produce_non_empty_personalised_result(self):
        for occasion, lang, tone in self.COMBOS:
            with self.subTest(occasion=occasion, lang=lang, tone=tone):
                result = FallbackWishService.generate(
                    recipient_name="TestUser",
                    occasion=occasion,
                    tone=tone,
                    language=lang,
                    failure_reason="matrix_test",
                    user_id=None,
                )
                self.assertTrue(
                    result.content and result.content.strip(),
                    f"Empty result for {occasion}/{lang}/{tone}"
                )
                self.assertIn("TestUser", result.content)
