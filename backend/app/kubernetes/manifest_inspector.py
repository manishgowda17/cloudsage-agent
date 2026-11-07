"""Kubernetes Manifest & Repository Inspector.

Parses, audits, and extracts deep diagnostic evidence from:
1. Direct Kubernetes YAML manifests (plain text or uploaded files)
2. ZIP archives containing Kubernetes manifests or Helm charts
3. Remote GitHub repository URLs containing K8s manifests

Performs static analysis without requiring a live Kubernetes cluster.
"""

import io
import os
import re
import zipfile
from typing import Any, Dict, List, Optional, Tuple, Set
import httpx
import yaml
from app.core.logging import logger


class LineLoader(yaml.SafeLoader):
    """Custom YAML loader that tracks line numbers for mapping keys."""
    pass


def _construct_mapping(loader: yaml.Loader, node: yaml.MappingNode) -> Dict[str, Any]:
    loader.flatten_mapping(node)
    mapping: Dict[str, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        val = loader.construct_object(value_node)
        mapping[key] = val
        if isinstance(key, str):
            mapping[f"__line_{key}__"] = key_node.start_mark.line + 1
    mapping["__line__"] = node.start_mark.line + 1
    return mapping


LineLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_mapping)


class ManifestInspector:
    """Audits Kubernetes manifests for syntax errors, deprecated APIs, probe failures, selector mismatches, and resource limits."""

    DEPRECATED_APIS = {
        "Deployment": {
            "extensions/v1beta1": "apps/v1",
            "apps/v1beta1": "apps/v1",
            "apps/v1beta2": "apps/v1",
        },
        "StatefulSet": {
            "apps/v1beta1": "apps/v1",
            "apps/v1beta2": "apps/v1",
        },
        "DaemonSet": {
            "extensions/v1beta1": "apps/v1",
            "apps/v1beta1": "apps/v1",
        },
        "CronJob": {
            "batch/v1beta1": "batch/v1",
        },
        "Ingress": {
            "extensions/v1beta1": "networking.k8s.io/v1",
            "networking.k8s.io/v1beta1": "networking.k8s.io/v1",
        },
        "HorizontalPodAutoscaler": {
            "autoscaling/v2beta1": "autoscaling/v2",
            "autoscaling/v2beta2": "autoscaling/v2",
        },
        "NetworkPolicy": {
            "extensions/v1beta1": "networking.k8s.io/v1",
        },
    }

    VALID_MEMORY_REGEX = re.compile(r"^[0-9]+(\.[0-9]+)?(E|P|T|G|M|k|Ei|Pi|Ti|Gi|Mi|Ki)?$")

    @staticmethod
    def _sanitize_helm_templates(raw_content: str) -> str:
        """Preprocess Go / Helm templates into valid YAML for structural AST inspection."""
        cleaned_lines = []
        for line in raw_content.splitlines():
            trimmed = line.strip()
            # If line is a Helm control flow statement, comment it out to preserve line numbering
            if re.match(r"^\{\{-?\s*(if|range|with|end|else|define|include|template)", trimmed):
                indent = len(line) - len(line.lstrip())
                cleaned_lines.append(" " * indent + "# " + trimmed)
            elif "{{" in line and "}}" in line:
                # Replace unquoted {{ ... }} with a safe scalar string
                cleaned_line = re.sub(r"\{\{.*?\}\}", "helm-value", line)
                cleaned_lines.append(cleaned_line)
            else:
                cleaned_lines.append(line)
        return "\n".join(cleaned_lines)

    @staticmethod
    def parse_yaml_documents(
        yaml_content: str, source_name: str = "manifest.yaml"
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Safely parse multi-document YAML into resource dictionaries with line tracking.
        
        Returns:
            Tuple of (resources_list, syntax_issues_list)
        """
        resources: List[Dict[str, Any]] = []
        syntax_issues: List[Dict[str, Any]] = []

        if not yaml_content or not yaml_content.strip():
            syntax_issues.append({
                "severity": "ERROR",
                "resource": f"File/{source_name}",
                "file": source_name,
                "field": "content",
                "line": 1,
                "explanation": "Manifest content is empty or contains only whitespace.",
                "fix": "Provide valid Kubernetes YAML manifest definitions.",
            })
            return resources, syntax_issues

        # If this manifest contains Helm Go template directives, sanitize and parse
        if "{{" in yaml_content and "}}" in yaml_content:
            try:
                sanitized = ManifestInspector._sanitize_helm_templates(yaml_content)
                helm_resources = []
                for doc in yaml.load_all(sanitized, Loader=LineLoader):
                    if doc is not None and isinstance(doc, dict):
                        doc["_source_file"] = source_name
                        doc["_is_helm_template"] = True
                        helm_resources.append(doc)
                if helm_resources:
                    logger.info(f"Successfully sanitized and rendered Helm chart template: {source_name}")
                    return helm_resources, []
            except Exception as helm_err:
                logger.debug(f"Pre-sanitization for Helm template had error, falling back to direct parse: {helm_err}")

        # Primary attempt: Parse directly
        try:
            for doc in yaml.load_all(yaml_content, Loader=LineLoader):
                if doc is None:
                    continue
                if not isinstance(doc, dict):
                    syntax_issues.append({
                        "severity": "ERROR",
                        "resource": f"Document/{source_name}",
                        "file": source_name,
                        "field": "root",
                        "line": 1,
                        "explanation": f"YAML document is not a valid Kubernetes object mapping (got {type(doc).__name__}).",
                        "fix": "Each YAML document must be a mapping with 'apiVersion', 'kind', and 'metadata'.",
                    })
                    continue

                doc["_source_file"] = source_name
                resources.append(doc)
            return resources, syntax_issues
        except yaml.MarkedYAMLError as e:
            # Secondary attempt: If this is a Helm chart template with Go syntax, sanitize and retry
            if "{{" in yaml_content and "}}" in yaml_content:
                try:
                    sanitized = ManifestInspector._sanitize_helm_templates(yaml_content)
                    helm_resources = []
                    for doc in yaml.load_all(sanitized, Loader=LineLoader):
                        if doc is not None and isinstance(doc, dict):
                            doc["_source_file"] = source_name
                            doc["_is_helm_template"] = True
                            helm_resources.append(doc)
                    if helm_resources:
                        logger.info(f"Successfully sanitized and rendered Helm chart template: {source_name}")
                        return helm_resources, []
                except Exception as helm_err:
                    logger.debug(f"Helm template fallback also encountered syntax error: {helm_err}")

            line = e.problem_mark.line + 1 if e.problem_mark else 1
            col = e.problem_mark.column + 1 if e.problem_mark else 1
            msg = f"{e.problem} ({e.context or ''})".strip()
            syntax_issues.append({
                "severity": "ERROR",
                "resource": f"YAML/{source_name}",
                "file": source_name,
                "field": "syntax",
                "line": line,
                "explanation": f"YAML parsing syntax error at line {line}, column {col}: {msg}.",
                "fix": f"Correct the YAML syntax error at line {line} in {source_name}. Ensure proper indentation and matching quotes/brackets.",
            })
        except Exception as e:
            syntax_issues.append({
                "severity": "ERROR",
                "resource": f"YAML/{source_name}",
                "file": source_name,
                "field": "syntax",
                "line": 1,
                "explanation": f"Failed to parse YAML from {source_name}: {str(e)}",
                "fix": "Verify that the file is encoded in UTF-8 and contains valid YAML syntax.",
            })

        return resources, syntax_issues

    @staticmethod
    def extract_manifests_from_zip(
        zip_bytes: bytes, filename: str = "archive.zip"
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str], Optional[str]]:
        """Safely extract and parse all YAML files from an in-memory ZIP archive.
        
        Protects against zip bombs, path traversal, and corrupted archives.
        Returns:
            Tuple of (resources, syntax_issues, scanned_files, error_message)
        """
        resources: List[Dict[str, Any]] = []
        syntax_issues: List[Dict[str, Any]] = []
        scanned_files: List[str] = []

        if not zip_bytes:
            return resources, syntax_issues, scanned_files, "ZIP archive payload is empty or invalid."

        try:
            zip_buffer = io.BytesIO(zip_bytes)
            if not zipfile.is_zipfile(zip_buffer):
                return resources, syntax_issues, scanned_files, "The uploaded file is not a valid ZIP archive."

            with zipfile.ZipFile(zip_buffer) as zf:
                infolist = zf.infolist()
                if not infolist:
                    return resources, syntax_issues, scanned_files, "The uploaded ZIP archive contains no files."

                total_uncompressed_bytes = 0
                max_bytes = 100 * 1024 * 1024  # 100 MB safety limit
                max_total_files = 5000
                max_yaml_files = 500

                if len(infolist) > max_total_files:
                    return resources, syntax_issues, scanned_files, f"Archive exceeds maximum file count limit ({max_total_files} files)."

                for info in infolist:
                    total_uncompressed_bytes += info.file_size
                    if total_uncompressed_bytes > max_bytes:
                        return resources, syntax_issues, scanned_files, "ZIP archive exceeds safe decompression limit (100 MB)."

                    fname = info.filename
                    # Protect against path traversal
                    if fname.startswith("/") or ".." in fname or os.path.isabs(fname):
                        continue
                    # Skip metadata, hidden files, and git
                    if fname.startswith("__MACOSX/") or "/." in fname or fname.startswith("."):
                        continue

                    if fname.lower().endswith((".yaml", ".yml")):
                        if len(scanned_files) >= max_yaml_files:
                            break
                        scanned_files.append(fname)
                        try:
                            file_content = zf.read(fname).decode("utf-8", errors="replace")
                            docs, doc_issues = ManifestInspector.parse_yaml_documents(file_content, fname)
                            resources.extend(docs)
                            syntax_issues.extend(doc_issues)
                        except Exception as e:
                            syntax_issues.append({
                                "severity": "ERROR",
                                "resource": f"File/{fname}",
                                "file": fname,
                                "field": "content",
                                "line": 1,
                                "explanation": f"Failed to read '{fname}' from ZIP: {str(e)}",
                                "fix": "Ensure file is encoded in UTF-8.",
                            })

        except zipfile.BadZipFile:
            return resources, syntax_issues, scanned_files, "Corrupted or invalid ZIP file format."
        except Exception as e:
            return resources, syntax_issues, scanned_files, f"Failed to extract ZIP archive: {str(e)}"

        if not scanned_files:
            return resources, syntax_issues, scanned_files, f"No Kubernetes YAML files (.yaml, .yml) found in '{filename}'."

        return resources, syntax_issues, scanned_files, None

    @staticmethod
    async def fetch_github_manifests(
        github_url: str,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str], Optional[str]]:
        """Fetch and parse Kubernetes YAML files from a public GitHub repository.
        
        Returns:
            Tuple of (resources, syntax_issues, scanned_files, error_message)
        """
        resources: List[Dict[str, Any]] = []
        syntax_issues: List[Dict[str, Any]] = []
        scanned_files: List[str] = []

        url_clean = github_url.strip()
        match = re.match(
            r"^https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?(?:/tree/([^/]+)(?:/(.+))?)?/?$",
            url_clean,
            re.IGNORECASE,
        )
        if not match:
            return (
                [],
                [],
                [],
                f"Invalid GitHub repository URL format: '{url_clean}'. Expected format: https://github.com/owner/repository",
            )

        owner = match.group(1)
        repo = match.group(2)
        target_branch = match.group(3)
        subpath = match.group(4) or ""

        # Branches to attempt for archive download
        branches_to_try = [target_branch] if target_branch else ["main", "master"]

        headers = {
            "User-Agent": "AI-Kubernetes-Agent/2.0",
            "Accept": "application/vnd.github.v3+json",
        }

        async with httpx.AsyncClient(timeout=18.0, follow_redirects=True) as client:
            zip_bytes: Optional[bytes] = None
            last_status = 200

            for branch in branches_to_try:
                archive_url = f"https://github.com/{owner}/{repo}/archive/refs/heads/{branch}.zip"
                try:
                    res = await client.get(archive_url, headers=headers)
                    if res.status_code == 200 and len(res.content) > 100:
                        zip_bytes = res.content
                        break
                    last_status = res.status_code
                except httpx.RequestError as e:
                    return [], [], [], f"Network error connecting to GitHub: {str(e)}"

            if not zip_bytes:
                # If archive returned 404, repository is private or nonexistent
                if last_status == 404:
                    return (
                        [],
                        [],
                        [],
                        f"GitHub repository '{owner}/{repo}' was not found or is private (HTTP 404). Please ensure the repository is public and the URL is spelled correctly.",
                    )
                return (
                    [],
                    [],
                    [],
                    f"Failed to retrieve repository '{owner}/{repo}' from GitHub (HTTP {last_status}).",
                )

            # Decompress and filter files by subpath if requested
            res_list, doc_issues, all_files, zip_err = ManifestInspector.extract_manifests_from_zip(
                zip_bytes, f"{repo}.zip"
            )
            if zip_err:
                return [], [], [], zip_err

            # Filter for subpath if specified
            if subpath:
                subpath_clean = subpath.strip("/").lower()
                filtered_res: List[Dict[str, Any]] = []
                filtered_files: List[str] = []
                for d in res_list:
                    src = d.get("_source_file", "").lower()
                    if subpath_clean in src:
                        filtered_res.append(d)
                for f in all_files:
                    if subpath_clean in f.lower():
                        filtered_files.append(f)

                if not filtered_files:
                    return (
                        [],
                        [],
                        [],
                        f"No Kubernetes YAML files found in path '{subpath}' within repository '{owner}/{repo}'.",
                    )
                return filtered_res, doc_issues, filtered_files, None

            return res_list, doc_issues, all_files, None

    @classmethod
    def audit_resources(
        cls,
        resources: List[Dict[str, Any]],
        source_label: str,
        parse_errors: Optional[List[Dict[str, Any]]] = None,
        scanned_files: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Perform comprehensive Senior SRE static audit on parsed Kubernetes manifests."""
        findings: List[Dict[str, Any]] = []
        if parse_errors:
            findings.extend(parse_errors)

        deployments: List[Dict[str, Any]] = []
        services: List[Dict[str, Any]] = []
        pods: List[Dict[str, Any]] = []

        total_resources = len(resources)
        unhealthy_workloads = 0

        # Collect services to match selectors against workloads
        for res in resources:
            if res.get("kind") == "Service":
                services.append(res)

        for res in resources:
            kind = res.get("kind")
            api_version = res.get("apiVersion")
            meta = res.get("metadata") or {}
            spec = res.get("spec") or {}
            name = meta.get("name")
            namespace = meta.get("namespace", "default")
            source_file = res.get("_source_file", source_label)
            res_line = res.get("__line__", 1)

            res_id = f"{kind or 'Resource'}/{name or 'unnamed'}"

            # 1. Required Top-Level Fields Check
            if not api_version:
                findings.append({
                    "severity": "ERROR",
                    "resource": res_id,
                    "file": source_file,
                    "field": "apiVersion",
                    "line": res_line,
                    "explanation": "Missing required field 'apiVersion'.",
                    "fix": f"Specify the correct apiVersion for {kind or 'this resource'}.",
                })

            if not kind:
                findings.append({
                    "severity": "ERROR",
                    "resource": f"Object/{name or 'unnamed'}",
                    "file": source_file,
                    "field": "kind",
                    "line": res_line,
                    "explanation": "Missing required field 'kind'.",
                    "fix": "Specify the Kubernetes resource kind (e.g. Deployment, Service, ConfigMap).",
                })

            if not name:
                findings.append({
                    "severity": "ERROR",
                    "resource": f"{kind or 'Resource'}/unnamed",
                    "file": source_file,
                    "field": "metadata.name",
                    "line": meta.get("__line__", res_line),
                    "explanation": "Missing required field 'metadata.name'.",
                    "fix": "Provide a unique metadata.name adhering to DNS-1123 label standards.",
                })

            # 2. Deprecated / Removed API Versions Check
            if kind in cls.DEPRECATED_APIS and api_version:
                deprecated_map = cls.DEPRECATED_APIS[kind]
                if api_version in deprecated_map:
                    correct_api = deprecated_map[api_version]
                    findings.append({
                        "severity": "ERROR",
                        "resource": res_id,
                        "file": source_file,
                        "field": "apiVersion",
                        "line": res.get("__line_apiVersion__", res_line),
                        "explanation": f"apiVersion '{api_version}' for {kind} is deprecated/removed in Kubernetes 1.16+. Use '{correct_api}' instead.",
                        "fix": f"Change 'apiVersion: {api_version}' to 'apiVersion: {correct_api}'.",
                    })

            # 3. Workload Audits (Deployment, StatefulSet, DaemonSet, Pod, Job, CronJob)
            if kind in ("Deployment", "StatefulSet", "DaemonSet", "Pod", "Job", "CronJob"):
                workload_has_issue = False

                if kind == "Pod":
                    pod_spec = spec
                    pod_meta = meta
                elif kind == "CronJob":
                    job_spec = spec.get("jobTemplate", {}).get("spec", {})
                    template = job_spec.get("template", {})
                    pod_spec = template.get("spec", {})
                    pod_meta = template.get("metadata", {})
                else:
                    template = spec.get("template", {})
                    pod_spec = template.get("spec", {})
                    pod_meta = template.get("metadata", {})

                template_labels = pod_meta.get("labels") or {}
                containers = pod_spec.get("containers") or []

                # Selector vs Template Labels Matching (Deployment, StatefulSet, DaemonSet)
                if kind in ("Deployment", "StatefulSet", "DaemonSet"):
                    selector = spec.get("selector")
                    match_labels = selector.get("matchLabels") if isinstance(selector, dict) else None

                    if not selector or not isinstance(selector, dict):
                        workload_has_issue = True
                        findings.append({
                            "severity": "ERROR",
                            "resource": res_id,
                            "file": source_file,
                            "field": "spec.selector",
                            "line": spec.get("__line_selector__", res_line),
                            "explanation": f"{kind} is missing required 'spec.selector.matchLabels'.",
                            "fix": "Define 'spec.selector.matchLabels' matching your template labels.",
                        })
                    elif not match_labels or not isinstance(match_labels, dict):
                        workload_has_issue = True
                        findings.append({
                            "severity": "ERROR",
                            "resource": res_id,
                            "file": source_file,
                            "field": "spec.selector.matchLabels",
                            "line": selector.get("__line_matchLabels__", res_line),
                            "explanation": f"{kind} 'spec.selector' must specify non-empty 'matchLabels'.",
                            "fix": "Provide key-value pairs under 'spec.selector.matchLabels'.",
                        })
                    else:
                        for k, v in match_labels.items():
                            if k.startswith("__"):
                                continue
                            if k not in template_labels or template_labels[k] != v:
                                workload_has_issue = True
                                actual_val = template_labels.get(k, "<missing>")
                                findings.append({
                                    "severity": "ERROR",
                                    "resource": res_id,
                                    "file": source_file,
                                    "field": f"spec.selector.matchLabels.{k}",
                                    "line": match_labels.get(f"__line_{k}__", res_line),
                                    "explanation": f"Selector label mismatch: 'spec.selector.matchLabels' expects '{k}: {v}', but pod template has '{k}: {actual_val}'.",
                                    "fix": f"Update pod template labels to include '{k}: {v}'.",
                                })

                    # Replicas Validation
                    if "replicas" in spec:
                        reps = spec["replicas"]
                        if not isinstance(reps, int) or reps < 0:
                            workload_has_issue = True
                            findings.append({
                                "severity": "ERROR",
                                "resource": res_id,
                                "file": source_file,
                                "field": "spec.replicas",
                                "line": spec.get("__line_replicas__", res_line),
                                "explanation": f"Invalid replicas value: '{reps}'. Must be a non-negative integer.",
                                "fix": "Set 'spec.replicas' to 1 or higher.",
                            })

                # Containers List Validation
                if not containers or not isinstance(containers, list):
                    workload_has_issue = True
                    findings.append({
                        "severity": "ERROR",
                        "resource": res_id,
                        "file": source_file,
                        "field": "spec.template.spec.containers",
                        "line": pod_spec.get("__line_containers__", res_line),
                        "explanation": f"{kind} pod spec must define at least one container in 'containers'.",
                        "fix": "Add a container definition under 'spec.template.spec.containers'.",
                    })

                container_models: List[Dict[str, Any]] = []
                for idx, c in enumerate(containers):
                    if not isinstance(c, dict):
                        continue
                    c_name = c.get("name") or f"container-{idx}"
                    image = c.get("image")
                    c_line = c.get("__line__", res_line)

                    # Container Image Checks
                    if not image or not str(image).strip():
                        workload_has_issue = True
                        findings.append({
                            "severity": "ERROR",
                            "resource": res_id,
                            "file": source_file,
                            "field": f"containers[{idx}].image",
                            "line": c.get("__line_image__", c_line),
                            "explanation": f"Container '{c_name}' has an empty or missing image.",
                            "fix": "Specify a valid container image repository and tag (e.g. nginx:1.25-alpine).",
                        })
                    else:
                        img_str = str(image).strip()
                        if ":" not in img_str or img_str.endswith(":latest"):
                            findings.append({
                                "severity": "WARNING",
                                "resource": res_id,
                                "file": source_file,
                                "field": f"containers[{idx}].image",
                                "line": c.get("__line_image__", c_line),
                                "explanation": f"Container '{c_name}' uses unpinned or ':latest' image tag ('{img_str}'). Risks non-deterministic deployments.",
                                "fix": f"Pin the container image to an explicit version tag (e.g. {img_str.split(':')[0]}:1.0.0).",
                            })

                    # Container Ports Checks
                    ports = c.get("ports") or []
                    if isinstance(ports, list):
                        seen_ports: Set[int] = set()
                        for p_idx, p in enumerate(ports):
                            if isinstance(p, dict) and "containerPort" in p:
                                c_port = p["containerPort"]
                                p_line = p.get("__line_containerPort__", c_line)
                                if not isinstance(c_port, int) or c_port <= 0 or c_port > 65535:
                                    workload_has_issue = True
                                    findings.append({
                                        "severity": "ERROR",
                                        "resource": res_id,
                                        "file": source_file,
                                        "field": f"containers[{idx}].ports[{p_idx}].containerPort",
                                        "line": p_line,
                                        "explanation": f"Invalid containerPort '{c_port}'. Port must be an integer between 1 and 65535.",
                                        "fix": "Specify a valid port number (e.g. 80, 443, 8080).",
                                    })
                                elif c_port in seen_ports:
                                    findings.append({
                                        "severity": "WARNING",
                                        "resource": res_id,
                                        "file": source_file,
                                        "field": f"containers[{idx}].ports[{p_idx}].containerPort",
                                        "line": p_line,
                                        "explanation": f"Duplicate containerPort '{c_port}' defined in container '{c_name}'.",
                                        "fix": "Remove the duplicate port entry.",
                                    })
                                else:
                                    seen_ports.add(c_port)

                    # Probes Inspection (Liveness & Readiness)
                    liveness = c.get("livenessProbe")
                    readiness = c.get("readinessProbe")

                    if kind in ("Deployment", "StatefulSet", "DaemonSet"):
                        if not liveness:
                            workload_has_issue = True
                            findings.append({
                                "severity": "WARNING",
                                "resource": res_id,
                                "file": source_file,
                                "field": f"containers[{idx}].livenessProbe",
                                "line": c_line,
                                "explanation": f"Container '{c_name}' is missing a livenessProbe. The container cannot self-heal or restart if the process deadlocks.",
                                "fix": "Add a livenessProbe (e.g., httpGet: path: /healthz, port: 8080).",
                            })

                        if not readiness:
                            workload_has_issue = True
                            findings.append({
                                "severity": "WARNING",
                                "resource": res_id,
                                "file": source_file,
                                "field": f"containers[{idx}].readinessProbe",
                                "line": c_line,
                                "explanation": f"Container '{c_name}' is missing a readinessProbe. Service traffic may be routed before application initialization completes.",
                                "fix": "Add a readinessProbe (e.g., httpGet: path: /ready, port: 8080).",
                            })

                    # Inspect Probe Configurations
                    for probe_key, probe_obj in [("livenessProbe", liveness), ("readinessProbe", readiness)]:
                        if isinstance(probe_obj, dict):
                            probe_line = probe_obj.get("__line__", c_line)
                            handlers = [h for h in ("httpGet", "exec", "tcpSocket", "grpc") if h in probe_obj]
                            if len(handlers) == 0:
                                workload_has_issue = True
                                findings.append({
                                    "severity": "ERROR",
                                    "resource": res_id,
                                    "file": source_file,
                                    "field": f"containers[{idx}].{probe_key}",
                                    "line": probe_line,
                                    "explanation": f"{probe_key} in container '{c_name}' has no check handler. Must define one of 'httpGet', 'exec', 'tcpSocket', or 'grpc'.",
                                    "fix": "Define a probe handler (e.g. httpGet: path: /healthz, port: 8080).",
                                })
                            elif len(handlers) > 1:
                                workload_has_issue = True
                                findings.append({
                                    "severity": "ERROR",
                                    "resource": res_id,
                                    "file": source_file,
                                    "field": f"containers[{idx}].{probe_key}",
                                    "line": probe_line,
                                    "explanation": f"{probe_key} in container '{c_name}' defines multiple handlers: {handlers}. Exactly one handler is permitted.",
                                    "fix": "Remove extraneous handlers so only one check mechanism remains.",
                                })

                            if "httpGet" in probe_obj and isinstance(probe_obj["httpGet"], dict):
                                hg = probe_obj["httpGet"]
                                if not hg.get("path") or not str(hg["path"]).startswith("/"):
                                    workload_has_issue = True
                                    findings.append({
                                        "severity": "ERROR",
                                        "resource": res_id,
                                        "file": source_file,
                                        "field": f"containers[{idx}].{probe_key}.httpGet.path",
                                        "line": hg.get("__line_path__", probe_line),
                                        "explanation": f"httpGet probe path '{hg.get('path')}' is invalid. Path must start with '/'.",
                                        "fix": "Set path to a valid endpoint, e.g. path: /healthz",
                                    })

                            # Probe Timing Checks
                            if "initialDelaySeconds" in probe_obj:
                                ids = probe_obj["initialDelaySeconds"]
                                if isinstance(ids, int) and ids < 0:
                                    workload_has_issue = True
                                    findings.append({
                                        "severity": "ERROR",
                                        "resource": res_id,
                                        "file": source_file,
                                        "field": f"containers[{idx}].{probe_key}.initialDelaySeconds",
                                        "line": probe_obj.get("__line_initialDelaySeconds__", probe_line),
                                        "explanation": f"initialDelaySeconds cannot be negative ({ids}).",
                                        "fix": "Set initialDelaySeconds to a non-negative integer (e.g. 10).",
                                    })
                                elif ids == 0 and "httpGet" in probe_obj:
                                    findings.append({
                                        "severity": "WARNING",
                                        "resource": res_id,
                                        "file": source_file,
                                        "field": f"containers[{idx}].{probe_key}.initialDelaySeconds",
                                        "line": probe_obj.get("__line_initialDelaySeconds__", probe_line),
                                        "explanation": f"{probe_key} initialDelaySeconds is 0. Risk of premature failure before the app server boots.",
                                        "fix": "Set initialDelaySeconds to 10-15s to allow container startup.",
                                    })

                    # Resource Limits & Requests Inspection
                    res_cfg = c.get("resources") or {}
                    limits = res_cfg.get("limits") or {} if isinstance(res_cfg, dict) else {}
                    requests = res_cfg.get("requests") or {} if isinstance(res_cfg, dict) else {}

                    if not limits.get("memory"):
                        workload_has_issue = True
                        findings.append({
                            "severity": "WARNING",
                            "resource": res_id,
                            "file": source_file,
                            "field": f"containers[{idx}].resources.limits.memory",
                            "line": c.get("__line_resources__", c_line),
                            "explanation": f"Container '{c_name}' has no memory limit specified. Vulnerable to node exhaustion and OOMKills.",
                            "fix": "Add 'resources.limits.memory' (e.g. memory: '512Mi').",
                        })
                    else:
                        mem_val = str(limits["memory"])
                        if not cls.VALID_MEMORY_REGEX.match(mem_val) or "mb" in mem_val.lower():
                            workload_has_issue = True
                            findings.append({
                                "severity": "ERROR",
                                "resource": res_id,
                                "file": source_file,
                                "field": f"containers[{idx}].resources.limits.memory",
                                "line": limits.get("__line_memory__", c_line),
                                "explanation": f"Invalid memory quantity format '{mem_val}'. Kubernetes expects binary SI units like '256Mi' or '1Gi', not 'Mb'.",
                                "fix": f"Change '{mem_val}' to '{re.sub('(?i)mb', 'Mi', mem_val)}'.",
                            })

                    # SecurityContext
                    sec = c.get("securityContext") or {}
                    if isinstance(sec, dict) and sec.get("privileged") is True:
                        findings.append({
                            "severity": "WARNING",
                            "resource": res_id,
                            "file": source_file,
                            "field": f"containers[{idx}].securityContext.privileged",
                            "line": sec.get("__line_privileged__", c_line),
                            "explanation": f"Container '{c_name}' runs in privileged mode, granting full root access to the host kernel.",
                            "fix": "Set 'privileged: false' and grant only required Linux capabilities.",
                        })

                    container_models.append({
                        "name": c_name,
                        "ready": not workload_has_issue,
                        "restart_count": 0,
                        "probes": {
                            "has_liveness": bool(liveness),
                            "has_readiness": bool(readiness),
                        },
                    })

                if workload_has_issue:
                    unhealthy_workloads += 1

                deployments.append({
                    "name": name or "unnamed",
                    "namespace": namespace,
                    "replicas": spec.get("replicas", 1) if isinstance(spec, dict) else 1,
                    "ready_replicas": 0 if workload_has_issue else 1,
                    "healthy": not workload_has_issue,
                    "source_file": source_file,
                })

                pods.append({
                    "name": f"{name or 'app'}-template",
                    "namespace": namespace,
                    "status": "IssuesFound" if workload_has_issue else "Healthy",
                    "phase": "Pending" if workload_has_issue else "Running",
                    "restart_count": 0,
                    "containers": container_models,
                })

            # 4. Service Validation
            elif kind == "Service":
                svc_ports = spec.get("ports") if isinstance(spec, dict) else None
                svc_selector = spec.get("selector") if isinstance(spec, dict) else None
                svc_line = res.get("__line__", 1)

                if not svc_ports or not isinstance(svc_ports, list):
                    findings.append({
                        "severity": "ERROR",
                        "resource": res_id,
                        "file": source_file,
                        "field": "spec.ports",
                        "line": spec.get("__line_ports__", svc_line) if isinstance(spec, dict) else svc_line,
                        "explanation": f"Service '{name}' must define at least one port mapping in 'spec.ports'.",
                        "fix": "Add port definition (e.g. - port: 80, targetPort: 8080).",
                    })

                # Cross-Resource Service Selector Alignment
                if svc_selector and isinstance(svc_selector, dict) and resources:
                    has_match = False
                    clean_selector = {k: v for k, v in svc_selector.items() if not k.startswith("__")}
                    for d in resources:
                        if d.get("kind") in ("Deployment", "StatefulSet", "DaemonSet", "Pod"):
                            d_template = d.get("spec", {}).get("template", {}) if d.get("kind") != "Pod" else d
                            t_labels = d_template.get("metadata", {}).get("labels") or {}
                            if all(t_labels.get(k) == v for k, v in clean_selector.items()):
                                has_match = True
                                break

                    if not has_match and clean_selector:
                        findings.append({
                            "severity": "ERROR",
                            "resource": res_id,
                            "file": source_file,
                            "field": "spec.selector",
                            "line": spec.get("__line_selector__", svc_line) if isinstance(spec, dict) else svc_line,
                            "explanation": f"Service selector {clean_selector} does not match any Deployment or Pod template labels in the submitted manifests.",
                            "fix": f"Ensure your Deployment template labels contain {clean_selector}.",
                        })

        # Synthesize top-level SRE Diagnosis
        error_count = sum(1 for f in findings if f["severity"] == "ERROR")
        warning_count = sum(1 for f in findings if f["severity"] == "WARNING")
        issues_count = len(findings)

        # Primary Root Cause formulation
        if issues_count == 0:
            root_cause = "No issues detected in submitted Kubernetes manifests."
            explanation = (
                f"Successfully audited {total_resources} Kubernetes resource(s) from '{source_label}'. "
                "All API versions, pod selectors, container probe configurations, port definitions, and resource limits conform to production standards."
            )
            fix = "Manifests are verified and ready for deployment."
            cmd = f"kubectl apply -f {source_label} --dry-run=server"
            confidence = 100
            prevention = "Continue enforcing automated manifest linting and policy enforcement in CI/CD pipelines."
        else:
            # Highlight top error or top warning
            first_err = next((f for f in findings if f["severity"] == "ERROR"), findings[0])
            root_cause = f"[{first_err['severity']}] {first_err['resource']}: {first_err['explanation']}"
            
            # Format human-readable summary
            breakdown_lines: List[str] = [
                f"Identified {issues_count} issue(s) ({error_count} Errors, {warning_count} Warnings) across {total_resources} inspected resource(s) in '{source_label}':\n"
            ]
            for idx, f in enumerate(findings[:8], 1):
                loc = f"{f.get('file')}:{f.get('line')}" if f.get("line") else f.get("file", "manifest")
                breakdown_lines.append(
                    f"{idx}. [{f['severity']}] {f['resource']} ({loc}, field: {f.get('field', 'spec')}):\n   {f['explanation']}"
                )
            if len(findings) > 8:
                breakdown_lines.append(f"\n...and {len(findings) - 8} more issues detailed below.")

            explanation = "\n".join(breakdown_lines)

            # Remediation instructions
            fix_lines = ["Actionable Remediation Steps:"]
            for idx, f in enumerate(findings[:4], 1):
                fix_lines.append(f"{idx}. {f['resource']}: {f['fix']}")
            fix = "\n".join(fix_lines)
            cmd = f"kubectl apply -f {source_label} --dry-run=client"
            confidence = 96 if error_count > 0 else 92
            prevention = "Implement pre-commit hooks running kubeconform, kube-linter, and OPA Gatekeeper to catch manifest defects prior to commit."

        # Convert findings to detected_issues format for compatibility
        detected_issues = [
            {
                "kind": f["resource"].split("/")[0] if "/" in f["resource"] else "Manifest",
                "name": f["resource"].split("/")[1] if "/" in f["resource"] else f["resource"],
                "namespace": "default",
                "reason": f["severity"],
                "message": f"[{f['severity']}] {f.get('field', 'spec')}: {f['explanation']} (file: {f.get('file')}, line: {f.get('line')})",
                "count": 1,
            }
            for f in findings
        ]

        probe_issues = [f for f in findings if "probe" in f.get("field", "").lower()]

        return {
            "pods": {
                "healthy": unhealthy_workloads == 0,
                "total_pods": len(pods),
                "unhealthy_count": unhealthy_workloads,
                "problematic_pods": [p for p in pods if p["status"] != "Healthy"],
            },
            "logs": {"collected_count": 0, "pod_logs": {}},
            "events": {
                "total_events": issues_count,
                "warning_events_count": issues_count,
                "detected_issues": detected_issues,
                "probe_events": probe_issues,
            },
            "deployments": {
                "healthy": unhealthy_workloads == 0,
                "total_deployments": len(deployments),
                "unhealthy_count": unhealthy_workloads,
                "problematic_deployments": [d for d in deployments if not d["healthy"]],
            },
            "network": {
                "healthy": len([f for f in findings if "Service" in f["resource"]]) == 0,
                "total_services": len(services),
                "problematic_services": [],
            },
            "manifest_audit": {
                "total_resources": total_resources,
                "unhealthy_workloads": unhealthy_workloads,
                "issues_count": issues_count,
                "errors_count": error_count,
                "warnings_count": warning_count,
                "source_label": source_label,
            },
            "findings": findings,
            "static_diagnosis": {
                "root_cause": root_cause,
                "explanation": explanation,
                "fix": fix,
                "kubectl_command": cmd,
                "confidence": confidence,
                "prevention": prevention,
                "findings": findings,
            },
        }


manifest_inspector = ManifestInspector()
