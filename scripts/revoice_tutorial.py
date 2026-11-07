#!/usr/bin/env python3
"""Re-narrate Axiovo's real tutorial frames with a warm female neural voice.

Preserves the 32 recorded on-screen scenes by taking one frame from each
existing chapter, but lets each scene last as long as natural speech requires.
Updates the MP4, captions, and chapter timings together, atomically.
"""
from __future__ import annotations

from hashlib import file_digest
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

from tutorial_voice import VOICE, VOICE_ENGINE, VOICE_LOCALE, VOICE_VERSION, render

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"
VIDEO = ASSETS / "axiovo-tour.mp4"
CAPTIONS = ASSETS / "axiovo-tour.vtt"
MANIFEST = ASSETS / "axiovo-tour-build.json"

def run(*args: str) -> None:
    subprocess.run(args, check=True)

def duration(path: Path) -> float:
    return float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path),
    ], text=True).strip())

def timestamp(seconds: float) -> str:
    millis = round(seconds * 1000)
    return (f"{millis // 3600000:02}:"
            f"{millis // 60000 % 60:02}:"
            f"{millis // 1000 % 60:02}.{millis % 1000:03}")

def narration_from_captions(contents: str) -> list[str]:
    result = []
    for block in re.split(r"\r?\n\s*\r?\n", contents.strip()):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines or "-->" not in lines[0]:
            continue
        text = " ".join(lines[1:])
        result.append(text.replace("I A C R", "IACR").replace(
            "Cryptology ee print", "Cryptology ePrint"
        ))
    return result

def main() -> None:
    old = json.loads(MANIFEST.read_text(encoding="utf-8"))
    chapters = old.get("chapters", [])
    spoken = narration_from_captions(CAPTIONS.read_text(encoding="utf-8"))
    if len(chapters) != len(spoken) or len(chapters) < 20:
        raise ValueError(
            "The existing video chapter index and captions do not agree; "
            "refusing to misalign research tutorial narration."
        )
    if old.get("voice_version") == VOICE_VERSION and old.get("voices") == [VOICE]:
        print("Warm female neural narration is already installed.")
        return

    total = duration(VIDEO)
    with tempfile.TemporaryDirectory(prefix=".axiovo-voice-", dir=ASSETS) as directory:
        work = Path(directory)
        video_list = []
        audio_list = []
        new_chapters = []
        caption_lines = ["WEBVTT", ""]
        elapsed = 0.0

        for i, (chapter, text) in enumerate(zip(chapters, spoken), start=1):
            first = float(chapter.get("start_seconds", 0))
            span = float(chapter.get("duration_seconds", 0))
            if first < 0 or span <= 0 or first + span > total + 2:
                raise ValueError(f"Invalid chapter timestamp in scene {i}")

            # A frame from the actual original recording, with its overlays
            # and search UI preserved. No new or invented page screenshots.
            image = work / f"scene-{i:02}.png"
            position = min(first + min(span * 0.32, 2.5), total - 0.2)
            run("ffmpeg", "-y", "-loglevel", "error",
                "-ss", f"{position:.3f}", "-i", str(VIDEO),
                "-frames:v", "1", str(image))

            wav = work / f"speech-{i:02}.wav"
            render(text, wav)
            # Give a little space for breathing between natural sentences.
            speech_seconds = duration(wav)
            pause = 0.5
            scene_length = speech_seconds + pause
            padded = work / f"padded-{i:02}.wav"
            run("ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                "-af", f"apad=pad_dur={pause:.2f}", "-ar", "24000",
                "-ac", "1", "-c:a", "pcm_s16le", str(padded))

            video_list += [f"file '{image.as_posix()}'",
                           f"duration {scene_length:.3f}"]
            audio_list.append(f"file '{padded.as_posix()}'")
            new_chapters.append({
                **chapter,
                "start_seconds": round(elapsed, 3),
                "duration_seconds": round(scene_length, 3),
            })
            caption_lines.extend([
                f"{timestamp(elapsed)} --> {timestamp(elapsed + speech_seconds)}",
                text, "",
            ])
            elapsed += scene_length
            print(f"Neural female narration {i}/{len(chapters)}: "
                  f"{speech_seconds:.1f}s", flush=True)

        video_list.append(f"file '{image.as_posix()}'")
        images = work / "frames.txt"
        sounds = work / "audio.txt"
        images.write_text("\n".join(video_list) + "\n", encoding="utf-8")
        sounds.write_text("\n".join(audio_list) + "\n", encoding="utf-8")
        final = work / "axiovo-new.mp4"
        run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat",
            "-safe", "0", "-i", str(images), "-f", "concat",
            "-safe", "0", "-i", str(sounds),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
            "-pix_fmt", "yuv420p", "-r", "12",
            "-af", "loudnorm=I=-17:LRA=9:TP=-1.5", "-ar", "24000",
            "-c:a", "aac", "-b:a", "96k", "-shortest",
            "-movflags", "+faststart", str(final))

        with final.open("rb") as media:
            media_sha256 = file_digest(media, "sha256").hexdigest()
        new_meta = {
            **old,
            "duration_seconds": round(duration(final), 2),
            "voices": [VOICE],
            "voice_version": VOICE_VERSION,
            "voice_engine": VOICE_ENGINE,
            "voice_locale": VOICE_LOCALE,
            "voice_style": "warm, conversational female narration",
            "media_sha256": media_sha256,
            "chapters": new_chapters,
            "source": "Real Chromium page captures",
            "narration_source": "Existing source-verified tutorial and captions",
        }
        # Build the complete new output before replacing any published file.
        replacement_captions = work / "axiovo-new.vtt"
        replacement_manifest = work / "axiovo-new.json"
        replacement_captions.write_text(
            "\n".join(caption_lines) + "\n", encoding="utf-8"
        )
        replacement_manifest.write_text(
            json.dumps(new_meta, indent=2) + "\n", encoding="utf-8"
        )
        os.replace(final, VIDEO)
        os.replace(replacement_captions, CAPTIONS)
        os.replace(replacement_manifest, MANIFEST)
        print(f"Revoiced {len(chapters)} scenes in {duration(VIDEO):.1f}s "
              f"using neural female voice {VOICE}.", flush=True)

if __name__ == "__main__":
    main()
