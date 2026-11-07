# Security Architecture & Data Protection — ClusterSage

ClusterSage is engineered to operate in enterprise Kubernetes environments with strict data protection, access controls, and prompt security boundaries.

---

## 1. Authentication & Session Security

- **InsForge Authentication Engine**: Supports Google OAuth, GitHub OAuth, and email OTP verification.
- **Cryptographic JWTs**: Authenticated requests transmit standard Bearer tokens validated by the FastAPI backend using asymmetric signature verification.
- **Tenant Isolation**: User identification is extracted directly from the cryptographically verified JWT payload, preventing cross-tenant spoofing.

---

## 2. Deterministic Regex Secrets Scrubber

Before any pod logs, cluster warning events, or manifest text are transmitted to LLM reasoning providers, ClusterSage passes all text through a deterministic multi-pattern regex sanitizer:

```python
# Sanitizes AWS Access Keys, GCP Service Account JSONs, JWTs, and Passwords
AWS_KEY_PATTERN = r"(?i)(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}"
BEARER_PATTERN = r"(?i)bearer\s+[a-zA-Z0-9_\-\.]+"
PASSWORD_PATTERN = r"(?i)(password|secret|token|apikey)\s*[:=]\s*['\"]?([^'\"\s]+)"
```

Matches are replaced with `[REDACTED_SECRET]` before prompt construction, guaranteeing zero secret exposure to AI models.

---

## 3. Kubernetes Least-Privilege Access

- ClusterSage **only requires read-only permissions** (`get`, `list`, `watch`) across Pods, Events, and Deployments.
- ClusterSage never performs unverified destructive actions on your cluster.
- All suggested fixes are formatted as dry-run preview diffs and explicit `kubectl` commands requiring operator approval and manual execution.

---

## 4. Zero Third-Party Telemetry

- No analytic tracking libraries, pixel trackers, or commercial telemetry beacons are embedded in ClusterSage.
- Client settings and investigation caches are stored locally within the operator's browser session.
