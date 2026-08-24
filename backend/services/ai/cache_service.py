"""
services/ai/cache_service.py - Deterministic AI Caching with User Privacy Isolation
================================================================================
Handles caching of generated AI greetings using Django cache/Redis.
Prevents cross-user data leakage by enforcing user-scoped cache keys.
"""

import hashlib
import json
import logging
from typing import Optional, Dict, Any
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


AI_PROMPT_VERSION = getattr(settings, "AI_PROMPT_VERSION", "v2") if settings.configured else "v2"


class AICacheService:
    """
    Service for caching AI-generated wishes.
    Guarantees privacy isolation by hashing inputs with user identification and prompt version.
    """

    @classmethod
    def generate_cache_key(
        cls,
        user_id: Optional[int],
        *,
        recipient_name: str,
        occasion: str,
        tone: str,
        language: str,
        relationship: str = 'Friend',
        age: Optional[int] = None,
        interests: Optional[Any] = None,
        custom_context: Optional[str] = None,
        mode: str = 'standard',
    ) -> str:
        """
        Generate a deterministic, privacy-isolated cache key.
        Format: wish:{version}:u_{user_id}:{sha256}
        If user_id is None, it uses 'anon' namespace.
        """
        # Normalize interests
        if isinstance(interests, list):
            sorted_interests = sorted([str(i).strip().lower() for i in interests if str(i).strip()])
        elif isinstance(interests, str):
            sorted_interests = [interests.strip().lower()]
        else:
            sorted_interests = []

        payload = {
            "version": AI_PROMPT_VERSION,
            "recipient_name": (recipient_name or "").strip().lower(),
            "occasion": (occasion or "").strip().lower(),
            "tone": (tone or "").strip().lower(),
            "language": (language or "en").strip().lower(),
            "relationship": (relationship or "friend").strip().lower(),
            "age": age,
            "interests": sorted_interests,
            "custom_context": (custom_context or "").strip().lower(),
            "mode": (mode or "standard").strip().lower(),
        }

        serialized = json.dumps(payload, sort_keys=True)
        digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:24]

        user_scope = f"u_{user_id}" if user_id is not None else "anon"
        return f"wish:{AI_PROMPT_VERSION}:{user_scope}:{digest}"

    @classmethod
    def get_cached_wish(cls, cache_key: str) -> Optional[str]:
        """Retrieve cached wish content if available."""
        try:
            val = cache.get(cache_key)
            if val:
                logger.info("[AI CACHE HIT] key=%s", cache_key)
                return str(val)
        except Exception as e:
            logger.warning("[AI CACHE GET ERROR] (ignored): %s", e)
        return None

    @classmethod
    def set_cached_wish(cls, cache_key: str, content: str, ttl: Optional[int] = None) -> None:
        """Store generated wish content in cache with TTL."""
        if not content:
            return
        default_ttl = getattr(settings, "AI_CACHE_TTL", 86400)
        effective_ttl = ttl if ttl is not None else default_ttl
        try:
            cache.set(cache_key, content, timeout=effective_ttl)
            logger.info("[AI CACHE SET] key=%s ttl=%ds", cache_key, effective_ttl)
        except Exception as e:
            logger.warning("[AI CACHE SET ERROR] (ignored): %s", e)

    @classmethod
    def delete_cached_wish(cls, cache_key: str) -> None:
        """Invalidate/delete a specific cached wish."""
        if not cache_key:
            return
        try:
            cache.delete(cache_key)
            logger.info("[AI CACHE INVALIDATED] key=%s", cache_key)
        except Exception as e:
            logger.warning("[AI CACHE DELETE ERROR] (ignored): %s", e)

