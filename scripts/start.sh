#!/usr/bin/env bash
# ==============================================================================
# CLUSTERSAGE — Production & Development Stack Startup Script
# ==============================================================================
set -euo pipefail

echo "=================================================="
echo "  Starting CLUSTERSAGE Multi-Container Stack      "
echo "=================================================="

# Check for .env file
if [ ! -f .env ]; then
  echo "[!] .env not found. Copying .env.example..."
  cp .env.example .env
fi

# Build and start services
echo "[+] Orchestrating containers via Docker Compose..."
docker compose up -d --build

echo "[+] Waiting for services to initialize health checks..."
sleep 5

# Run health check
if [ -f "./scripts/health-check.sh" ]; then
  bash ./scripts/health-check.sh
fi

echo "=================================================="
echo "  CLUSTERSAGE is running:                         "
echo "  - Web Dashboard:     http://localhost:3000      "
echo "  - Backend API:       http://localhost:8000      "
echo "  - API Documentation: http://localhost:8000/docs "
echo "  - Memory Engine:     http://localhost:9999      "
echo "=================================================="
