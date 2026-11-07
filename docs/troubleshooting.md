# Troubleshooting Guide — ClusterSage

This guide provides diagnostics and solutions for common operational issues encountered when running ClusterSage.

---

## 1. Container & Startup Issues

### Problem: Hindsight container takes a long time to become healthy
- **Cause**: On initial launch, Hindsight downloads and verifies local reranker models (`hs-rerank-1`) and initializes the embedded vector engine.
- **Solution**: The Docker health check has a `start_period: 90s`. Allow up to 90 seconds on first run. Check container logs:
  ```bash
  docker compose logs -f hindsight
  ```

### Problem: Backend reports `Hindsight connection failed`
- **Cause**: Backend started before Hindsight finished warming up, or `HINDSIGHT_URL` is misconfigured.
- **Solution**:
  - In Docker Compose, ensure `HINDSIGHT_URL=http://hindsight:8888`.
  - For local execution outside Docker, ensure `HINDSIGHT_URL=http://localhost:8888`.
  - Check whether Hindsight responds: `curl http://localhost:8888/health`.

---

## 2. Kubernetes Cluster Discovery Issues

### Problem: "No clusters found in Kubeconfig"
- **Cause**: The backend container cannot locate your `~/.kube/config` file.
- **Solution**:
  - Ensure your local kubeconfig exists: `ls -la ~/.kube/config`.
  - If running in Docker on Windows or Linux, ensure `~/.kube:/root/.kube:ro` volume mount has read permissions.
  - Or manually specify `KUBECONFIG_PATH=/path/to/custom/kubeconfig` in `.env`.

### Problem: Cluster shows `status: unreachable`
- **Cause**: For local Kind clusters, `127.0.0.1:<port>` points to localhost inside the Docker container rather than the host machine.
- **Solution**:
  - Use `host.docker.internal` in your kubeconfig server URL when connecting from inside Docker containers:
    ```yaml
    server: https://host.docker.internal:51433
    ```

---

## 3. Gemini AI Reasoning Issues

### Problem: Investigation returns `Diagnosis fallback` or 500 error
- **Cause**: `GEMINI_API_KEY` is empty, expired, or hitting rate limits.
- **Solution**:
  - Verify your API key at [Google AI Studio](https://aistudio.google.com/).
  - Ensure `GEMINI_API_KEY` is set in `.env`.
  - Restart the backend: `docker compose restart backend`.
