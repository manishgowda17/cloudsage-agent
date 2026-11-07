# REST API Reference — ClusterSage

The ClusterSage backend exposes a modular FastAPI v1 REST API. Interactive Swagger UI is accessible at `http://localhost:8000/docs` and ReDoc at `http://localhost:8000/redoc`.

---

## 1. System Health & Discovery

### `GET /health`
Service health check and ping endpoint.
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "service": "ai-kubernetes-agent"
  }
  ```

### `GET /clusters`
Discovers all Kubernetes clusters and contexts available in the mounted kubeconfig.
- **Response `200 OK`**:
  ```json
  {
    "current_context": "kind-pipelineguard",
    "clusters": [
      {
        "name": "kind-pipelineguard",
        "context": "kind-pipelineguard",
        "server": "https://127.0.0.1:51433",
        "is_current": true,
        "status": "connected"
      }
    ]
  }
  ```

---

## 2. Investigation Engine

### `POST /investigate`
Runs an automated diagnostic investigation across live clusters or static manifests.

- **Request Body**:
  ```json
  {
    "namespace": "default",
    "context": "kind-pipelineguard",
    "source_type": "cluster",
    "github_url": null,
    "manifest_content": null,
    "manifest_filename": null,
    "zip_data_base64": null
  }
  ```

- **Response `200 OK`**:
  Returns the `InvestigationResponse` payload containing the normalized `UniversalInvestigationReport` and Hindsight metadata.

---

## 3. Hindsight Episodic Memory Endpoints

### `GET /api/v1/hindsight/status`
Checks Hindsight service connectivity and returns the caller's active tenant memory bank ID.

### `GET /api/v1/hindsight/memories`
Browse and search memories stored in the user's isolated memory bank.
- **Query Parameters**:
  - `query` (string, optional): Semantic or keyword search string.
  - `tag` (string, optional): Filter by tag (e.g. `probe-failure`, `post-mortem`).

### `GET /api/v1/hindsight/insights`
Retrieves recurring failure patterns, common defect classes, and Reflect pattern synthesis.

### `POST /api/v1/hindsight/recall`
Performs semantic recall of relevant historical incidents matching a query.

### `POST /api/v1/hindsight/reflect`
Synthesizes cross-incident meta-learnings across the bank's stored memories.

---

## 4. Runbooks & Post-Mortem Endpoints

### `GET /api/v1/runbooks`
Lists all verified SRE troubleshooting runbooks.

### `GET /api/v1/runbooks/{runbook_id}`
Retrieves detailed step-by-step instructions and blast radius analysis for a runbook.

### `GET /api/v1/postmortems`
Lists all recorded post-mortems for the authenticated operator.

### `POST /api/v1/postmortems`
Publishes a new post-mortem and automatically retains it in the operator's Hindsight bank.
