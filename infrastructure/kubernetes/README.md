# Kubernetes Infrastructure & Troubleshooting Scenarios

This directory documents Kubernetes cluster integration, RBAC recommendations, and reference failure manifests used for automated testing.

---

## 1. Connecting ClusterSage to Kubernetes

ClusterSage discovers and troubleshoots Kubernetes clusters using standard kubeconfig authentication.

### Local Clusters (Kind / Minikube / Docker Desktop)
When running in Docker Compose, the backend container automatically mounts `~/.kube:/root/.kube:ro` in read-only mode:

```yaml
volumes:
  - ~/.kube:/root/.kube:ro
```

### In-Cluster Execution (Pod ServiceAccount)
When deploying ClusterSage directly inside a Kubernetes cluster, ClusterSage automatically detects the in-cluster environment via `kubernetes.config.load_incluster_config()` and uses its mounted ServiceAccount token.

---

## 2. Recommended RBAC Permissions

For read-only troubleshooting without destructive privileges, bind ClusterSage to the following ClusterRole:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: clustersage-investigator
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log", "events", "services", "namespaces", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["get", "list", "watch"]
```

---

## 3. Included Failure Scenarios (`scenarios/`)

This directory includes 5 self-contained incident manifests for evaluating automated SRE triage:

1. **`01-crashloop-backoff.yaml`**: Pod terminates repeatedly with non-zero exit code due to missing environment variable.
2. **`02-imagepull-backoff.yaml`**: Non-existent container registry tag triggers image pull loop.
3. **`03-oomkilled.yaml`**: Memory limit set to `16Mi`, causing Linux kernel cgroup OOM killer invocation (Exit Code 137).
4. **`04-service-selector-mismatch.yaml`**: Kubernetes Service selector points to `app: web-api` while Deployment label is `app: api`, resulting in 0/0 active endpoints.
5. **`05-probe-failure.yaml`**: Liveness probe misconfigured to non-existent `/healthz-invalid` endpoint, causing kubelet container restarts.
