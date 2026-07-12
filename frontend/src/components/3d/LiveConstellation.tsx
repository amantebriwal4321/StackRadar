"use client";

/**
 * LiveConstellation — the homepage centerpiece.
 *
 * Unlike a decorative sphere, every node here is a REAL tracked tool pulled
 * from the API. Node size ∝ momentum score, colour ∝ score band, and the
 * top movers float as glass labels. This is "the intelligence made visible."
 */

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Tool } from "@/data/trends";

interface NodeDatum {
  tool: Tool;
  pos: THREE.Vector3;
  size: number;
  color: THREE.Color;
}

const COLOR_HIGH = new THREE.Color("#34D399"); // score >= 75
const COLOR_MID = new THREE.Color("#A78BFA"); // 45–75
const COLOR_LOW = new THREE.Color("#F472B6"); // < 45

function colorForScore(score: number): THREE.Color {
  if (score >= 75) return COLOR_HIGH;
  if (score >= 45) return COLOR_MID;
  return COLOR_LOW;
}

/** Evenly distribute N points on a sphere shell (Fibonacci lattice). */
function fibonacciSphere(n: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(n - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push(
      new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(radius)
    );
  }
  return pts;
}

function ConstellationScene({
  tools,
  reducedMotion,
}: {
  tools: Tool[];
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX / window.innerWidth - 0.5;
      target.current.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const RADIUS = 2.05;

  const nodes: NodeDatum[] = useMemo(() => {
    const ranked = [...tools].sort((a, b) => b.score - a.score).slice(0, 40);
    const positions = fibonacciSphere(ranked.length, RADIUS);
    return ranked.map((tool, i) => ({
      tool,
      pos: positions[i],
      size: 0.045 + (tool.score / 100) * 0.11,
      color: colorForScore(tool.score),
    }));
  }, [tools]);

  // Top movers get floating labels (real data)
  const labelled = useMemo(() => {
    return [...nodes]
      .sort((a, b) => b.tool.score - a.tool.score)
      .slice(0, 6);
  }, [nodes]);

  // Constellation lines: connect each labelled node to its 2 nearest neighbours
  const lineGeometry = useMemo(() => {
    const verts: number[] = [];
    for (const node of nodes) {
      const neighbours = nodes
        .filter((n) => n !== node)
        .map((n) => ({ n, d: node.pos.distanceTo(n.pos) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { n } of neighbours) {
        verts.push(node.pos.x, node.pos.y, node.pos.z, n.pos.x, n.pos.y, n.pos.z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [nodes]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      if (!reducedMotion) {
        mouse.current.x += (target.current.x - mouse.current.x) * 0.04;
        mouse.current.y += (target.current.y - mouse.current.y) * 0.04;
        groupRef.current.rotation.y = t * 0.06 + mouse.current.x * 0.5;
        groupRef.current.rotation.x = -mouse.current.y * 0.4;
      } else {
        groupRef.current.rotation.y = t * 0.02;
      }
    }
    if (shellRef.current) {
      shellRef.current.rotation.y = -t * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      {/* faint outer wireframe shell for depth */}
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[RADIUS + 0.35, 1]} />
        <meshBasicMaterial
          color="#6D28D9"
          wireframe
          transparent
          opacity={0.07}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* constellation lines */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial
          color="#A78BFA"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* nodes */}
      {nodes.map((node) => (
        <mesh key={node.tool.slug} position={node.pos}>
          <sphereGeometry args={[node.size, 16, 16]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.9} />
        </mesh>
      ))}

      {/* glowing core */}
      <mesh>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshBasicMaterial color="#C4B5FD" />
      </mesh>
      <pointLight color="#A78BFA" intensity={2} distance={6} />

      {/* floating labels for the top tools */}
      {labelled.map((node) => (
        <Html
          key={`label-${node.tool.slug}`}
          position={node.pos}
          center
          distanceFactor={7}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#111113]/85 border border-violet-500/25 backdrop-blur-md whitespace-nowrap shadow-lg shadow-black/40">
            <span className="text-sm leading-none">{node.tool.icon}</span>
            <span className="text-[10px] font-bold text-white leading-none">
              {node.tool.name}
            </span>
            <span
              className="text-[10px] font-mono font-bold leading-none"
              style={{
                color:
                  node.tool.score >= 75
                    ? "#34D399"
                    : node.tool.score >= 45
                    ? "#C4B5FD"
                    : "#F472B6",
              }}
            >
              {Math.round(node.tool.score)}
            </span>
          </div>
        </Html>
      ))}
    </group>
  );
}

export default function LiveConstellation({ tools }: { tools: Tool[] }) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!mounted || tools.length === 0) {
    return <div className="w-full h-full min-h-[350px] md:min-h-[500px]" />;
  }

  return (
    <div className="w-full h-full min-h-[350px] md:min-h-[500px] relative select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.08),transparent_70%)] pointer-events-none" />
      <Canvas
        camera={{ position: [0, 0, 5.4], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <ambientLight intensity={1.4} />
        <ConstellationScene tools={tools} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
