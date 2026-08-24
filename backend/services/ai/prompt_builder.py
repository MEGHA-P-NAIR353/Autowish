"""
services/ai/prompt_builder.py - Centralized Prompt Construction
=============================================================
Constructs minimal, high-quality, language-enforced prompts for AI providers.
Preserves multilingual mapping and card-specific formatting.
"""

from typing import Optional, List, Union, Dict

# Strict language code to name mapping
LANGUAGE_MAP: Dict[str, str] = {
    'en': 'English',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'ml': 'Malayalam',
    'te': 'Telugu',
    'kn': 'Kannada',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ar': 'Arabic',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
}


def build_greeting_prompt(
    recipient_name: str,
    occasion: str = 'Birthday',
    tone: str = 'Friendly',
    language: str = 'en',
    relationship: str = 'Friend',
    age: Optional[int] = None,
    interests: Optional[Union[List[str], str]] = None,
    custom_context: Optional[str] = None,
) -> str:
    """
    Build a concise, structured prompt containing only the essential recipient information.
    Avoids unnecessary instructions in the user message so models focus on the task.
    """
    lang_name = LANGUAGE_MAP.get(language, 'English')

    prompt_parts = [
        f"Recipient Name: {recipient_name}",
        f"Occasion: {occasion}",
        f"Tone: {tone}",
        f"Language: {lang_name}",
        f"Relationship: {relationship}",
    ]

    if age:
        prompt_parts.append(f"Age: {age}")

    if interests:
        interests_str = ", ".join(interests) if isinstance(interests, list) else str(interests)
        if interests_str.strip():
            prompt_parts.append(f"Interests: {interests_str.strip()}")

    if custom_context and custom_context.strip():
        prompt_parts.append(f"Context: {custom_context.strip()}")

    return "\n".join(prompt_parts)


def build_system_prompt(
    recipient_name: str,
    occasion: str = 'Birthday',
    tone: str = 'Friendly',
    language: str = 'en',
    mode: str = 'standard',
) -> str:
    """
    Build system instructions tailored to the mode (standard greeting vs greeting card).
    Strictly instructs models to output ONLY the final greeting text in the target language.
    """
    lang_name = LANGUAGE_MAP.get(language, 'English')

    if mode == 'card':
        return (
            f"You are an expert, native {lang_name} greeting card writer. "
            f"Write ONLY in {lang_name}. Never mix languages. "
            f"Generate a concise, heartfelt greeting card message for {recipient_name} "
            f"on the occasion of {occasion} in a {tone.lower()} tone.\n"
            f"LENGTH & STRUCTURE:\n"
            f"- Write 3 to 4 short sentences (approximately 35 to 60 words total).\n"
            f"- Include a warm greeting addressing {recipient_name}, an occasion-specific wish, and a complete warm closing sentence.\n"
            f"STRICT OUTPUT RULES:\n"
            f"- The final response must contain ONLY the greeting message itself.\n"
            f"- Do NOT include template text, placeholder variables, or sentence labels.\n"
            f"- Do NOT explain your reasoning or show your thoughts.\n"
            f"- Do not include headers, signatures, or notes.\n"
            f"- The very first character MUST be the first letter of the greeting.\n"
            f"- The very last character MUST be a final punctuation mark (. ! ? or emoji)."
        )

    return (
        f"You are generating the final user-facing greeting for {recipient_name}. "
        f"Your response will be displayed directly to the recipient without any modification. "
        f"Write a complete, highly personalized, {tone.lower()} greeting for {recipient_name} "
        f"on the occasion of {occasion}. "
        f"Write ONLY in {lang_name}. Never mix English with non-English languages.\n\n"
        f"Format: Write 2 to 3 natural paragraphs separated by a single blank line. "
        f"Each paragraph should be 1 to 2 sentences. "
        f"Total length: 60 to 120 words. "
        f"Address {recipient_name} directly by name.\n\n"
        f"You MUST NOT include any of the following in your response:\n"
        f"- Paragraph labels (e.g. 'Paragraph 1:', '*Paragraph 2:*', '**Paragraph 3:**', or any similar label)\n"
        f"- Word counts (e.g. '19 words', '(19 words)', 'Word count: 43', '19/120 words', or any similar count)\n"
        f"- Headings or section titles\n"
        f"- Numbered lists or bullet points\n"
        f"- Markdown formatting (no *, **, #, _, ~~)\n"
        f"- HTML or XML tags\n"
        f"- Reasoning, analysis, planning, or internal notes\n"
        f"- Meta-commentary such as 'Here is your greeting', 'Sure!', 'Generated greeting:', or any explanation\n"
        f"- Instructions, prompt text, or any content other than the greeting itself\n\n"
        f"The very first character of your response must be the first character of the greeting. "
        f"The very last character must be the final punctuation mark (period, exclamation mark, question mark, or emoji). "
        f"Do not describe how the response is structured. Do not mention the number of words. "
        f"Do not output your instructions. Do not output internal reasoning."
    )
