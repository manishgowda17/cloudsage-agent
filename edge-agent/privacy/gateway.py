"""Privacy Gateway for Edge Agent.

Combines structured field filtering with multi-pattern regex redaction
and an explicit customer export allowlist. Fails closed on any ambiguity or violation.
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple


class PrivacyViolationError(Exception):
    """Raised when telemetry contains prohibited data or fails policy validation."""
    pass


class PrivacyGateway:
    """Enterprise-grade Privacy Gateway enforcing strict local redaction and allowlisting."""

    # Explicitly permitted metadata categories (anything else is blocked)
    DEFAULT_ALLOWLIST = {
        "cluster_health",
        "node_health",
        "pod_health",
        "resource_utilization",
        "error_categories",
        "incident_counts",
        "anonymized_incident_summaries",
        "alert_context",
        "reliability_scores",
        "approved_diagnostic_metadata",
    }

    # Prohibited field keys that must NEVER leave the customer boundary
    PROHIBITED_FIELDS = {
        "raw_logs",
        "raw_payload",
        "raw_manifest",
        "env",
        "envfrom",
        "secrets",
        "secret",
        "secretkeyref",
        "password",
        "passwd",
        "token",
        "bearer_token",
        "private_key",
        "kubeconfig",
        "client_key_data",
        "certificate_authority_data",
        "auth_credentials",
        "authorization",
        "aws_secret_access_key",
        "api_key",
    }

    # Sensitive pattern detectors
    PATTERN_AWS_KEY = re.compile(r'\b(AKIA[0-9A-Z]{16})\b')
    PATTERN_AWS_SECRET = re.compile(r'(?i)(?:aws_secret_access_key|aws_secret|secret_key)[\s:=]+["\']?([A-Za-z0-9/+=]{40})["\']?')
    PATTERN_BEARER_JWT = re.compile(r'(?i)\bbearer\s+([a-zA-Z0-9_\-\.]{20,})\b')
    PATTERN_API_KEY = re.compile(r'(?i)\b(?:api[_-]?key|apikey|auth[_-]?token|access[_-]?token)[\s:=]+["\']?([a-zA-Z0-9_\-]{16,})["\']?')
    PATTERN_PASSWORD = re.compile(r'(?i)\b(?:password|passwd|pwd)[\s:=]+["\']?([^\s"\'}{,;]+)["\']?')
    PATTERN_PRIVATE_KEY = re.compile(r'-----BEGIN (?:[A-Z\s]+)?PRIVATE KEY-----[\s\S]+?-----END (?:[A-Z\s]+)?PRIVATE KEY-----')
    PATTERN_DATABASE_URL = re.compile(r'(?i)(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^\s"\'<>]+')
    PATTERN_EMAIL = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

    def __init__(
        self,
        allowlist: Optional[Set[str]] = None,
        redact_pii: bool = True,
        fail_closed: bool = True,
    ):
        self.allowlist = set(allowlist) if allowlist else set(self.DEFAULT_ALLOWLIST)
        self.redact_pii = redact_pii
        self.fail_closed = fail_closed
        self.redaction_counter = 0
        self.blocked_export_counter = 0

    def redact_text(self, text: Optional[str]) -> Tuple[str, int]:
        """Redacts secrets, AWS credentials, tokens, database URIs, and PII from raw text strings."""
        if not text:
            return "", 0

        redacted = str(text)
        count = 0

        # 1. Private keys
        if self.PATTERN_PRIVATE_KEY.search(redacted):
            redacted = self.PATTERN_PRIVATE_KEY.sub("[REDACTED_PRIVATE_KEY]", redacted)
            count += 1

        # 2. AWS Key ID
        aws_keys = self.PATTERN_AWS_KEY.findall(redacted)
        if aws_keys:
            redacted = self.PATTERN_AWS_KEY.sub("[REDACTED_AWS_KEY_ID]", redacted)
            count += len(aws_keys)

        # 3. AWS Secret Access Key
        if self.PATTERN_AWS_SECRET.search(redacted):
            redacted = self.PATTERN_AWS_SECRET.sub("aws_secret_access_key: [REDACTED_AWS_SECRET]", redacted)
            count += 1

        # 4. Bearer / JWT
        if self.PATTERN_BEARER_JWT.search(redacted):
            redacted = self.PATTERN_BEARER_JWT.sub("Bearer [REDACTED_TOKEN]", redacted)
            count += 1

        # 5. Generic API Keys & Tokens
        if self.PATTERN_API_KEY.search(redacted):
            redacted = self.PATTERN_API_KEY.sub(r"api_key: [REDACTED_API_KEY]", redacted)
            count += 1

        # 6. Passwords
        if self.PATTERN_PASSWORD.search(redacted):
            redacted = self.PATTERN_PASSWORD.sub(r"password: [REDACTED_PASSWORD]", redacted)
            count += 1

        # 7. Database URLs
        if self.PATTERN_DATABASE_URL.search(redacted):
            redacted = self.PATTERN_DATABASE_URL.sub("[REDACTED_DATABASE_URL]", redacted)
            count += 1

        # 8. PII - Emails
        if self.redact_pii and self.PATTERN_EMAIL.search(redacted):
            redacted = self.PATTERN_EMAIL.sub("[REDACTED_EMAIL]", redacted)
            count += 1

        self.redaction_counter += count
        return redacted, count

    def contains_prohibited_fields(self, payload: Any) -> Tuple[bool, Optional[str]]:
        """Deep inspects dictionaries or lists to identify any prohibited keys."""
        if isinstance(payload, dict):
            for k, v in payload.items():
                k_clean = str(k).strip().lower().replace("-", "_")
                if k_clean in self.PROHIBITED_FIELDS:
                    return True, f"Prohibited field detected: '{k}'"
                # Check nested values
                prohibited, reason = self.contains_prohibited_fields(v)
                if prohibited:
                    return True, reason
        elif isinstance(payload, list):
            for item in payload:
                prohibited, reason = self.contains_prohibited_fields(item)
                if prohibited:
                    return True, reason

        return False, None

    def sanitize_dict_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitizes all text values in a dictionary."""
        sanitized: Dict[str, Any] = {}
        for k, v in data.items():
            if isinstance(v, str):
                redacted_str, _ = self.redact_text(v)
                sanitized[k] = redacted_str
            elif isinstance(v, dict):
                sanitized[k] = self.sanitize_dict_fields(v)
            elif isinstance(v, list):
                sanitized[k] = [
                    self.sanitize_dict_fields(x) if isinstance(x, dict)
                    else (self.redact_text(x)[0] if isinstance(x, str) else x)
                    for x in v
                ]
            else:
                sanitized[k] = v
        return sanitized

    def filter_and_approve_export(
        self,
        category: str,
        payload: Dict[str, Any],
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Evaluates whether telemetry is permitted to leave the customer boundary.
        
        Returns:
            Tuple of (is_approved, sanitized_payload, error_reason)
        """
        try:
            # 1. Allowlist enforcement
            clean_category = category.strip().lower()
            if clean_category not in self.allowlist:
                self.blocked_export_counter += 1
                return False, None, f"Category '{category}' is not in export allowlist"

            # 2. Prohibited field rejection
            has_prohibited, reason = self.contains_prohibited_fields(payload)
            if has_prohibited:
                self.blocked_export_counter += 1
                if self.fail_closed:
                    return False, None, f"Export rejected: {reason}"

            # 3. Structural & text redaction
            sanitized = self.sanitize_dict_fields(payload)

            return True, sanitized, None

        except Exception as exc:
            self.blocked_export_counter += 1
            if self.fail_closed:
                return False, None, f"Privacy Gateway failure (failed closed): {str(exc)}"
            raise PrivacyViolationError(f"Privacy Gateway encountered an error: {exc}")
