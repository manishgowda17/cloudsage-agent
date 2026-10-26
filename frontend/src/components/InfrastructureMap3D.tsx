"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { ClusterItem } from "@/types";
import { Server, Cpu, Box, Radio, Activity, Eye, ShieldAlert, Sparkles, CheckCircle, AlertCircle } from "lucide-react";

interface NodeEntity {
  id: string;
  name: string;
  kind: "Cluster" | "ControlPlane" | "Worker" | "Service" | "Pod" | "Probe";
  status: "healthy" | "warning" | "error" | "offline";
  x: number;
  y: number;
  z: number;
  size: number;
  namespace?: string;
  restarts?: number;
  details: string;
  activeInvestigation?: boolean;
}

interface ConnectionEdge {
  from: string;
  to: string;
  active: boolean;
  status: "healthy" | "warning" | "error";
}

interface InfrastructureMap3DProps {
  cluster: ClusterItem | null;
  namespace: string;
  isInvestigating: boolean;
  currentStep?: string;
  onSelectTarget?: (target: string) => void;
  className?: string;
}

export const InfrastructureMap3D: React.FC<InfrastructureMap3DProps> = ({
  cluster,
  namespace,
  isInvestigating,
  currentStep,
  onSelectTarget,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeEntity | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("cluster-root");
  const [rotationAngle, setRotationAngle] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const isConnected = cluster?.status === "connected";

  // Construct truthful nodes based on cluster and active namespace
  const nodes: NodeEntity[] = useMemo(() => {
    const isClusterReady = isConnected;

    const baseNodes: NodeEntity[] = [
      {
        id: "cluster-root",
        name: cluster?.name || "K8s Cluster",
        kind: "Cluster",
        status: isClusterReady ? "healthy" : "offline",
        x: 0,
        y: 0,
        z: 0,
        size: 26,
        details: cluster?.server || "Local Endpoint: 127.0.0.1:52285",
        activeInvestigation: isInvestigating && currentStep === "pods",
      },
      {
        id: "cp-core",
        name: "Control Plane",
        kind: "ControlPlane",
        status: isClusterReady ? "healthy" : "offline",
        x: -120,
        y: -40,
        z: 25,
        size: 18,
        details: "kube-apiserver, etcd, scheduler",
      },
      {
        id: "dns-service",
        name: "CoreDNS Router",
        kind: "Service",
        status: isClusterReady ? "healthy" : "offline",
        x: 120,
        y: -45,
        z: 20,
        size: 16,
        details: "Cluster-internal DNS routing",
      },
      {
        id: "worker-node",
        name: "Worker Node 01",
        kind: "Worker",
        status: isClusterReady ? "healthy" : "offline",
        x: -80,
        y: 90,
        z: -15,
        size: 20,
        details: "containerd runtime | Ready",
      },
      {
        id: "workload-pod-1",
        name: `svc-backend [${namespace}]`,
        kind: "Pod",
        status: isClusterReady ? "healthy" : "offline",
        x: 80,
        y: 85,
        z: -10,
        size: 15,
        namespace,
        details: "Active workload pod in selected namespace",
        activeInvestigation: isInvestigating && currentStep === "deployments",
      },
      {
        id: "probe-agent",
        name: "Health Probes",
        kind: "Probe",
        status: isClusterReady ? "healthy" : "offline",
        x: 0,
        y: 140,
        z: 10,
        size: 14,
        details: "Liveness & Readiness probe monitoring agent",
        activeInvestigation: isInvestigating && (currentStep === "pods" || currentStep === "events"),
      },
    ];

    // If investigating, highlight active investigation nodes
    return baseNodes;
  }, [cluster, isConnected, namespace, isInvestigating, currentStep]);

  const edges: ConnectionEdge[] = useMemo(() => [
    { from: "cluster-root", to: "cp-core", active: true, status: isConnected ? "healthy" : "warning" },
    { from: "cluster-root", to: "dns-service", active: true, status: isConnected ? "healthy" : "warning" },
    { from: "cluster-root", to: "worker-node", active: true, status: isConnected ? "healthy" : "warning" },
    { from: "cluster-root", to: "workload-pod-1", active: true, status: isConnected ? "healthy" : "warning" },
    { from: "worker-node", to: "workload-pod-1", active: true, status: isConnected ? "healthy" : "warning" },
    { from: "workload-pod-1", to: "probe-agent", active: true, status: isConnected ? "healthy" : "warning" },
  ], [isConnected]);

  // Main Canvas 3D Projection Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let localAngle = 0;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * window.devicePixelRatio || canvas.height !== height * window.devicePixelRatio) {
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
      }

      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Subtle slow auto-rotation + mouse parallax influence
      localAngle += isInvestigating ? 0.012 : 0.003;
      setRotationAngle(localAngle);

      const rad = localAngle + mousePos.x * 0.4;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Project 3D nodes into 2D plane
      const projectedNodes = nodes.map((n) => {
        const rotX = n.x * cos - n.z * sin;
        const rotZ = n.z * cos + n.x * sin;
        const scale = 320 / (320 + rotZ);
        const projX = centerX + rotX * scale;
        const projY = centerY + (n.y + mousePos.y * 15) * scale;
        return {
          ...n,
          projX,
          projY,
          projScale: scale,
          depth: rotZ,
        };
      });

      // Sort by depth (painter's algorithm)
      projectedNodes.sort((a, b) => a.depth - b.depth);

      // Draw Connection Edges
      edges.forEach((edge) => {
        const fromNode = projectedNodes.find((n) => n.id === edge.from);
        const toNode = projectedNodes.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) return;

        ctx.beginPath();
        ctx.moveTo(fromNode.projX, fromNode.projY);
        ctx.lineTo(toNode.projX, toNode.projY);

        const strokeGradient = ctx.createLinearGradient(
          fromNode.projX,
          fromNode.projY,
          toNode.projX,
          toNode.projY
        );
        strokeGradient.addColorStop(0, "rgba(59, 130, 246, 0.4)");
        strokeGradient.addColorStop(1, "rgba(139, 92, 246, 0.3)");

        ctx.strokeStyle = strokeGradient;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Animated telemetry pulses along edges
        const pulseT = ((Date.now() / 1500) % 1);
        const px = fromNode.projX + (toNode.projX - fromNode.projX) * pulseT;
        const py = fromNode.projY + (toNode.projY - fromNode.projY) * pulseT;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isInvestigating ? "#f43f5e" : "#38bdf8";
        ctx.fill();
      });

      // Draw Nodes
      projectedNodes.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNodeId === node.id;
        const radius = node.size * node.projScale * (isHovered ? 1.25 : isSelected ? 1.15 : 1);

        // Glow ring
        if (node.activeInvestigation || isHovered || isSelected) {
          ctx.beginPath();
          ctx.arc(node.projX, node.projY, radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = node.activeInvestigation
            ? "rgba(244, 63, 94, 0.2)"
            : "rgba(37, 99, 235, 0.15)";
          ctx.fill();
        }

        // Node base circle
        ctx.beginPath();
        ctx.arc(node.projX, node.projY, radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          node.projX - radius * 0.3,
          node.projY - radius * 0.3,
          radius * 0.1,
          node.projX,
          node.projY,
          radius
        );

        if (!isConnected) {
          grad.addColorStop(0, "#94a3b8");
          grad.addColorStop(1, "#64748b");
        } else if (node.activeInvestigation) {
          grad.addColorStop(0, "#fda4af");
          grad.addColorStop(1, "#e11d48");
        } else if (node.kind === "Cluster") {
          grad.addColorStop(0, "#93c5fd");
          grad.addColorStop(1, "#1d4ed8");
        } else if (node.kind === "ControlPlane") {
          grad.addColorStop(0, "#c4b5fd");
          grad.addColorStop(1, "#6d28d9");
        } else {
          grad.addColorStop(0, "#6ee7b7");
          grad.addColorStop(1, "#059669");
        }

        ctx.fillStyle = grad;
        ctx.fill();

        // Node specular stroke
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.stroke();

        // Node label
        ctx.font = `600 ${Math.max(10, Math.round(11 * node.projScale))}px -apple-system, sans-serif`;
        ctx.fillStyle = "#0f172a";
        ctx.textAlign = "center";
        ctx.fillText(node.name, node.projX, node.projY + radius + 14);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, edges, hoveredNode, selectedNodeId, mousePos, isInvestigating, isConnected]);

  // Handle Mouse Hover / Raycasting Detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Normalised coord for subtle tilt
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 1.5,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 1.5,
    });

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const rad = rotationAngle + mousePos.x * 0.4;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let match: NodeEntity | null = null;
    for (const n of nodes) {
      const rotX = n.x * cos - n.z * sin;
      const rotZ = n.z * cos + n.x * sin;
      const scale = 320 / (320 + rotZ);
      const projX = centerX + rotX * scale;
      const projY = centerY + (n.y + mousePos.y * 15) * scale;
      const dist = Math.hypot(mouseX - projX, mouseY - projY);
      if (dist < n.size * scale + 10) {
        match = n;
        break;
      }
    }
    setHoveredNode(match);
  };

  const handleCanvasClick = () => {
    if (hoveredNode) {
      setSelectedNodeId(hoveredNode.id);
      if (onSelectTarget) {
        onSelectTarget(hoveredNode.id);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-xl shadow-luminous overflow-hidden p-6 ${className}`}
    >
      {/* Topology Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Dimensional Infrastructure Map (3D)
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-800 border border-blue-200">
                Live Topology
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Interactive coordinate mesh of active cluster components and telemetry routes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
              isConnected
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Cluster Reachable
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                Cluster Offline
              </>
            )}
          </span>
        </div>
      </div>

      {/* 3D Canvas Stage */}
      <div className="relative w-full h-[320px] bg-gradient-to-b from-slate-50/50 to-white/90 rounded-xl border border-slate-200/60 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Ambient Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(#2563eb 1px, transparent 1px), radial-gradient(#2563eb 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Floating Node Telemetry Tooltip */}
        {hoveredNode && (
          <div className="absolute top-4 left-4 pointer-events-none z-20 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-floating rounded-xl p-3 min-w-[220px]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                  {hoveredNode.kind}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    hoveredNode.status === "healthy"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {hoveredNode.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 mb-1">
                {hoveredNode.name}
              </p>
              <p className="text-[11px] text-slate-500 leading-snug">
                {hoveredNode.details}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Legend */}
        <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] text-slate-500 bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-slate-200/80 shadow-sm">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Cluster
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Workload
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Probe
          </span>
        </div>
      </div>
    </div>
  );
};
