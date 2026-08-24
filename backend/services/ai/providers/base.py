"""
services/ai/providers/base.py - Base AI Provider Abstraction
============================================================
Defines the uniform interface and exceptions for all AI providers.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class AIProviderError(Exception):
    """Base exception for all AI provider errors."""
    def __init__(self, message: str, provider: str, details: Optional[Any] = None):
        self.provider = provider
        self.details = details
        super().__init__(f"[{provider.upper()} ERROR] {message}")


class ProviderAuthError(AIProviderError):
    """Raised when provider authentication fails (e.g. invalid API key)."""
    pass


class ProviderTimeoutError(AIProviderError):
    """Raised when provider response times out."""
    pass


class ProviderRateLimitError(AIProviderError):
    """Raised when provider returns HTTP 429 / quota limit exceeded."""
    pass


class ProviderModelNotFoundError(AIProviderError):
    """Raised when provider returns HTTP 404 / Model not found."""
    pass


class ProviderUnavailableError(AIProviderError):
    """Raised when provider service is down or temporarily unavailable."""
    pass


class ProviderResponseError(AIProviderError):
    """Raised when provider returns empty or malformed content."""
    pass


class BaseAIProvider(ABC):
    """
    Abstract base class for all AI generation providers.
    Ensures a clean, predictable, uniform interface across Gemini, Groq, OpenRouter, etc.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identification name (e.g. 'gemini', 'groq', 'openrouter')."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if provider credentials/keys are present."""
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        """Return the active model name being used."""
        pass

    @abstractmethod
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
        """
        Generate text response from the provider.

        Args:
            prompt: User/Greeting prompt.
            system_prompt: Optional system instruction prompt.
            max_tokens: Token generation limit.
            temperature: Sampling temperature.
            top_p: Nucleus sampling factor.
            timeout: Maximum allowed execution time in seconds.

        Returns:
            Raw generated string from the model.

        Raises:
            ProviderAuthError
            ProviderTimeoutError
            ProviderRateLimitError
            ProviderModelNotFoundError
            ProviderUnavailableError
            ProviderResponseError
        """
        pass

    def masked_key(self) -> str:
        """Helper to return masked key for safe debugging."""
        return "CONFIGURED" if self.is_configured() else "NOT_CONFIGURED"
