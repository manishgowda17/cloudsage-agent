# Deployment Guide — ClusterSage

This document explains production deployment topologies, reverse proxy configurations, and storage persistence for ClusterSage.

---

## 1. Production Docker Compose Deployment

The root `docker-compose.yml` provides a production-grade multi-container deployment:

```bash
# 1. Pull latest upstream images and build local targets
docker compose pull
docker compose build --pull

# 2. Launch services with restart policies active
docker compose up -d

# 3. Verify health status
docker compose ps
```

### Container Health Checks
- **Hindsight**: Checks `http://localhost:8888/health` every 10s with 90s initial startup grace period.
- **Backend**: Checks `http://localhost:8000/health` every 30s. Backend waits for Hindsight to report healthy before starting.
- **Frontend**: Depends on healthy backend before taking user traffic.

---

## 2. Reverse Proxy & SSL/TLS Configuration (NGINX Example)

For public or corporate network exposure, place an NGINX reverse proxy with TLS 1.3 in front of the services:

```nginx
server {
    listen 443 ssl http2;
    server_name clustersage.company.internal;

    ssl_certificate /etc/ssl/certs/clustersage.crt;
    ssl_certificate_key /etc/ssl/private/clustersage.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Frontend Web Dashboard
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API Gateway
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Hindsight Control Plane (Restricted access recommended)
    location /hindsight/ {
        proxy_pass http://localhost:9999/;
        auth_basic "Restricted Operator Area";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

---

## 3. Persistent Volume Management

Hindsight stores episodic memory graphs and vector indices in a named Docker volume (`hindsight-data`).

- **Backup Memory Volume**:
  ```bash
  docker run --rm -v ai-kubernetes-agent_hindsight-data:/data -v $(pwd):/backup alpine tar czf /backup/hindsight-backup-$(date +%F).tar.gz -C /data .
  ```
- **Restore Memory Volume**:
  ```bash
  docker run --rm -v ai-kubernetes-agent_hindsight-data:/data -v $(pwd):/backup alpine tar xzf /backup/hindsight-backup-<date>.tar.gz -C /data
  ```
