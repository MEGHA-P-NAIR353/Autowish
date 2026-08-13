"""
Comprehensive unit tests for response_cleaner (clean_ai_response) and OpenRouter pipeline.
Tests English, Malayalam, Hindi, Tamil, Festival, Romantic, Formal, Funny, Quoted, and Reasoning.
"""

import unittest
from services.ai.response_cleaner import clean_ai_response, contains_template_text
from services.ai.openrouter_service import OpenRouterService


class TestResponseCleaner(unittest.TestCase):

    def test_already_clean_english(self):
        """Clean English wish should remain unchanged."""
        raw = "Happy Birthday, Sarah! 🎂 Wishing you a wonderful day filled with happiness and success!"
        self.assertEqual(clean_ai_response(raw), raw)

    def test_already_clean_malayalam(self):
        """Clean Malayalam wish should preserve all non-ASCII characters & emojis."""
        raw = "ജന്മദിനാശംസകൾ, സറ! 🎂 നിങ്ങളുടെ ഈ പ്രത്യേക ദിവസം സന്തോഷവും സമാധാനവും നിറഞ്ഞതാകട്ടെ."
        self.assertEqual(clean_ai_response(raw), raw)

    def test_already_clean_hindi(self):
        """Clean Hindi wish should preserve all Devanagari characters & formatting."""
        raw = "जन्मदिन की हार्दिक शुभकामनाएं, सारा! 🎈 ईश्वर आपको हमेशा स्वस्थ और खुश रखे।"
        self.assertEqual(clean_ai_response(raw), raw)

    def test_already_clean_tamil(self):
        """Clean Tamil wish should preserve Tamil script and emojis."""
        raw = "இனிய பிறந்தநாள் வாழ்த்துகள், கார்த்திக்! 💐 உங்கள் வாழ்வில் எல்லாரும் மகிழ்ச்சியாக இருக்க வாழ்த்துகிறேன்."
        self.assertEqual(clean_ai_response(raw), raw)

    def test_festival_greeting(self):
        """Festival wish formatting should remain intact."""
        raw = "Happy Diwali, Ananya! 🪔 May the festival of lights bring prosperity, health, and joy to your family!"
        self.assertEqual(clean_ai_response(raw), raw)

    def test_romantic_greeting(self):
        """Romantic wish should retain tone and quotes within greeting."""
        raw = "Happy Anniversary, my love! ❤️ You make every single day feel magical. Here's to forever!"
        self.assertEqual(clean_ai_response(raw), raw)

    def test_formal_greeting(self):
        """Formal greeting should preserve professional tone and spacing."""
        raw = "Dear Mr. Sharma,\n\nWishing you a very Happy Birthday! We greatly appreciate your leadership and vision."
        self.assertEqual(clean_ai_response(raw), raw)

    def test_funny_greeting(self):
        """Funny greeting should preserve humor and emojis."""
        raw = "Happy Birthday, Vikram! 🎉 Don't count the candles, just enjoy the cake! You're not old, you're classic! 🎂"
        self.assertEqual(clean_ai_response(raw), raw)

    def test_reasoning_model_output_english(self):
        """Reasoning model output with scratchpad and intro text should be stripped."""
        raw = (
            "The user wants a warm birthday greeting for Rahul.\n"
            "We need to keep the tone friendly and engaging.\n"
            "Let me write a personalized message.\n"
            "Count words: 35.\n\n"
            "Happy Birthday, Rahul! 🎉 May your day be filled with warm smiles and unforgettable moments!"
        )
        self.assertEqual(clean_ai_response(raw), "Happy Birthday, Rahul! 🎉 May your day be filled with warm smiles and unforgettable moments!")

    def test_reasoning_model_output_malayalam_with_intro(self):
        """Reasoning and language description preceding Malayalam wish should be removed."""
        raw = (
            "Thinking:\n"
            "Step 1: Translate requirements to Malayalam.\n"
            "Step 2: Construct friendly birthday wish.\n\n"
            "Malayalam greeting:\n"
            "പ്രിയപ്പെട്ട രാഹുൽ, ജന്മദിനാശംസകൾ! 🌺 നിന്റെ ജീവിതത്തിൽ എല്ലാ ആഗ്രഹങ്ങളും സഫലമാകട്ടെ."
        )
        self.assertEqual(clean_ai_response(raw), "പ്രിയപ്പെട്ട രാഹുൽ, ജന്മദിനാശംസകൾ! 🌺 നിന്റെ ജീവിതത്തിൽ എല്ലാ ആഗ്രഹങ്ങളും സഫലമാകട്ടെ.")

    def test_reasoning_model_output_hindi_with_intro(self):
        """Language description header preceding Hindi wish should be removed."""
        raw = (
            "Here is the greeting:\n"
            "Hindi greeting:\n"
            "प्रिय मित्र, आपको जन्मदिन की बहुत-बहुत बधाई! ✨ आपका आने वाला वर्ष सफलताओं से भरा हो।"
        )
        self.assertEqual(clean_ai_response(raw), "प्रिय मित्र, आपको जन्मदिन की बहुत-बहुत बधाई! ✨ आपका आने वाला वर्ष सफलताओं से भरा हो।")

    def test_quoted_output_double_quotes(self):
        """Surrounding double quotes should be removed."""
        raw = '"Happy Anniversary, Maya and Rohan! Wishing you endless love and happiness together. 💕"'
        self.assertEqual(clean_ai_response(raw), "Happy Anniversary, Maya and Rohan! Wishing you endless love and happiness together. 💕")

    def test_xml_think_tags(self):
        """XML reasoning tags should be completely removed."""
        raw = "<think>Drafting birthday message for Priya...\nChecking word count...</think>Happy Birthday, Priya! 🌸 Wish you all the best!"
        self.assertEqual(clean_ai_response(raw), "Happy Birthday, Priya! 🌸 Wish you all the best!")

    def test_validation_logic(self):
        """Validation logic in OpenRouterService."""
        self.assertTrue(OpenRouterService._validate_response("Happy Birthday, Rahul! Wish you a great day ahead! 🎉"))
        self.assertFalse(OpenRouterService._validate_response("Thinking: craft message..."))
        self.assertFalse(OpenRouterService._validate_response("Short"))


    def test_new_reasoning_patterns(self):
        """All newly added reasoning patterns should be stripped before the greeting."""
        cases = [
            # we previously generated
            (
                "We previously generated a birthday wish.\nGreeting in Malayalam:\nജന്മദിനാശംസകൾ, ജോൺ! 🎂 നിങ്ങൾക്ക് ഒരു മഹത്തായ ദിവസം ആശംസിക്കുന്നു.",
                "ജന്മദിനാശംസകൾ, ജോൺ! 🎂 നിങ്ങൾക്ക് ഒരു മഹത്തായ ദിവസം ആശംസിക്കുന്നു.",
            ),
            # let's decide + output:
            (
                "Let's decide the tone: warm.\nOutput:\nHappy Birthday, Alex! Wishing you a fantastic day full of laughter! 🎉",
                "Happy Birthday, Alex! Wishing you a fantastic day full of laughter! 🎉",
            ),
            # translation: prefix
            (
                "Translation:\nइस अवसर पर आपको जन्मदिन की हार्दिक बधाई! ✨ आपका जीवन खुशियों से भरा हो।",
                "इस अवसर पर आपको जन्मदिन की हार्दिक बधाई! ✨ आपका जीवन खुशियों से भरा हो।",
            ),
            # i'll write pattern
            (
                "I'll write a Tamil greeting for Karthik.\nஇனிய பிறந்தநாள் வாழ்த்துகள், கார்த்திக்! 💐 உங்கள் வாழ்வில் மகிழ்ச்சி நிறைந்திருக்கட்டும்.",
                "இனிய பிறந்தநாள் வாழ்த்துகள், கார்த்திக்! 💐 உங்கள் வாழ்வில் மகிழ்ச்சி நிறைந்திருக்கட்டும்.",
            ),
        ]
        for raw, expected in cases:
            with self.subTest(raw=raw[:60]):
                self.assertEqual(clean_ai_response(raw), expected)

    def test_ai_validation_error_raised_on_reasoning_content(self):
        """_validate_response should reject text containing reasoning keywords."""
        reasoning_samples = [
            "The user wants a birthday wish for John.",
            "We need to craft a warm message.",
            "We previously generated a message.",
            "Let me think about this...",
            "Output: Happy Birthday!",
            "Translation: Here is your wish.",
            "Greeting in English: Have a great day!",
        ]
        for sample in reasoning_samples:
            with self.subTest(sample=sample):
                self.assertFalse(
                    OpenRouterService._validate_response(sample),
                    f"Expected validation to FAIL for: {sample!r}",
                )

    def test_ai_validation_error_class(self):
        """AIValidationError must carry retry=True in its dict payload."""
        from services.ai.openrouter_service import AIValidationError
        err = AIValidationError(reason="reasoning_detected")
        payload = err.to_dict()
        self.assertTrue(payload.get("retry"))
        self.assertEqual(payload.get("reason"), "reasoning_detected")
        self.assertIn("error", payload)

    # ── Template / Placeholder Detection Tests ──────────────────

    def test_contains_template_text_greeting_plus_name(self):
        """'Greeting + Name' should be detected as template text."""
        self.assertTrue(contains_template_text("Greeting + Name"))

    def test_contains_template_text_closing(self):
        """'Closing' alone should be detected as template text."""
        self.assertTrue(contains_template_text("Closing"))

    def test_contains_template_text_sentence_1(self):
        """'Sentence 1' should be detected as template text."""
        self.assertTrue(contains_template_text("Sentence 1"))

    def test_contains_template_text_template(self):
        """'Template' should be detected as template text."""
        self.assertTrue(contains_template_text("Template"))

    def test_contains_template_text_prompt(self):
        """'Prompt' should be detected as template text."""
        self.assertTrue(contains_template_text("Prompt"))

    def test_contains_template_text_instruction(self):
        """'Instruction' should be detected as template text."""
        self.assertTrue(contains_template_text("Instruction"))

    def test_contains_template_text_count(self):
        """'Count' should be detected as template text."""
        self.assertTrue(contains_template_text("Count"))

    def test_contains_template_text_reasoning(self):
        """'Reasoning' should be detected as template text."""
        self.assertTrue(contains_template_text("Reasoning"))

    def test_contains_template_text_analysis(self):
        """'Analysis' should be detected as template text."""
        self.assertTrue(contains_template_text("Analysis"))

    def test_contains_template_text_romantic_wish_for_festival(self):
        """'Romantic wish for festival' should be detected as template text."""
        self.assertTrue(contains_template_text("Romantic wish for festival"))

    def test_contains_template_text_false_positive_greeting(self):
        """A real greeting should NOT be detected as template text."""
        self.assertFalse(contains_template_text("Happy Birthday, Megha! Wishing you endless happiness and success. Have a wonderful celebration!"))

    def test_contains_template_text_false_positive_short_text(self):
        """Short non-template text should not be flagged."""
        self.assertFalse(contains_template_text("Have a great day!"))

    def test_validate_response_rejects_template_greeting_plus_name(self):
        """_validate_response should reject 'Greeting + Name' template text."""
        self.assertFalse(
            OpenRouterService._validate_response("Greeting + Name"),
        )

    def test_validate_response_rejects_template_closing(self):
        """_validate_response should reject 'Closing' template text."""
        self.assertFalse(
            OpenRouterService._validate_response("Closing"),
        )

    def test_validate_response_rejects_template_sentence_1(self):
        """_validate_response should reject 'Sentence 1' template text."""
        self.assertFalse(
            OpenRouterService._validate_response("Sentence 1"),
        )

    def test_validate_response_rejects_template_romantic_wish(self):
        """_validate_response should reject 'Romantic wish for festival' template text."""
        self.assertFalse(
            OpenRouterService._validate_response("Romantic wish for festival"),
        )

    def test_validate_response_accepts_valid_greeting(self):
        """_validate_response should accept a valid, complete greeting."""
        self.assertTrue(
            OpenRouterService._validate_response(
                "My dearest Megha, may this special day be filled with love, beautiful memories, and endless happiness. Wishing you a celebration as wonderful as you are!"
            ),
        )

    def test_validate_response_rejects_placeholder_text(self):
        """_validate_response should reject placeholder/template text."""
        self.assertFalse(
            OpenRouterService._validate_response("Greeting + Name"),
        )


if __name__ == '__main__':
    unittest.main()
