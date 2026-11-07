# Security Policy

## Supported Versions

The following table lists which versions of ClusterSage currently receive security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

The ClusterSage team takes security and data privacy seriously. If you discover a security vulnerability or credential exposure within this project, please report it responsibly.

### How to Report
- **Please DO NOT report security vulnerabilities via public GitHub issues.**
- Submit reports privately via [GitHub Security Advisories](https://github.com/ClusterSage/ClusterSage/security/advisories/new) or directly contact the repository maintainers.
- Include detailed steps to reproduce the issue, proof-of-concept manifests, and an assessment of potential blast radius.

### Response Timeline
- **Initial Acknowledgment**: Within 48 hours of report submission.
- **Triage & Assessment**: Within 5 business days.
- **Fix & Public Advisory**: Once a patch is developed, tested, and released.

---

## Secret Sanitization & Token Scrubbing

ClusterSage includes a built-in deterministic regex secrets scrubber:
- All AWS access keys, GCP service account credentials, JWT tokens, and database connection strings are sanitized from pod logs and manifest text prior to sending prompts to LLM providers.
- Local memory banks partition data strictly by authenticated user ID.
- No analytical telemetry or Kubernetes configuration is sent to third-party ad networks or untrusted services.
