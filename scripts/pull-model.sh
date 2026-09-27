#!/usr/bin/env bash
set -euo pipefail

MODEL="${OLLAMA_MODEL:-hf.co/mradermacher/GLM-4.7-Flash-heretic-GGUF:Q2_K}"
HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

echo "Pulling ${MODEL}..."
echo "Hints: Q2_K ~11GB (15GB RAM+swap OK); Q4_K_M ~17GB needs ~18GB RAM/VRAM."
OLLAMA_HOST="$HOST" ollama pull "$MODEL"
echo "Done. Run: ollama run ${MODEL}"
