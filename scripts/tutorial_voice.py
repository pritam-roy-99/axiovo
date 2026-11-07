#!/usr/bin/env python3
"""Natural female narration for Axiovo's recorded research tutorial.

Keep names in the captions unchanged. Only the spoken text is adjusted to
avoid the neural synthesizer spelling technical acronyms incorrectly.
Never silently replace natural female speech with robotic eSpeak.
"""
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path
import re
import time

VOICE = "en-US-JennyNeural"
VOICE_ALTERNATIVE = "en-IN-NeerjaNeural"
VOICE_VERSION = "axiovo-female-neural-v2"
RATE = "-4%"
PITCH = "+0Hz"

_REPLACEMENTS = (
    (r"\bAxiovo\b", "Ax-ee-oh-voh"),
    (r"\bbioRxiv\b", "bio archive"),
    (r"\bChemRxiv\b", "chem archive"),
    (r"\barXiv\b", "archive"),
    (r"\bCryptology ePrint\b", "Cryptology e-print"),
    (r"\bee print\b", "e-print"),
    (r"\bDOI\b", "D O I"),
    (r"\bIACR\b", "I A C R"),
    (r"\bOllama\b", "oh llama"),
    (r"\bQwen\b", "Q wen"),
    (r"\bKimi\b", "Kee mee"),
    (r"\bOpenRouter\b", "Open Router"),
    (r"\bWebGPU\b", "Web G P U"),
)

def voice_text(text: str) -> str:
    if not isinstance(text, str) or not text.strip():
        raise ValueError("The narration cannot be empty")
    for pattern, spoken in _REPLACEMENTS:
        text = re.sub(pattern, spoken, text, flags=re.IGNORECASE)
    return text

async def synthesize(text: str, output: Path, *, voice: str = VOICE) -> None:
    import edge_tts
    await edge_tts.Communicate(
        voice_text(text), voice=voice, rate=RATE, pitch=PITCH
    ).save(str(output))
    if not output.is_file() or output.stat().st_size < 1000:
        raise RuntimeError("Neural narration is empty")

def render(text: str, output: Path, *, voice: str = VOICE, attempts: int = 3) -> None:
    """Retry recoverable network/voice failures, without downgrading quality."""
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            output.unlink(missing_ok=True)
            asyncio.run(synthesize(text, output, voice=voice))
            return
        except Exception as exc:
            last_error = exc
            output.unlink(missing_ok=True)
            if attempt < attempts:
                time.sleep(min(attempt * 2, 5))
    raise RuntimeError(
        f"{voice} narration could not be generated after {attempts} attempts. "
        "Refusing to replace the tutorial with robotic speech."
    ) from last_error

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("text")
    parser.add_argument("output", type=Path)
    parser.add_argument("--voice", default=VOICE, choices=(VOICE, VOICE_ALTERNATIVE))
    args = parser.parse_args()
    render(args.text, args.output, voice=args.voice)

if __name__ == "__main__":
    main()
