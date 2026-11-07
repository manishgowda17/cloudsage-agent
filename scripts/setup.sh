#!/usr/bin/env bash
# ==============================================================================
# CLUSTERSAGE — Local Environment Setup Script
# ==============================================================================
set -euo pipefail

echo "=================================================="
echo "  Setting up CLUSTERSAGE Development Environment  "
echo "=================================================="

# 1. Check for root .env file
if [ ! -f .env ]; then
  echo "[+] Creating .env from .env.example..."
  cp .env.example .env
  echo "[!] Please configure your GEMINI_API_KEY in .env"
else
  echo "[✓] .env file already exists."
fi

# 2. Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "[x] Docker is required but not installed. Aborting."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo "[x] Docker Compose is required. Aborting."; exit 1; }

# 3. Setup Python virtual environment for backend testing (optional local dev)
if command -v python3 >/dev/null 2>&1; then
  echo "[+] Setting up Python virtual environment for backend..."
  cd backend
  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
  fi
  # Source venv if available
  if [ -f ".venv/bin/activate" ]; then
    . .venv/bin/activate
  elif [ -f ".venv/Scripts/activate" ]; then
    . .venv/Scripts/activate
  fi
  pip install --quiet --upgrade pip
  pip install --quiet -r requirements.txt
  cd ..
  echo "[✓] Backend dependencies installed."
fi

# 4. Setup Node.js frontend dependencies (optional local dev)
if command -v npm >/dev/null 2>&1; then
  echo "[+] Installing frontend dependencies..."
  cd frontend
  npm install --quiet
  cd ..
  echo "[✓] Frontend dependencies installed."
fi

echo "=================================================="
echo "  Setup complete! Next step:                      "
echo "  Run './scripts/start.sh' or 'docker compose up' "
echo "=================================================="
