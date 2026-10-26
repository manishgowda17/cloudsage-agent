"""Google Gemini API LLM Client.

Uses HTTPX to interact directly with the Google Gemini REST API
(generateContent with responseMimeType="application/json").
Implements timeout handling, retries, error sanitization, and secret protection.
"""

import asyncio
import json
import re
from typing import Any, Dict, Optional
import httpx
from app.core.logging import logger
from app.core.config import settings

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class LLMClient:
    """Async client for Google Gemini API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: float = 35.0,
        max_retries: int = 2,
    ):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL or "gemini-2.5-flash"
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries

    @property
    def is_configured(self) -> bool:
        """Check if a Gemini API key is present."""
        return bool(self.api_key and self.api_key.strip())

    async def generate_diagnosis(
        self, system_prompt: str, user_prompt: str
    ) -> Optional[Dict[str, Any]]:
        """Call Google Gemini generateContent with retries and return parsed JSON."""
        if not self.is_configured:
            logger.warning(
                "GEMINI_API_KEY not configured. Employing Senior SRE Deterministic Correlation Engine."
            )
            return None

        masked_key = (
            f"{self.api_key[:6]}...{self.api_key[-4:]}"
            if len(self.api_key) > 10
            else "***"
        )
        logger.info(
            f"Dispatching diagnosis request to Google Gemini API (model: {self.model}, key: {masked_key})"
        )

        url = f"{GEMINI_API_BASE}/{self.model}:generateContent?key={self.api_key}"

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        headers = {
            "Content-Type": "application/json",
        }

        for attempt in range(1, self.max_retries + 2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        json=payload,
                    )

                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = (
                                candidates[0]
                                .get("content", {})
                                .get("parts", [])
                            )
                            if parts:
                                raw_text = parts[0].get("text", "")
                                return self._parse_json_content(raw_text)

                    logger.warning(
                        f"Google Gemini API returned HTTP {response.status_code} "
                        f"(attempt {attempt}/{self.max_retries + 1}): {response.text[:200]}"
                    )

            except httpx.TimeoutException:
                logger.warning(
                    f"Gemini API request timed out after {self.timeout_seconds}s (attempt {attempt})"
                )
            except Exception as exc:
                logger.warning(
                    f"Error during Gemini API invocation (attempt {attempt}): {str(exc)}"
                )

            if attempt <= self.max_retries:
                await asyncio.sleep(1.5 * attempt)

        logger.error("All Gemini API attempts exhausted. Falling back to SRE heuristic.")
        return None

    def _parse_json_content(self, content: str) -> Optional[Dict[str, Any]]:
        """Extract and parse JSON from model response text."""
        if not content:
            return None

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    pass

            start = content.find("{")
            end = content.rfind("}")
            if start != -1 and end != -1:
                try:
                    return json.loads(content[start : end + 1])
                except json.JSONDecodeError:
                    pass

            logger.error(f"Failed to parse JSON from Gemini output: {content[:300]}")
            return None


# Global default instance
llm_client = LLMClient()
