#!/usr/bin/env bash
# ==============================================================================
# CLUSTERSAGE — Automated Service Health Verification Script
# ==============================================================================
set -u

echo "=================================================="
echo "  CLUSTERSAGE Service Health Check                "
echo "=================================================="

# Function to check HTTP status
check_endpoint() {
  local name="$1"
  local url="$2"
  local expected="$3"
  
  if command -v curl >/dev/null 2>&1; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  else
    echo "[-] curl not found. Skipping $name check."
    return
  fi

  if [ "$status" = "$expected" ]; then
    echo "[✓] $name is ONLINE ($url -> HTTP $status)"
  else
    echo "[x] $name is OFFLINE or UNHEALTHY ($url -> HTTP $status, expected $expected)"
  fi
}

# Run checks
check_endpoint "Frontend Web App" "http://localhost:3000" "200"
check_endpoint "Backend API Health" "http://localhost:8000/health" "200"
check_endpoint "Hindsight Memory Engine" "http://localhost:8888/health" "200"

echo "=================================================="
