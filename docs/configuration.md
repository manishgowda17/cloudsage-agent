# Configuration Reference — ClusterSage

This document details all configuration options, environment variables, and security boundaries in ClusterSage.

---

## 1. Environment Variables Overview

Environment variables in ClusterSage are partitioned into **Server-Only (Private)** and **Client-Accessible (Public)** variables.

### 1.1 Backend & Server-Only Variables

These variables are consumed by the FastAPI backend or Hindsight engine and **must never be exposed to the client bundle**:

| Variable | Default Value | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(Required)* | Google Gemini API key used for autonomous SRE correlation and reasoning. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Multimodal SRE model identifier. Supports `gemini-2.5-flash` or `gemini-2.0-flash`. |
| `HOST` | `0.0.0.0` | Host IP address binding for Uvicorn ASGI server. |
| `PORT` | `8000` | Port for the backend API. |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | JSON array of permitted client origins. |
| `KUBECONFIG_PATH` | `~/.kube/config` | File path to local Kubernetes cluster credentials. |
| `INSFORGE_URL` | `https://mucsd7yw.us-east.insforge.app` | InsForge BaaS endpoint. |
| `INSFORGE_ANON_KEY` | *(Configured)* | Client-safe anonymous key for InsForge database interactions. |
| `HINDSIGHT_URL` | `http://localhost:8888` | Base URL for the Hindsight REST API. In Docker Compose, set to `http://hindsight:8888`. |
| `HINDSIGHT_CONTROL_PLANE_URL` | `http://localhost:9999` | External URL for the Hindsight Web UI. |
| `HINDSIGHT_API_LLM_PROVIDER` | `gemini` | LLM inference backend for Hindsight memory reflection. |
| `GITHUB_TOKEN` | *(Optional)* | Personal access token used for auditing private GitOps repositories. |

---

### 1.2 Frontend Public Variables (`NEXT_PUBLIC_`)

Variables prefixed with `NEXT_PUBLIC_` are bundled into the Next.js client application at build time:

| Variable | Default Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Backend API gateway URL used by Axios clients in the browser. |
| `NEXT_PUBLIC_INSFORGE_URL` | `https://mucsd7yw.us-east.insforge.app` | InsForge authentication and database client URL. |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | *(Configured)* | Public anonymous token for InsForge client SDK. |
| `NEXT_PUBLIC_HINDSIGHT_CONTROL_PLANE` | `http://localhost:9999` | Link to Hindsight Web dashboard. |

> [!WARNING]
> Never add `NEXT_PUBLIC_` to `GEMINI_API_KEY` or any private cryptographic keys. Doing so compiles the secret into the client JavaScript bundle.
