"""Edge Agent Collector Module."""

from .k8s_collector import KubernetesCollector
from .prometheus_collector import PrometheusCollector

__all__ = ["KubernetesCollector", "PrometheusCollector"]
