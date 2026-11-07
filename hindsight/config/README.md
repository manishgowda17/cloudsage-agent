# Hindsight Configuration Reference

This directory contains configuration guidelines for tailoring the Hindsight Episodic Memory Engine within ClusterSage.

## Memory Engine Parameters

| Environment Variable | Default | Purpose |
|---|---|---|
| `HINDSIGHT_API_LLM_PROVIDER` | `mock` / `gemini` | LLM inference backend used during knowledge graph node extraction and reflection. Use `gemini` in production with `GEMINI_API_KEY`. |
| `HINDSIGHT_API_LLM_API_KEY` | `${GEMINI_API_KEY}` | API key for the LLM provider. |
| `HINDSIGHT_API_LLM_MODEL` | `gemini-2.5-flash` | Multimodal model utilized for fast semantic extraction. |
| `HINDSIGHT_API_WORKER_ID` | `ai-kubernetes-agent-hindsight` | Cluster worker identity string. |

## Storage Persistence
Hindsight stores its underlying vector indices, BM25 inverse tables, and episodic memory nodes in SQLite / DuckDB embedded within `/home/hindsight/.pg0`.
This directory is mounted to a named Docker volume (`hindsight-data`) to ensure zero memory loss across container restarts.

## Multi-Tenant Bank Partitioning
In ClusterSage, every authenticated operator is automatically provisioned a dedicated, isolated memory bank prefixed with `user_<userId>`. Unauthenticated requests fall back safely to `bank_default_cluster_sre`. Cross-tenant data leakage is cryptographically prevented at the routing layer.
