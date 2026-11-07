#!/usr/bin/env python3
"""Warm female neural voice for Axiovo's narrated research tutorial.

Uses local Kokoro ONNX synthesis. No remote TTS request, robotic fallback,
or voice-cloning of the uploaded recording is performed.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import os
import re

VOICE = "af_bella"
VOICE_VERSION = "axiovo-kokoro-bella-v3"
VOICE_ENGINE = "kokoro-onnx"
SPEED = 0.96
MODEL_ROOT = Path(os.environ.get("AXIOVO_VOICE_MODEL_DIR", ".cache/axiovo-voice"))
MODEL = MODEL_ROOT / "kokoro-v1.0.onnx"
VOICES = MODEL_ROOT / "voices-v1.0.bin"

# Phonetic spellings are used only for speech synthesis; captions keep the
# correct scientific spellings.
REPLACEMENTS = (
    (r"\bAxiovo\b", "Ax-ee-oh-vo"),
    (r"\bbioRxiv\b", "bio archive"),
    (r"\bChemRxiv\b", "chem archive"),
    (r"\barXiv\b", "archive"),
    (r"\bIACR\b", "I A C R"),
    (r"\bDOI\b", "D O I"),
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

@lru_cache(maxsize=1)
def model():
    if not MODEL.is_file() or not VOICES.is_file():
        raise FileNotFoundError(
            "Kokoro model files missing. Run scripts/download_tutorial_voice.sh first."
        )
    from kokoro_onnx import Kokoro
    return Kokoro(str(MODEL), str(VOICES))

def render(text: str, output: Path, *, voice: str = VOICE) -> None:
    if voice != VOICE:
        raise ValueError("The tutorial uses one consistent female voice")
    import soundfile as sf
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    sound, sample_rate = model().create(
        voice_text(text), voice=voice, speed=SPEED, lang="en-us"
    )
    if len(sound) < sample_rate // 2:
        raise ValueError("Generated narration is unexpectedly short")
    sf.write(str(output), sound, sample_rate, subtype="PCM_16")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("text")
    parser.add_argument("output", type=Path)
    parser.add_argument("--voice", default=VOICE)
    args = parser.parse_args()
    render(args.text, args.output, voice=args.voice)
