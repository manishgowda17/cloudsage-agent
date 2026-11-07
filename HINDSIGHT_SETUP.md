# Hindsight Memory Engine Setup & Quickstart Guide

This guide walks through configuring, running, and verifying the **Hindsight** agent memory engine for the **AI Kubernetes Troubleshooting Agent / PipelineGuard AI**.

---

## 1. Prerequisites

- **Docker Engine** (or Docker Desktop) with Compose support
- **Python 3.10+** (if running backend locally)
- **Node.js 18+** (if running frontend locally)
- **InsForge Account & Project** (configured in `.env`)
- **Google Gemini API Key** (optional: if omitted, Hindsight runs with embedded local Mock LLM extraction and the agent falls back to the Senior SRE deterministic engine)

---

## 2. Docker Compose Deployment (Recommended)

The easiest way to run the entire stack (Hindsight + Backend + Frontend) is via Docker Compose:

```bash
# From repository root:
docker compose up -d
```

### Docker Compose Services:
| Service | Image | Internal Port | Host Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `hindsight` | `ghcr.io/vectorize-io/hindsight:latest` | `8888`, `9999` | `8888`, `9999` | Agent Memory Engine & Control Plane |
| `backend` | `./backend/Dockerfile` | `8000` | `8000` | FastAPI Orchestrator |
| `frontend` | `./frontend/Dockerfile` | `3000` | `3000` | Next.js SRE Web Dashboard |

### Verifying Container Health
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected output:
```text
NAMES                          STATUS                    PORTS
ai-kubernetes-agent-frontend   Up                        0.0.0.0:3000->3000/tcp
ai-kubernetes-agent-backend    Up (healthy)              0.0.0.0:8000->8000/tcp
ai-kubernetes-agent-hindsight  Up (healthy)              0.0.0.0:8888->8888/tcp, 0.0.0.0:9999->9999/tcp
```

---

## 3. Running Hindsight as a Standalone Container

If you prefer to run Hindsight standalone while running backend/frontend in local development:

```bash
docker run -d \
  --name ai-kubernetes-agent-hindsight \
  --restart unless-stopped \
  --shm-size 1gb \
  -p 8888:8888 \
  -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=mock \
  -e HINDSIGHT_API_WORKER_ID=ai-kubernetes-agent-hindsight \
  -v hindsight-data:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

> **Note on LLM Provider:**
> Setting `HINDSIGHT_API_LLM_PROVIDER=mock` enables fully offline extraction and embedding indexing without external API dependencies. If you have a Google AI Studio Gemini API key (`AIzaSy...`), set:
> ```bash
> -e HINDSIGHT_API_LLM_PROVIDER=gemini \
> -e HINDSIGHT_API_LLM_API_KEY=AIzaSy... \
> -e HINDSIGHT_API_LLM_MODEL=gemini-2.5-flash
> ```

---

## 4. Environment Variables Configuration

### Backend (`backend/.env`):
```ini
# Hindsight Configuration
HINDSIGHT_URL=http://localhost:8888
HINDSIGHT_CONTROL_PLANE_URL=http://localhost:9999
HINDSIGHT_ENABLED=true
HINDSIGHT_TIMEOUT_SECONDS=15.0

# InsForge Authentication & Storage
INSFORGE_URL=https://mucsd7yw.us-east.insforge.app
INSFORGE_ANON_KEY=anon_57cbe317689f3e724ced0051c10d088eab9ddc1123ce564702735a7dcb764eb8

# Google Gemini API (Optional)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### Frontend (`frontend/.env.local`):
```ini
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_HINDSIGHT_CONTROL_PLANE=http://localhost:9999
NEXT_PUBLIC_INSFORGE_URL=https://mucsd7yw.us-east.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=anon_57cbe317689f3e724ced0051c10d088eab9ddc1123ce564702735a7dcb764eb8
```

---

## 5. Verification & Testing

### 5.1 Test Suite (15 Automated Verification Checks)
To run the automated verification test suite:

```bash
cd backend
python -m pytest tests/test_hindsight_verification.py -v -s
```

All 15 tests should pass:
- Health check
- Connectivity
- Bank creation
- Retain operation
- Recall operation
- Reflect operation
- Data persistence across restart
- InsForge JWT enforcement
- Multi-user tenant isolation
- Graceful offline fallback
- Investigation Hindsight pipeline (Recall → Gemini → Validate → Retain)
- Static YAML manifest audit without cluster
- ZIP archive audit without cluster
- GitHub repository audit without cluster
- Secret sanitization

### 5.2 Interactive Hackathon Demo Script
To run the end-to-end 3-stage hackathon demo (Probe Defect → Retention → Recall & Influence → Reflect):

```bash
cd backend
python tests/run_demo.py
```

### 5.3 Accessing the Web Interfaces
- **Next.js Web Dashboard:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Hindsight Web Control Plane:** [http://localhost:9999](http://localhost:9999)
- **Hindsight Health API:** [http://localhost:8888/health](http://localhost:8888/health)
