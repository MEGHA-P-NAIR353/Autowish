"""
Unit tests for OpenRouter AI Service response cleaning and generation logic.
"""

import unittest
from services.ai.openrouter_service import clean_response


class TestOpenRouterResponseCleaning(unittest.TestCase):

    def test_clean_response_unmodified(self):
        """Clean greeting without any reasoning should remain unchanged."""
        raw = "Happy Birthday, Sarah! 🎂 Wishing you a day filled with laughter and love."
        cleaned = clean_response(raw)
        self.assertEqual(cleaned, raw)

    def test_clean_response_xml_think_tags(self):
        """Should strip <think>...</think> tags entirely."""
        raw = "<think>The user wants a warm birthday greeting for Sarah.\nWe need to keep it under 50 words.</think>Happy Birthday, Sarah! 🎂 Wishing you a day filled with joy."
        cleaned = clean_response(raw)
        self.assertEqual(cleaned, "Happy Birthday, Sarah! 🎂 Wishing you a day filled with joy.")

    def test_clean_response_leading_reasoning_paragraphs(self):
        """Should detect and discard leading paragraphs containing reasoning indicators."""
        raw = (
            "The user wants a birthday message for John.\n"
            "We need to write in a friendly tone.\n"
            "Let's craft a nice wish and count words.\n\n"
            "Happy Birthday, John! May your year ahead be full of achievements and Happiness! 🎉"
        )
        cleaned = clean_response(raw)
        self.assertEqual(cleaned, "Happy Birthday, John! May your year ahead be full of achievements and Happiness! 🎉")

    def test_clean_response_bullet_point_reasoning(self):
        """Should discard reasoning bullet points."""
        raw = (
            "- Recipient: Alex\n"
            "- Tone: Warm\n"
            "- Occasion: Anniversary\n"
            "- Word count: 30\n\n"
            "Happy Anniversary, Alex! Wishing you both a lifetime of love and happiness."
        )
        cleaned = clean_response(raw)
        self.assertEqual(cleaned, "Happy Anniversary, Alex! Wishing you both a lifetime of love and happiness.")

    def test_clean_response_quoted_greeting(self):
        """Should remove outer quotes around the final greeting."""
        raw = '"Happy Birthday, Maya! Have an extraordinary day filled with cheer! 🎈"'
        cleaned = clean_response(raw)
        self.assertEqual(cleaned, "Happy Birthday, Maya! Have an extraordinary day filled with cheer! 🎈")

    test_clean_response_smart_quoted_greeting = lambda self: self.assertEqual(
        clean_response("“Wishing you a wonderful year ahead, David! Happy Birthday! 🎉”"),
        "Wishing you a wonderful year ahead, David! Happy Birthday! 🎉"
    )

    def test_clean_response_markdown_code_block(self):
        """Should unwrap markdown code blocks if present."""
        raw = "```text\nHappy Birthday, Emma! May all your dreams come true today! 🌟\n```"
        cleaned = clean_response(raw)
        self.assertEqual(cleaned, "Happy Birthday, Emma! May all your dreams come true today! 🌟")

    def test_clean_response_multi_paragraph_greeting_preserved(self):
        """Should preserve multi-paragraph greetings while discarding leading reasoning."""
        raw = (
            "Thinking process:\nStep 1: Analyze user input.\nStep 2: Generate birthday wish.\n\n"
            "Dear Rahul,\n\n"
            "Happy Birthday! Wishing you good health, prosperity, and great success in all your endeavors.\n\n"
            "May this year bring endless possibilities and joy to your life. Cheers to you!"
        )
        cleaned = clean_response(raw)
        expected = (
            "Dear Rahul,\n\n"
            "Happy Birthday! Wishing you good health, prosperity, and great success in all your endeavors.\n\n"
            "May this year bring endless possibilities and joy to your life. Cheers to you!"
        )
        self.assertEqual(cleaned, expected)


if __name__ == '__main__':
    unittest.main()
