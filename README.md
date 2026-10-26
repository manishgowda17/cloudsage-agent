# AI Kubernetes Troubleshooting Agent

> An on-demand AI-powered Kubernetes troubleshooting platform that investigates cluster health, discovers local kubeconfig clusters, correlates multi-layer evidence (Pods, Logs, Events, Deployments, Networking), and generates Senior SRE root-cause diagnoses with exact `kubectl` remediation commands.

---

## Architecture Overview

```text
Frontend (Next.js Dashboard + InsForge Auth/DB)
    ↓
FastAPI Backend (Orchestrator)
    ↓
Cluster Manager (Local Kubeconfig Discovery: ~/.kube/config)
    ↓
Kubernetes Investigation Layer
    ├── Pod Inspector (CrashLoopBackOff, ImagePullBackOff, OOMKilled, Pending)
    ├── Logs Collector (Targeted failure regex and crash logs)
    ├── Events Analyzer (Warning events, FailedScheduling, Unhealthy)
    ├── Deployment Inspector (Replica availability, Rollout deadlocks)
    └── Network Inspector (Service selectors, Endpoint alignment)
    ↓
AI Kubernetes Agent (Senior Kubernetes SRE Reasoning)
    ↓
LLM Reasoning (OpenRouter via InsForge Model Gateway Key)
    ↓
Root Cause Analysis + Suggested Fix + kubectl Command
    ↓
Frontend Diagnosis & InsForge Investigation History
```

---

## Monorepo Structure

```text
ai-kubernetes-agent/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── investigate.py
│   │   │       │   └── clusters.py
│   │   │       └── router.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── logging.py
│   │   ├── kubernetes/
│   │   │   ├── kubectl_executor.py       # Safe subprocess executor with timeout
│   │   │   ├── cluster_manager.py        # Kubeconfig discovery & context ping
│   │   │   ├── pod_inspector.py          # Pod lifecycle & unhealthy states
│   │   │   ├── logs_collector.py         # Concise crash & error pattern extraction
│   │   │   ├── events_analyzer.py        # Warning events & incident signals
│   │   │   ├── deployment_inspector.py   # Replicas & rollout stall detection
│   │   │   └── network_inspector.py      # Service selectors & missing endpoints
│   │   ├── ai/
│   │   │   ├── prompt_builder.py         # Multi-layer Kubernetes evidence prompt
│   │   │   ├── llm_client.py             # OpenRouter client via InsForge key
│   │   │   ├── confidence_engine.py      # Telemetry strength confidence scoring
│   │   │   ├── fix_engine.py             # Targeted remediation & kubectl commands
│   │   │   └── root_cause_analyzer.py    # SRE correlation & heuristic engine
│   │   ├── services/
│   │   │   └── investigation.py          # Evidence pipeline + scenario runner
│   │   ├── models/
│   │   │   └── schemas.py
│   │   └── main.py                       # FastAPI application entrypoint
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                  # Protected SRE Dashboard
│   │   │   ├── providers.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Header.tsx                # Status banner & live health indicator
│   │   │   ├── AuthModal.tsx             # InsForge Email/Password authentication
│   │   │   ├── ClusterSelector.tsx       # Discovered kubeconfig clusters & test bench
│   │   │   ├── InvestigationProgress.tsx # Live checklist (Pods → Logs → AI → Fix)
│   │   │   ├── RootCauseCard.tsx         # Root cause, confidence, copyable kubectl command
│   │   │   └── InvestigationHistory.tsx  # InsForge database past incident table
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── investigationService.ts   # Axios API client to FastAPI
│   │   │   └── insforge.ts               # InsForge Auth, Database & Realtime client
│   │   └── types/
│   │       └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   └── .env.local
├── scenarios/                            # Real Kubernetes Failure Manifests
│   ├── 01-crashloop-backoff.yaml         # Missing DATABASE_URL env var
│   ├── 02-imagepull-backoff.yaml         # Invalid image tag
│   ├── 03-oomkilled.yaml                 # Exceeding 16Mi memory limit (Exit 137)
│   └── 04-service-selector-mismatch.yaml # Service selector mismatch
├── scripts/
│   └── test_scenarios.py                 # Automated end-to-end scenario test suite
├── prompts/
│   ├── 01-prompt-project-setup.md
│   ├── 02-prompt-kubernetes-investigation-engine.md
│   ├── 03-prompt-ai-reasoning-engine.md
│   ├── 04-prompt-dashboard-and-api.md
│   └── 05-prompt-integration-testing-deployment.md
├── docker-compose.yml
└── README.md
```

---

## Key Features

1. **Local Kubeconfig Cluster Discovery:**
   - Automatically reads `~/.kube/config`.
   - Renders all local clusters as clickable cards in the dashboard.
   - **Clicking any cluster immediately switches context and triggers an investigation for that specific cluster.**

2. **Real Kubernetes Failure Testing Bench:**
   - Pre-packaged YAML manifests in `scenarios/` for testing:
     - **Scenario 1 — CrashLoopBackOff:** Missing `DATABASE_URL` environment variable.
     - **Scenario 2 — ImagePullBackOff:** Invalid container image tag (`nginx:nonexistent-tag-v999-invalid`).
     - **Scenario 3 — OOMKilled:** Low memory limit allocation deadlock (Exit 137).
     - **Scenario 4 — Service Selector Mismatch:** Service selector does not match pod labels.
   - 1-click test pills in the web UI for immediate SRE diagnosis verification.

3. **Beginner-Friendly Error Handling:**
   - If the local Kubernetes control plane is stopped, the agent surfaces a structured checklist (verifying kubeconfig, daemon status, and cluster permissions) instead of cryptic stack traces.

4. **InsForge Platform Integration:**
   - **Authentication:** Protected SRE dashboard access.
   - **PostgreSQL Database (`investigations` table):** Historical incident tracking with confidence score, root cause, and remediation commands.
   - **Model Gateway (OpenRouter):** AI LLM reasoning using InsForge provisioned API keys.

---

## Quick Start with Docker Compose

```bash
cd "C:\Users\Manish Gowda S N\.gemini\antigravity\scratch\ai-kubernetes-agent"
docker compose up --build
```
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend Health:** [http://localhost:8000/health](http://localhost:8000/health)
- **Local Clusters API:** [http://localhost:8000/clusters](http://localhost:8000/clusters)
- **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Running Automated Scenario Tests

Run the full end-to-end integration and failure scenario test suite:

```bash
python scripts/test_scenarios.py
```

Output:
```text
=================================================================
[*] Running AI Kubernetes Agent Integration & Scenario Tests
=================================================================

[Test 1/6] Verifying GET /health ...
  [PASS] Service Health: {'status': 'healthy', 'service': 'ai-kubernetes-agent'}

[Test 2/6] Verifying GET /clusters (Local Kubeconfig Discovery) ...
  [PASS] Discovered 1 local cluster context(s):
    - docker-desktop (docker-desktop) -> https://127.0.0.1:52285

[Test 3/6] Testing Scenario 1: CrashLoopBackOff (Missing ENV) ...
  [PASS] Root Cause: Missing environment variable: DATABASE_URL in pod 'payment-service-679bc489fb-xyz12'.
  [PASS] Suggested Fix: Add the missing secret or configmap value for DATABASE_URL to the deployment environment.
  [PASS] kubectl Command: kubectl set env deployment/payment-service-679bc489fb-xyz12 DATABASE_URL=postgresql://user:pass@postgres:5432/db -n default
  [PASS] Confidence: 94%

[Test 4/6] Testing Scenario 2: ImagePullBackOff (Bad Image Tag) ...
  [PASS] Root Cause: Invalid container image tag or repository for pod 'auth-service-58df86455b-4rt5y'.
  [PASS] Suggested Fix: Update the deployment image tag to a valid image existing in the registry.
  [PASS] kubectl Command: kubectl set image deployment/auth-service-58df86455b-4rt5y auth-service-58df86455b-4rt5y=nginx:alpine -n default
  [PASS] Confidence: 96%

[Test 5/6] Testing Scenario 3: OOMKilled (Low Memory Limit) ...
  [PASS] Root Cause: Container in pod 'analytics-worker-9988ffbc-qw78p' exceeded memory limit (OOMKilled - Exit 137).
  [PASS] Suggested Fix: Increase memory requests and limits for the container in the deployment specification.
  [PASS] kubectl Command: kubectl set resources deployment/analytics-worker-9988ffbc-qw78p --limits=memory=256Mi --requests=memory=128Mi -n default
  [PASS] Confidence: 97%

[Test 6/6] Testing Scenario 4: Service Selector Mismatch ...
  [PASS] Root Cause: Service selector does not match pod labels for service 'order-service'.
  [PASS] Suggested Fix: Update the service selector labels to match the target deployment pod template labels.
  [PASS] kubectl Command: kubectl patch svc order-service -p '{"spec":{"selector":{"app":"orders-backend"}}}' -n default
  [PASS] Confidence: 93%

=================================================================
[SUCCESS] ALL 6 INTEGRATION & SCENARIO TESTS PASSED SUCCESSFULLY!
=================================================================
```
