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
    Strictly instructs models to produce a concise, complete personalized greeting in the target language.
    """
    lang_name = LANGUAGE_MAP.get(language, 'English')

    if mode == 'card':
        return (
            f"You are an expert, native {lang_name} greeting card writer. "
            f"Write ONLY in {lang_name}. Never mix languages. "
            f"Generate one complete, concise, heartfelt greeting card message for {recipient_name} "
            f"on the occasion of {occasion} in a {tone.lower()} tone.\n\n"
            f"LENGTH & STRUCTURE RULES:\n"
            f"- Generate exactly ONE complete greeting message.\n"
            f"- Keep the message concise (target approximately 30 to 50 words total).\n"
            f"- Include a warm opening addressing {recipient_name}, an occasion wish, and a warm closing.\n"
            f"- Always complete the final sentence. Never leave a sentence unfinished or cut off.\n\n"
            f"STRICT OUTPUT RULES:\n"
            f"- Return ONLY the final greeting text itself without explanations, titles, or word counts.\n"
            f"- Do NOT include template text, placeholder variables, or sentence labels.\n"
            f"- Do NOT explain your reasoning or show internal thoughts.\n"
            f"- Do not include markdown headers or commentary."
        )

    return (
        f"You are an expert, native {lang_name} greeting writer generating a complete personalized greeting for {recipient_name} "
        f"on the occasion of {occasion} in a {tone.lower()} tone.\n"
        f"Write ONLY in {lang_name}. Never mix languages.\n\n"
        f"CORE GENERATION RULES:\n"
        f"1. Generate exactly ONE complete, personalized greeting.\n"
        f"2. Keep the greeting concise: target approximately 40 to 80 words total.\n"
        f"3. Write 1 to 2 short, natural paragraphs.\n"
        f"4. Always finish every sentence completely. Never leave any sentence or thought unfinished.\n"
        f"5. Address {recipient_name} naturally.\n\n"
        f"STRICT EXCLUSION RULES:\n"
        f"- Do NOT output paragraph labels (e.g. 'Paragraph 1:').\n"
        f"- Do NOT output word counts or count estimates (e.g. '(45 words)').\n"
        f"- Do NOT output reasoning, analysis, planning, translation titles, or draft notes.\n"
        f"- Do NOT output conversational filler like 'Here is your greeting:' or 'Sure!'.\n"
        f"- Return ONLY the final greeting content."
    )

