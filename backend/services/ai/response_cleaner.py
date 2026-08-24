"""
response_cleaner.py - AutoWish AI backend
===========================================
Enterprise Universal AI Response Sanitizer.

Provider-independent sanitizer supporting output from:
- Gemma / Gemini
- DeepSeek (Reasoning / R1 / V3)
- Qwen
- Nemotron
- Llama
- Claude-compatible providers

Strictly Preserves:
- Multi-paragraph layouts, line breaks, and indentation
- Non-Latin Unicode scripts (Malayalam, Hindi, Tamil, Telugu, Kannada, Arabic, Japanese, Chinese, etc.)
- Emojis, symbols, and punctuation
- Personalization, recipient names, and original tone

Removes ONLY:
- Reasoning / thinking tags (<think>, <thought>, <reasoning>, <scratchpad>, <analysis>)
- Markdown fences / code blocks
- Leading reasoning, planning, draft, scratchpad, and language intro blocks
- Surrounding outer quotation marks
"""

import re
from typing import List


# Patterns for reasoning / thinking XML tags across providers
REASONING_TAG_PATTERNS = [
    re.compile(r'<(think|thought|reasoning|scratchpad|analysis|planning)>.*?</\1>', re.DOTALL | re.IGNORECASE),
    re.compile(r'^\s*<(think|thought|reasoning|scratchpad|analysis|planning)>\s*', re.IGNORECASE),
]

# Patterns for single-line or block intro markers before greetings
INTRO_HEADER_PATTERNS = [
    re.compile(r'^(?:Here\s+(?:is|are)\s+(?:the|your)\s+(?:final\s+)?greeting|Here\'s\s+(?:the|your)\s+greeting|(?:[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+greeting)\s*:\s*\n?', re.IGNORECASE),
    re.compile(r'^(?:Greeting\s+Message|Final\s+Wish|Generated\s+Greeting)\s*:\s*\n?', re.IGNORECASE),
]

# Catch-all for all-uppercase or title-case single-word meta labels on their own line
# e.g. "GREETING:", "OUTPUT:", "RESPONSE:", "ANSWER:", "RESULT:"
META_LABEL_PATTERN = re.compile(
    r'^[A-Z][A-Za-z\s]{0,30}:\s*$'
)

# ---------------------------------------------------------------------------
# Paragraph-label patterns — Gemini sometimes returns structural labels like:
#   Paragraph 1:        *Paragraph 2:*       **Paragraph 3:**
# These are pure metadata lines that must never reach the user.
# The pattern matches the label alone (optionally markdown-bold/italic wrapped)
# and requires the line to consist of ONLY that label (possibly with trailing
# colon / whitespace) so we never accidentally strip greeting content.
# ---------------------------------------------------------------------------
PARAGRAPH_LABEL_PATTERN = re.compile(
    r'^\*{0,2}\s*[Pp]aragraph\s*\d+\s*[:]?\s*\*{0,2}$'
)

# ---------------------------------------------------------------------------
# Word-count metadata patterns — match entire lines that are purely a count.
# Safe: numbers that are part of sentences ("Happy 21st birthday!") are NOT
# on their own line and won't match, because we only test stripped lines
# that contain ONLY a count expression.
# ---------------------------------------------------------------------------
WORD_COUNT_LINE_PATTERNS = [
    # (19 words)  /  [19 words]  /  {19 words}
    re.compile(r'^[\(\[\{]?\s*\d+\s*/\s*\d+\s+words\s*[\)\]\}]?$', re.IGNORECASE),
    re.compile(r'^[\(\[\{]?\s*approximately\s+\d+\s+words\s*[\)\]\}]?$', re.IGNORECASE),
    re.compile(r'^[\(\[\{]?\s*\d+\s+words?\s*[\)\]\}]?$', re.IGNORECASE),
    # Word count: 43  /  Words: 19  /  Total words: 85
    re.compile(r'^(?:total\s+)?words?\s*(?:count)?\s*:\s*\d+$', re.IGNORECASE),
    re.compile(r'^word\s+count\s*:\s*\d+$', re.IGNORECASE),
    # Trailing fragments like ".../19 words)" or "/ 120 words)"
    re.compile(r'^[./\s]*\d+\s*words?[\)\]\}]?$', re.IGNORECASE),
]

# Common reasoning block prefixes across providers (lowercased for startswith matching)
REASONING_PREFIXES = (
    # Sentence and line labels
    "sentence ",
    "sentence 1",
    "sentence 2",
    "sentence 3",
    "sentence 4",
    "sentence 5",
    "count",
    "count:",
    "count words",
    "word count",
    "let's count",
    "lets count",
    "reasoning",
    "analysis",
    "thought",
    "thoughts",
    "step",
    "step 1",
    "step 2",
    "step 3",
    "instruction",
    "instructions",
    "prompt",
    "internal notes",
    "notes:",
    "xml",
    "json",
    "markdown",
    # Intent / planning
    "the user wants",
    "the user asked",
    "the user now says",
    "we need to",
    "we previously generated",
    "let's craft",
    "lets craft",
    "let's decide",
    "lets decide",
    "let me write",
    "let me craft",
    "let me think",
    "let me create",
    "i'll write",
    "i will write",
    "i need to",
    "i should",
    # Thinking / analysis labels
    "thinking",
    "thinking:",
    # Process labels
    "draft",
    "scratchpad",
    # Response / output labels
    "here is a",
    "here's a",
    "here is the",
    "here's the",
    "my response:",
    "final answer:",
    "output:",
    "result:",
    "translation:",
    # Conversational filler
    "sure,",
    "certainly,",
    "of course,",
    "note:",
    # Language intro headers
    "english greeting",
    "malayalam greeting",
    "hindi greeting",
    "tamil greeting",
    "french greeting",
    "spanish greeting",
    "german greeting",
    "arabic greeting",
    "chinese greeting",
    "japanese greeting",
    "kannada greeting",
    "telugu greeting",
    # "greeting in <language>" patterns
    "greeting in",
    "in english:",
    "in hindi:",
    "in tamil:",
    "in malayalam:",
    "in kannada:",
    "in telugu:",
    "in arabic:",
    "in french:",
    "in spanish:",
    "in german:",
    "in chinese:",
    "in japanese:",
)


# Patterns that indicate the AI returned template/placeholder text instead of a real greeting
TEMPLATE_PLACEHOLDER_PATTERNS = [
    re.compile(r'^[A-Z][a-z]+\s*\+\s*[A-Z][a-zA-Z]*', re.IGNORECASE),  # "Greeting + Name"
    re.compile(r'^(Greeting|Closing|Sentence\s*\d+|Template|Placeholder|Prompt|Instruction|Count|Reasoning|Analysis)\s*[:.]?\s*$', re.IGNORECASE),
    re.compile(r'^(Greeting|Closing|Sentence\s*\d+|Template|Placeholder|Prompt|Instruction|Count|Reasoning|Analysis)\s*[:.]', re.IGNORECASE),
    re.compile(r'\bGreeting\s*\+\s*\w+', re.IGNORECASE),
    re.compile(r'\bClosing\b', re.IGNORECASE),
    re.compile(r'\bSentence\s+\d+\b', re.IGNORECASE),
    re.compile(r'\bTemplate\b', re.IGNORECASE),
    re.compile(r'\bPlaceholder\b', re.IGNORECASE),
    re.compile(r'\bPrompt\b', re.IGNORECASE),
    re.compile(r'\bInstruction\b', re.IGNORECASE),
    re.compile(r'\bCount\b', re.IGNORECASE),
    re.compile(r'\bReasoning\b', re.IGNORECASE),
    re.compile(r'\bAnalysis\b', re.IGNORECASE),
    # Template wish phrases like "Romantic wish for festival", "Funny wish for birthday", etc.
    re.compile(r'\b(?:Romantic|Funny|Professional|Emotional|Warm|Friendly|Formal|Inspirational|Casual)\s+wish\s+for\s+\w+', re.IGNORECASE),
    re.compile(r'\b(?:Romantic|Funny|Professional|Emotional|Warm|Friendly|Formal|Inspirational|Casual)\s+wish\b', re.IGNORECASE),
]

def contains_template_text(text: str) -> bool:
    """
    Detect if the AI response contains template/placeholder text
    instead of an actual greeting.
    """
    if not text:
        return False
    lines = text.strip().split('\n')
    # Check if the entire response is just a few short template-like lines
    non_empty_lines = [l.strip() for l in lines if l.strip()]
    if len(non_empty_lines) <= 3:
        for line in non_empty_lines:
            for pattern in TEMPLATE_PLACEHOLDER_PATTERNS:
                if pattern.match(line.strip()):
                    return True
    # Also check for single-line template patterns
    text_stripped = text.strip()
    for pattern in TEMPLATE_PLACEHOLDER_PATTERNS:
        if pattern.search(text_stripped):
            return True
    return False


def clean_ai_response(text: str) -> str:
    """
    Sanitize raw AI completion into clean greeting text.

    Args:
        text: Raw text string received from AI completion.

    Returns:
        Cleaned greeting string.
    """
    if not text:
        return ""

    cleaned = text.strip()

    # 1. Remove reasoning / thinking tags (<think>...</think>, etc.)
    for pattern in REASONING_TAG_PATTERNS:
        cleaned = pattern.sub('', cleaned)

    cleaned = cleaned.strip()

    # 2. Extract content from markdown code fences if wrapped
    code_block_match = re.search(r'```(?:markdown|text)?\s*\n?(.*?)\n?```', cleaned, re.DOTALL | re.IGNORECASE)
    if code_block_match:
        extracted = code_block_match.group(1).strip()
        if extracted:
            cleaned = extracted

    # 3. Process line by line to remove leading reasoning / intros without altering greeting formatting
    lines = cleaned.split('\n')
    filtered_lines: List[str] = []
    found_greeting_start = False

    for line in lines:
        stripped_line = line.strip()

        if not stripped_line:
            if found_greeting_start:
                # Retain original empty lines within greeting paragraphs
                filtered_lines.append(line)
            continue

        line_lower = stripped_line.lower()

        # Remove markdown heading markers (# ## ###)
        if stripped_line.startswith('#'):
            stripped_line = re.sub(r'^#+\s*', '', stripped_line).strip()
            line_lower = stripped_line.lower()

        # Remove line if it's purely a word count comment (e.g. "That's 8 words...")
        if re.match(r'^that\'?s\s+\d+\s+words.*', line_lower):
            continue

        # Remove leading sentence labels like "Sentence 1:", "Sentence 2:", "1.", "2."
        stripped_line = re.sub(r'^(?:Sentence\s*\d+|Line\s*\d+|\d+\.)\s*:\s*', '', stripped_line, flags=re.IGNORECASE).strip()
        stripped_line = re.sub(r'^\d+\.\s*', '', stripped_line).strip()
        line_lower = stripped_line.lower()

        is_reasoning = any(line_lower.startswith(prefix) for prefix in REASONING_PREFIXES)

        # Check for metadata bullet points or numbered labels
        if not is_reasoning and (line_lower.startswith("- ") or line_lower.startswith("* ") or re.match(r'^\d+\.\s', line_lower)):
            if any(k in line_lower for k in ["tone:", "recipient:", "occasion:", "language:", "word count", "count words", "rules:", "step", "sentence", "count"]):
                is_reasoning = True

        # Check for intro headers or labels ending in colon
        if not is_reasoning and line_lower.endswith(":"):
            if any(k in line_lower for k in ["greeting", "message", "wish", "thinking", "analysis", "draft", "output", "result", "response", "answer", "translation", "count", "sentence", "reasoning", "thought"]):
                is_reasoning = True

        # Check for all-uppercase / title-case meta labels on their own line
        if not is_reasoning and META_LABEL_PATTERN.match(stripped_line):
            is_reasoning = True

        if is_reasoning:
            continue

        if not found_greeting_start:
            found_greeting_start = True
        filtered_lines.append(stripped_line)

    if filtered_lines:
        cleaned = "\n".join(filtered_lines).strip()
    else:
        cleaned = text.strip()

    # 3a. Remove paragraph-label lines anywhere in the text (Gemini structural metadata).
    #     These can appear mid-text, so we must scan the whole cleaned string again.
    #     We preserve surrounding blank lines so paragraph structure is intact after
    #     label removal — consecutive blank lines are collapsed in step 3b.
    label_filtered: List[str] = []
    for line in cleaned.split('\n'):
        stripped = line.strip()
        if PARAGRAPH_LABEL_PATTERN.match(stripped):
            continue  # drop "Paragraph N:" / "*Paragraph N:*" / "**Paragraph N:**"
        label_filtered.append(line)
    cleaned = "\n".join(label_filtered)

    # 3b. Remove lines that are purely word-count metadata, anywhere in the text.
    count_filtered: List[str] = []
    for line in cleaned.split('\n'):
        stripped = line.strip()
        if stripped and any(p.match(stripped) for p in WORD_COUNT_LINE_PATTERNS):
            continue  # drop "(19 words)", "Word count: 43", etc.
        count_filtered.append(line)
    cleaned = "\n".join(count_filtered)

    # 3c. Collapse runs of 3+ consecutive blank lines down to exactly 2
    #     (i.e. one blank line between paragraphs) without destroying real paragraph breaks.
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()

    # 4. Remove leading intro patterns from single lines
    for pattern in INTRO_HEADER_PATTERNS:
        cleaned = pattern.sub('', cleaned).strip()

    # 5. Strip outer quotation marks only (double, single, smart quotes)
    quote_pairs = [
        ('"', '"'),
        ("'", "'"),
        ('\u201c', '\u201d'),
        ('\u2018', '\u2019'),
        ('\u00ab', '\u00bb'),
    ]
    for open_q, close_q in quote_pairs:
        if cleaned.startswith(open_q) and cleaned.endswith(close_q) and len(cleaned) >= 2:
            inner = cleaned[len(open_q):-len(close_q)].strip()
            if inner:
                cleaned = inner
                break

    return cleaned.strip()
