#!/usr/bin/env bash
set -euo pipefail
MODEL_DIR="${AXIOVO_VOICE_MODEL_DIR:-.cache/axiovo-voice}"
mkdir -p "$MODEL_DIR"
RELEASE="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1"
download() {
  local file="$1" min_size="$2"
  local target="$MODEL_DIR/$file"
  if [[ -s "$target" ]] && [[ $(stat -c%s "$target") -gt "$min_size" ]]; then
    echo "Voice model already available: $file"
    return
  fi
  local partial="$target.partial"
  rm -f "$partial"
  curl --fail --location --retry 4 --retry-all-errors --connect-timeout 20 --max-time 360 \
    --output "$partial" "$RELEASE/$file"
  [[ $(stat -c%s "$partial") -gt "$min_size" ]] || { echo "Invalid voice model: $file"; exit 1; }
  mv "$partial" "$target"
}
download kokoro-v1.0.onnx 80000000
download voices-v1.0.bin 1000000
echo "Kokoro neural female voice models ready."
