# Installation Guide — ClusterSage

This guide provides instructions for setting up ClusterSage either using Docker Compose (recommended) or in a local manual development environment.

---

## 1. Prerequisites

Before installing, ensure your machine has the following tools installed:

- **Docker**: Version 24.0 or higher.
- **Docker Compose**: Version v2.20 or higher.
- **Git**: Installed and available on your PATH.
- (Optional for manual local setup) **Node.js**: Version 20 LTS.
- (Optional for manual local setup) **Python**: Version 3.12+.
- (Optional for live cluster triage) **kubectl**: Configured with a running Kubernetes cluster (Kind, Minikube, GKE, EKS, AKS).

---

## 2. Docker Compose Installation (Recommended)

Docker Compose orchestrates the frontend, backend, and Hindsight episodic memory engine in a unified, isolated network.

### Step 1: Clone the Repository
```bash
git clone https://github.com/ClusterSage/ClusterSage.git
cd ClusterSage
```

### Step 2: Configure Environment Variables
```bash
cp .env.example .env
```

Open `.env` in your editor and supply your **Google Gemini API Key**:
```dotenv
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
```

### Step 3: Build & Start All Services
```bash
docker compose up -d --build
```

### Step 4: Verify Deployment Health
```bash
./scripts/health-check.sh
```

Or manually verify via `curl`:
```bash
curl http://localhost:8000/health
# Response: {"status":"healthy","service":"ai-kubernetes-agent"}
```

### Step 5: Access the Interfaces
- **Web Dashboard**: `http://localhost:3000`
- **Backend API Docs**: `http://localhost:8000/docs`
- **Hindsight Control Plane**: `http://localhost:9999`

---

## 3. Manual Local Development Setup

If developing without Docker, you can run each service individually:

### 1. Start Hindsight Standalone
```bash
docker compose -f hindsight/docker-compose.yml up -d
```

### 2. Start the Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start the Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.
