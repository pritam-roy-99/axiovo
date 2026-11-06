#!/usr/bin/env python3
"""Build the illustrated Axiovo tour from its checked-in narration and captions."""
from __future__ import annotations

import argparse
import math
import subprocess
import tempfile
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets"
NARRATION = ROOT / "scripts" / "tour-narration"
WIDTH, HEIGHT, FPS, RATE = 960, 540, 12, 24000
SCENES = [
    ("Axiovo: From knowledge to discovery", "Your research companion for questions, papers and evidence",
     "Namaste, and welcome to Axiovo. Axiovo means from knowledge to discovery. Connect a research question to original papers, inspect the source evidence and save the work that matters.",
     [("Discover", "Find original source records"), ("Verify", "Examine evidence and metadata"), ("Save", "Return to research that matters")]),
    ("Research Desk", "One query across three preprint archives",
     "Search arXiv, bioRxiv, and ChemRxiv from a single research desk.",
     [("arXiv", "Physics, mathematics and computing"), ("bioRxiv", "Biology and life sciences"), ("ChemRxiv", "Chemistry and molecular sciences")]),
    ("Browse every subject", "Find an archive category or refine it with your own terms",
     "Explore the subject directory of each archive. Search by category code, field name, or a subfield you have added.",
     [("Category code", "stat.ML"), ("Subject name", "Cell Biology"), ("Refinement", "Molecular simulation")]),
    ("Check the coverage", "Find papers by topic, author, date range, or identifier",
     "Enter a research question, a paper title, or an identifier. Use the date filters and check coverage separately for each archive.",
     [("Query", "Molecular simulation"), ("Date range", "First submission or posting date"), ("Coverage", "Check each source")]),
    ("Compare the sources", "Read original abstracts and export your shortlist",
     "Open the original record, or add papers to a side-by-side comparison. Read their abstracts and export the citations you need.",
     [("Paper A", "Original abstract and source"), ("Paper B", "Original abstract and source"), ("Shortlist", "Export citations as RIS")]),
    ("Keep track of the work", "Saved searches, reading notes, and a shared library view",
     "Save a search to rerun later, and keep papers from all three archives together in your library. Your searches and notes stay on this device.",
     [("Saved searches", "Rerun your query and filters"), ("My Library", "All three archives"), ("Reading notes", "Private to this device")]),
    ("Read and investigate", "PDF annotation and source-linked research assistance",
     "Open Research Tools for PDF annotation, or use the Research Assistant to investigate a paper. Always follow the evidence back to its source.",
     [("PDF reader", "Read and annotate"), ("Research Assistant", "Inspect source evidence"), ("Original paper", "Verify details at the source")]),
]
# Kokoro phonemes preserve the archive names and the intended Axiovo pronunciation.
PRONUNCIATION = {
    "Axiovo": "ˌæksiˈoʊvoʊ",
    "arXiv": "ˈɑɹkaɪv",
    "bioRxiv": "ˈbaɪoʊ ˌɑɹkaɪv",
    "ChemRxiv": "ˈkɛm ˌɑɹkaɪv",
}


def narration_file(index):
    return NARRATION / f"{index + 1:02d}.opus"


def regenerate_narration(model, voices):
    import re
    from kokoro_onnx import Kokoro

    engine = Kokoro(str(model), str(voices))
    NARRATION.mkdir(parents=True, exist_ok=True)
    pattern = re.compile("(" + "|".join(PRONUNCIATION) + ")")
    for index, (_, _, text, _) in enumerate(SCENES):
        pieces = [PRONUNCIATION.get(part) or engine.tokenizer.phonemize(part, "en-us")
                  for part in pattern.split(text) if part.strip()]
        phonemes = " ".join(pieces)
        for punctuation in (".", ",", "?", "!"):
            phonemes = phonemes.replace(" " + punctuation, punctuation)
        samples, rate = engine.create(phonemes, voice="af_heart", speed=0.94, is_phonemes=True)
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "f32le", "-ar", str(rate),
             "-ac", "1", "-i", "-", "-c:a", "libopus", "-b:a", "36k", "-application", "voip", str(narration_file(index))],
            input=samples.astype("<f4").tobytes(), check=True,
        )
        print(f"Scene {index + 1}: {len(samples) / rate:.2f} seconds", flush=True)


def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/" + name, size)


def draw_frame(index):
    title, subtitle, _, cards = SCENES[index]
    image = Image.new("RGB", (WIDTH, HEIGHT), "#091e33")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((16, 16, 944, 524), radius=20, fill="#102d46", outline="#385973", width=2)
    draw.rounded_rectangle((46, 43, 85, 82), radius=9, fill="#187fae")
    draw.text((55, 46), "A", font=font(25, True), fill="white")
    draw.text((98, 50), "Axiovo", font=font(23, True), fill="#effaff")
    draw.text((748, 54), f"GUIDED TOUR  {index + 1} / {len(SCENES)}", font=font(14, True), fill="#9ecfe4")
    draw.line((47, 102, 914, 102), fill="#40637e", width=1)
    draw.text((47, 132), title, font=font(43, True), fill="#f2f9fd")
    draw.text((49, 195), subtitle, font=font(19), fill="#c5dce9")
    for column, (label, detail) in enumerate(cards):
        x = 47 + column * 292
        draw.rounded_rectangle((x, 252, x + 282, 395), radius=12, fill="#183c58", outline="#456b87", width=1)
        draw.ellipse((x + 16, 271, x + 26, 281), fill=["#6ec1f0", "#6ad6b5", "#c6a5f2"][column])
        draw.text((x + 16, 296), label, font=font(19, True), fill="#f2f9fd")
        draw.text((x + 16, 338), detail, font=font(13), fill="#c7dfef")
    draw.text((47, 489), "Axiovo  ·  Preprint discovery and reading", font=font(14), fill="#b1c9dc")
    return image


def timestamp(seconds):
    ms = round(seconds * 1000)
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}.{ms % 1000:03}"


def compile_tour():
    OUT.mkdir(parents=True, exist_ok=True)
    captions = ["WEBVTT", ""]
    frames, durations = [], []
    elapsed = 0
    with tempfile.TemporaryDirectory() as directory:
        narration = Path(directory) / "narration.wav"
        with wave.open(str(narration), "wb") as audio:
            audio.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
            for index, (_, _, text, _) in enumerate(SCENES):
                samples = subprocess.check_output([
                    "ffmpeg", "-v", "error", "-i", str(narration_file(index)), "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-"
                ])
                speech_seconds = len(samples) / (2 * RATE)
                if speech_seconds < 1.0:
                    raise ValueError(f"Scene {index + 1} is missing narration")
                duration = math.ceil((speech_seconds + 0.85) * FPS)
                audio.writeframes(b"\x00" * (RATE // 4 * 2) + samples)
                padding = duration * RATE // FPS - RATE // 4 - len(samples) // 2
                audio.writeframes(b"\x00" * (padding * 2))
                captions.extend([timestamp(elapsed + 0.25) + " --> " + timestamp(elapsed + 0.25 + speech_seconds), text, ""])
                frames.append(draw_frame(index))
                durations.append(duration)
                elapsed += duration / FPS
        command = [
            "ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}",
            "-r", str(FPS), "-i", "-", "-i", str(narration), "-c:v", "libx264", "-preset", "veryfast",
            "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "80k", "-movflags", "+faststart", str(OUT / "axiovo-tour.mp4"),
        ]
        with subprocess.Popen(command, stdin=subprocess.PIPE) as encoder:
            assert encoder.stdin is not None
            frame_total = sum(durations)
            index = 0
            for scene, duration in zip(frames, durations):
                for _ in range(duration):
                    frame = scene.copy()
                    width = max(1, round(866 * (index + 1) / frame_total))
                    ImageDraw.Draw(frame).rounded_rectangle((47, 445, 47 + width, 451), radius=3, fill="#68cfda")
                    encoder.stdin.write(frame.tobytes())
                    index += 1
            encoder.stdin.close()
            if encoder.wait():
                raise RuntimeError("Axiovo video encoding failed")
    (OUT / "axiovo-tour.vtt").write_text("\n".join(captions), encoding="utf-8")
    print(f"Axiovo tour built: {elapsed:.1f} seconds with narration and captions.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--regenerate-narration", nargs=2, metavar=("MODEL", "VOICES"), type=Path)
    args = parser.parse_args()
    if args.regenerate_narration:
        regenerate_narration(*args.regenerate_narration)
    compile_tour()


if __name__ == "__main__":
    main()
