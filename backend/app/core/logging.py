"""Logging configuration supporting Loguru with standard library fallback."""

import sys

try:
    from loguru import logger

    def setup_logging():
        """Configure structured logging with Loguru."""
        logger.remove()
        logger.add(
            sys.stdout,
            colorize=True,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level="INFO",
        )
        return logger

except ImportError:
    import logging

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s - %(message)s",
    )
    logger = logging.getLogger("ai-kubernetes-agent")

    def setup_logging():
        return logger
