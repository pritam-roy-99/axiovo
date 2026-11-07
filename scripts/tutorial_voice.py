#!/usr/bin/env python3
"""Render the Indian-English narration used in Axiovo's tutorial."""
from __future__ import annotations

import asyncio
from pathlib import Path
import re
import subprocess
import tempfile

VOICE = "en-IN-NeerjaNeural"
VOICE_VERSION = "axiovo-neerja-v1"
VOICE_ENGINE = "edge-tts"
VOICE_LOCALE = "en-IN"
RATE = "-3%"
PITCH = "-5Hz"

# Phonetic spellings are used only for speech synthesis; captions keep the
# correct scientific spellings.
REPLACEMENTS = (
    (r"\bbioRxiv\b", "bio archive"),
    (r"\bChemRxiv\b", "Kemm archive"),
    (r"\barXiv\b", "archive"),
    (r"\bDOI\b", "D. O. I."),
    (r"\bGPU\b", "G P U"),
    (r"\bWebGPU\b", "Web G P U"),
    (r"\bOllama\b", "Oh llama"),
    (r"\bQwen\b", "Q wen"),
    (r"\bKimi\b", "Kee mee"),
    (r"\bePrint\b", "e-print"),
)

def voice_text(value: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Spoken text must be nonempty")
    value = " ".join(value.split())
    for pattern, replacement in REPLACEMENTS:
        value = re.sub(pattern, replacement, value, flags=re.I)
    return value

def render(text: str, output: Path, *, voice: str = VOICE) -> None:
    if voice != VOICE:
        raise ValueError("The tutorial uses one consistent female voice")
    import edge_tts

    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="axiovo-speech-") as directory:
        speech = Path(directory) / "speech.mp3"
        audio = edge_tts.Communicate(
            voice_text(text), voice=voice, rate=RATE, pitch=PITCH,
            connect_timeout=12, receive_timeout=30,
        )
        asyncio.run(audio.save(str(speech)))
        subprocess.run([
            "ffmpeg", "-y", "-v", "error", "-i", str(speech), "-ar", "24000",
            "-ac", "1", "-c:a", "pcm_s16le", str(output),
        ], check=True)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("text")
    parser.add_argument("output", type=Path)
    parser.add_argument("--voice", default=VOICE)
    args = parser.parse_args()
    render(args.text, args.output, voice=args.voice)
