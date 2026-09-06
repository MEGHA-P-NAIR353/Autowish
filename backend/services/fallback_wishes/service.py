"""
services/fallback_wishes/service.py - Graceful AI Greeting Fallback Service
============================================================================
Provides high-quality personalised fallback greetings when all AI providers fail.

Architecture:
    ┌─────────────────────────────────────────────────────────────────────────┐
    │  User request                                                           │
    │      ↓                                                                  │
    │  generate_ai_wish()  ← primary AI path (Gemini → Groq → OpenRouter)    │
    │      ↓                                                                  │
    │  AI success? ──YES──► return AI result                                  │
    │      │ NO                                                               │
    │      ↓                                                                  │
    │  generate_fallback_wish()  ← this module                               │
    │      ↓                                                                  │
    │  Selection hierarchy:                                                   │
    │    1. exact occasion + language + tone                                  │
    │    2. occasion + language + DEFAULT_TONE                                │
    │    3. occasion + English + requested tone                               │
    │    4. occasion + English + DEFAULT_TONE                                 │
    │    5. GENERIC_FALLBACK_TEMPLATES (always English, always works)         │
    │      ↓                                                                  │
    │  personalise({name} → recipient_name)                                  │
    │      ↓                                                                  │
    │  Return FallbackResult (same content shape as AI result)                │
    └─────────────────────────────────────────────────────────────────────────┘

Key guarantees:
  - Never raises; always returns a non-empty greeting.
  - Recipient name is always safely substituted.
  - Never exposes AI provider errors to callers.
  - Internally logs the real failure reason via structured logging.
  - Randomly selects from available templates to avoid repetition.
  - Result is clearly tagged as fallback internally (is_fallback=True).
"""

import logging
import random
import re
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

from .templates import (
    TEMPLATES,
    GENERIC_FALLBACK_TEMPLATES,
    OCCASION_ALIASES,
    TONE_ALIASES,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_TONE: str = "Friendly"
DEFAULT_LANGUAGE: str = "en"
DEFAULT_OCCASION: str = "Custom"
FALLBACK_PROVIDER_LABEL: str = "fallback"

# Maximum length of sanitised recipient name shown in logs (no PII leak risk
# since it is their own display name, but we keep it bounded).
_MAX_NAME_LOG_LEN: int = 40


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class FallbackResult:
    """
    Mirrors the dict structure returned by generate_ai_wish() so the view
    layer can treat both paths uniformly.

    is_fallback=True allows the orchestration layer to distinguish a fallback
    result from an AI-generated result without exposing this to the API client.
    """
    content: str
    provider: str = FALLBACK_PROVIDER_LABEL
    cached: bool = False
    is_fallback: bool = True
    fallback_reason: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """
        Returns a dict shaped identically to the AI provider result so that
        the view layer needs zero changes to its response serialisation.
        """
        return {
            "content": self.content,
            "provider": self.provider,
            "cached": self.cached,
            "is_fallback": self.is_fallback,
        }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalise_occasion(occasion: Optional[str]) -> str:
    """
    Convert raw occasion string to a canonical TEMPLATES key.
    Falls back to DEFAULT_OCCASION if unknown.
    """
    if not occasion:
        return DEFAULT_OCCASION
    key = occasion.strip().lower()
    # Direct ALIASES lookup (handles aliases like 'bday', 'onam', etc.)
    if key in OCCASION_ALIASES:
        return OCCASION_ALIASES[key]
    # Title-case match against top-level TEMPLATES keys
    title = occasion.strip().title()
    if title in TEMPLATES:
        return title
    return DEFAULT_OCCASION


def _normalise_tone(tone: Optional[str]) -> str:
    """
    Convert raw tone string to a canonical template dict key.
    Falls back to DEFAULT_TONE if unknown.
    """
    if not tone:
        return DEFAULT_TONE
    key = tone.strip().lower()
    if key in TONE_ALIASES:
        return TONE_ALIASES[key]
    title = tone.strip().title()
    if title in (
        "Friendly", "Warm", "Formal", "Funny", "Romantic", "Inspirational"
    ):
        return title
    return DEFAULT_TONE


def _normalise_language(language: Optional[str]) -> str:
    """Return lower-case language code, defaulting to DEFAULT_LANGUAGE."""
    if not language:
        return DEFAULT_LANGUAGE
    return language.strip().lower()


def _sanitise_name(name: Optional[str]) -> str:
    """
    Return a clean, safe recipient name.
    - Strips leading/trailing whitespace.
    - Collapses inner whitespace runs.
    - Removes characters that are not Unicode letters, digits, spaces, hyphens,
      apostrophes, or dots (safe for inclusion in a greeting).
    - Falls back to 'Friend' if the result is empty.
    """
    if not name:
        return "Friend"
    cleaned = re.sub(r"[^\w\s'\-\.]", "", name, flags=re.UNICODE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned if cleaned else "Friend"


def _personalise(template: str, recipient_name: str) -> str:
    """
    Safely substitute {name} placeholder in template.
    If {name} is absent from the template, append a name-addressed opening.
    Falls back gracefully if format() raises for any reason.
    """
    try:
        return template.format(name=recipient_name)
    except (KeyError, IndexError, ValueError):
        # Template has unexpected placeholders — return as-is with name prepended
        return f"Dear {recipient_name}, " + template


def _pick_templates(
    occasion: str,
    language: str,
    tone: str,
) -> List[str]:
    """
    Implements the 5-level fallback hierarchy for template selection.

    Returns a non-empty list of template strings (the caller picks randomly).
    Never returns an empty list — at minimum GENERIC_FALLBACK_TEMPLATES is used.
    """
    occ_map = TEMPLATES.get(occasion, {})

    def _try(lang: str, t: str) -> Optional[List[str]]:
        tpls = occ_map.get(lang, {}).get(t)
        return tpls if tpls else None

    # 1. Exact match
    result = _try(language, tone)
    if result:
        return result

    # 2. Occasion + language + default tone
    result = _try(language, DEFAULT_TONE)
    if result:
        logger.debug(
            "[FALLBACK_TEMPLATE] Level 2 (lang=%s, default_tone=%s) for occasion=%s",
            language, DEFAULT_TONE, occasion
        )
        return result

    # 3. Occasion + English + requested tone
    result = _try(DEFAULT_LANGUAGE, tone)
    if result:
        logger.debug(
            "[FALLBACK_TEMPLATE] Level 3 (en, tone=%s) for occasion=%s lang=%s",
            tone, occasion, language
        )
        return result

    # 4. Occasion + English + default tone
    result = _try(DEFAULT_LANGUAGE, DEFAULT_TONE)
    if result:
        logger.debug(
            "[FALLBACK_TEMPLATE] Level 4 (en, default_tone) for occasion=%s lang=%s",
            occasion, language
        )
        return result

    # 5. Generic fallback — occasion has no templates at all
    logger.debug(
        "[FALLBACK_TEMPLATE] Level 5 (generic) for occasion=%s lang=%s tone=%s",
        occasion, language, tone
    )
    return GENERIC_FALLBACK_TEMPLATES


# ---------------------------------------------------------------------------
# Public service
# ---------------------------------------------------------------------------

class FallbackWishService:
    """
    Generates personalised fallback greetings when AI providers are unavailable.

    Designed to be stateless; all methods are class methods for easy patching
    in tests.
    """

    @classmethod
    def generate(
        cls,
        *,
        recipient_name: Optional[str] = None,
        occasion: Optional[str] = None,
        tone: Optional[str] = None,
        language: Optional[str] = None,
        relationship: Optional[str] = None,
        failure_reason: str = "unknown",
        user_id: Optional[int] = None,
        exclude_template: Optional[str] = None,
    ) -> FallbackResult:
        """
        Generate and return a personalised fallback greeting.

        Parameters
        ----------
        recipient_name : str, optional
            The recipient's display name. Sanitised and defaulted to 'Friend'.
        occasion : str, optional
            Occasion string (e.g. 'Birthday', 'Anniversary'). Normalised internally.
        tone : str, optional
            Tone string (e.g. 'Friendly', 'Warm'). Normalised internally.
        language : str, optional
            BCP-47-style language code (e.g. 'en', 'ml', 'hi'). Normalised internally.
        relationship : str, optional
            Relationship label (currently informational; reserved for richer templates).
        failure_reason : str
            Sanitised reason for AI failure — logged internally, never surfaced to API.
        user_id : int, optional
            User identifier for structured logging.
        exclude_template : str, optional
            If provided, avoid returning this exact template text (used by regenerate
            to prevent serving the same fallback twice in a row).

        Returns
        -------
        FallbackResult
            Always contains a non-empty, personalised greeting.
        """
        # Normalise inputs
        safe_name = _sanitise_name(recipient_name)
        norm_occasion = _normalise_occasion(occasion)
        norm_tone = _normalise_tone(tone)
        norm_language = _normalise_language(language)

        # Structured internal log — real reason stays server-side only
        logger.warning(
            "[AI_FALLBACK_ACTIVATED] user=%s recipient=%s occasion=%s language=%s "
            "tone=%s reason=%s",
            user_id or "anon",
            safe_name[:_MAX_NAME_LOG_LEN],
            norm_occasion,
            norm_language,
            norm_tone,
            failure_reason,
        )

        # Select candidate templates via hierarchy
        candidates = _pick_templates(norm_occasion, norm_language, norm_tone)

        # Exclude previously served template when regenerating (avoid exact repetition)
        if exclude_template and len(candidates) > 1:
            candidates = [t for t in candidates if t != exclude_template]

        # Random selection for variety
        raw_template = random.choice(candidates)

        # Personalise
        greeting = _personalise(raw_template, safe_name)

        # Final safety net — should never happen but guarantees non-empty response
        if not greeting or not greeting.strip():
            greeting = f"Dear {safe_name}, warmest wishes on this special occasion. May joy and happiness be yours always."

        logger.info(
            "[AI_FALLBACK_SERVED] user=%s occasion=%s language=%s tone=%s "
            "length=%d chars",
            user_id or "anon", norm_occasion, norm_language, norm_tone, len(greeting)
        )

        return FallbackResult(
            content=greeting,
            fallback_reason=failure_reason,
            metadata={
                "occasion": norm_occasion,
                "language": norm_language,
                "tone": norm_tone,
                "raw_template": raw_template,
            }
        )


# ---------------------------------------------------------------------------
# Convenience function (mirrors generate_ai_wish() call signature subset)
# ---------------------------------------------------------------------------

def generate_fallback_wish(
    recipient_name: Optional[str] = None,
    occasion: Optional[str] = None,
    tone: Optional[str] = None,
    language: Optional[str] = None,
    relationship: Optional[str] = None,
    failure_reason: str = "unknown",
    user_id: Optional[int] = None,
    exclude_template: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Convenience wrapper around FallbackWishService.generate() that returns
    a plain dict matching the generate_ai_wish() return shape so the view
    layer requires no branching logic.
    """
    result = FallbackWishService.generate(
        recipient_name=recipient_name,
        occasion=occasion,
        tone=tone,
        language=language,
        relationship=relationship,
        failure_reason=failure_reason,
        user_id=user_id,
        exclude_template=exclude_template,
    )
    return result.to_dict()
