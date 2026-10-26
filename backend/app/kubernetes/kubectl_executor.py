"""Kubectl Executor Utility.

Safely executes kubectl CLI commands via Python subprocess with timeout
enforcement, output parsing, structured error handling, and Loguru logging.
"""

import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union
from app.core.logging import logger
from app.core.config import settings


@dataclass
class KubectlResult:
    """Structured response from a kubectl execution."""
    command: List[str]
    success: bool
    return_code: int
    stdout: str
    stderr: str
    data: Optional[Union[Dict[str, Any], List[Any]]] = None
    error_message: Optional[str] = None


class KubectlExecutor:
    """Executes kubectl commands safely without crashing when cluster/binary is unavailable."""

    def __init__(self, kubeconfig_path: Optional[str] = None, timeout_seconds: int = 15):
        self.kubeconfig_path = kubeconfig_path or settings.KUBECONFIG_PATH or os.environ.get("KUBECONFIG", "")
        self.timeout_seconds = timeout_seconds
        self.kubectl_bin = shutil.which("kubectl") or "kubectl"

    def execute(
        self,
        args: List[str],
        parse_json: bool = False,
        context: Optional[str] = None,
    ) -> KubectlResult:
        """Execute a kubectl command with the provided arguments."""
        cmd = [self.kubectl_bin]

        if self.kubeconfig_path and os.path.exists(self.kubeconfig_path):
            cmd.extend(["--kubeconfig", self.kubeconfig_path])

        if context and "--context" not in args:
            cmd.extend(["--context", context])

        cmd.extend(args)
        cmd_str = " ".join(cmd)
        logger.debug(f"Executing kubectl command: {cmd_str}")

        try:
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
                check=False,
            )

            stdout = process.stdout.strip()
            stderr = process.stderr.strip()
            return_code = process.returncode
            success = return_code == 0

            parsed_data = None
            if success and parse_json and stdout:
                try:
                    parsed_data = json.loads(stdout)
                except json.JSONDecodeError as json_err:
                    logger.warning(f"Failed to parse JSON from kubectl output: {json_err}")

            if not success:
                logger.warning(
                    f"kubectl command failed (exit code {return_code}): {cmd_str}\nStderr: {stderr[:300]}"
                )

            return KubectlResult(
                command=cmd,
                success=success,
                return_code=return_code,
                stdout=stdout,
                stderr=stderr,
                data=parsed_data,
                error_message=stderr if not success else None,
            )

        except subprocess.TimeoutExpired as timeout_err:
            msg = f"kubectl command timed out after {self.timeout_seconds}s: {cmd_str}"
            logger.error(msg)
            return KubectlResult(
                command=cmd,
                success=False,
                return_code=-1,
                stdout="",
                stderr=str(timeout_err),
                error_message=msg,
            )
        except FileNotFoundError:
            msg = f"kubectl executable not found on host. Searched for: {self.kubectl_bin}"
            logger.error(msg)
            return KubectlResult(
                command=cmd,
                success=False,
                return_code=-2,
                stdout="",
                stderr=msg,
                error_message=msg,
            )
        except Exception as exc:
            msg = f"Unexpected error executing kubectl: {str(exc)}"
            logger.exception(msg)
            return KubectlResult(
                command=cmd,
                success=False,
                return_code=-3,
                stdout="",
                stderr=str(exc),
                error_message=msg,
            )


# Global default instance
kubectl_executor = KubectlExecutor()
