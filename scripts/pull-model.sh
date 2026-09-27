#!/usr/bin/env bash
set -euo pipefail

MODEL="${OLLAMA_MODEL:-hf.co/ThalisAI/GLM-4.7-Flash-heretic:Q4_K_M}"
HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

echo "Pulling ${MODEL} (needs ~17GB disk + ~18GB RAM/VRAM for Q4_K_M)..."
OLLAMA_HOST="$HOST" ollama pull "$MODEL"
echo "Done. Run: ollama run ${MODEL}"
