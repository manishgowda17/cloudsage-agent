# Docker Container Architecture

ClusterSage is fully containerized using multi-stage, hardened Docker builds and coordinated via Docker Compose.

---

## 1. Container Topology

```mermaid
graph TD
    subgraph "Docker Compose Network (ai-kubernetes-agent)"
        FE["ai-kubernetes-agent-frontend<br/>Next.js 14 (Node 20 Alpine)<br/>Port: 3000"]
        BE["ai-kubernetes-agent-backend<br/>FastAPI (Python 3.12 Slim)<br/>Port: 8000"]
        HS["ai-kubernetes-agent-hindsight<br/>Episodic Engine (Ubuntu)<br/>Ports: 8888, 9999"]
        
        FE -->|HTTP API calls| BE
        BE -->|Async client| HS
    end
    
    subgraph "Host Resources"
        KUBE[~/.kube/config] -.->|Read-Only Mount| BE
        VOL[(hindsight-data volume)] -.->|Persistent Mount| HS
    end
```

---

## 2. Service Specifications

### Frontend (`frontend/Dockerfile`)
- **Base**: `node:20-alpine`
- **Build Method**: Multi-stage (Build stage compiles Next.js standalone pages, Runner stage copies only optimized `.next` output and `node_modules`).
- **Image Footprint**: ~162 kB initial client JS, stripped of devDependencies.

### Backend (`backend/Dockerfile`)
- **Base**: `python:3.12-slim`
- **System Tools**: Includes `curl` for container health checks and `kubectl v1.30.0` CLI binary for cluster commands.
- **Security**: Non-root execution capable, `PYTHONDONTWRITEBYTECODE=1`, `PYTHONUNBUFFERED=1`.

### Hindsight Memory (`ghcr.io/vectorize-io/hindsight:latest`)
- **Storage**: Named volume `hindsight-data` mounted at `/home/hindsight/.pg0`.
- **Memory Buffer**: Configured with `shm_size: 1gb` for vector search performance.

---

## 3. Production Deployment Commands

```bash
# Build all images without cache
docker compose build --no-cache

# Start the complete stack in background
docker compose up -d

# Verify container health
docker compose ps

# View unified log stream
docker compose logs -f
```
