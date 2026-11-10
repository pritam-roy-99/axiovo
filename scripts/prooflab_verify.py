#!/usr/bin/env python3
"""Offline Lean 4 verification for Axiovo ProofLab.
Requires Lean 4 installed locally; use from a trusted project directory.
Never runs uploaded or remote code automatically.
"""
from __future__ import annotations
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

def verify(path: Path, timeout: int = 60, executable: str = "lean") -> dict:
    if path.suffix != ".lean" or not path.is_file():
        return {"status": "error", "message": "Select an existing .lean file."}
    if path.stat().st_size > 1_000_000:
        return {"status": "error", "message": "Lean file exceeds 1 MB."}
    command = shutil.which(executable)
    if not command:
        return {"status": "unavailable", "message": "Lean 4 is not installed or not on PATH."}
    try:
        result = subprocess.run([command, str(path.resolve())], cwd=str(path.resolve().parent),
                                capture_output=True, text=True, timeout=max(1, min(timeout, 180)),
                                check=False)
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "message": "Lean verification exceeded the time limit."}
    except OSError as error:
        return {"status": "error", "message": str(error)}
    output = (result.stdout + "\n" + result.stderr).strip()[:12000]
    # Successful compilation is not certification if the proof contains admitted gaps.
    source = path.read_text(encoding="utf-8")
    import re
    has_gaps = bool(re.search(r"\b(sorry|admit)\b", re.sub(r"--[^\n]*|/-[\s\S]*?-/", "", source)))
    if result.returncode != 0:
        status = "failed"
    elif has_gaps:
        status = "incomplete"
    else:
        status = "verified"
    return {"status": status, "exit_code": result.returncode, "diagnostics": output,
            "message": "Lean completed without detected admitted gaps." if status == "verified"
            else "Lean reported errors or the proof contains admitted gaps."}

def main() -> int:
    parser = argparse.ArgumentParser(description="Verify a local ProofLab Lean 4 file.")
    parser.add_argument("file", type=Path)
    parser.add_argument("--timeout", type=int, default=60)
    args = parser.parse_args()
    result = verify(args.file, args.timeout)
    print(json.dumps(result, indent=2))
    return 0 if result["status"] == "verified" else 1

if __name__ == "__main__":
    sys.exit(main())
