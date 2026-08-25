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

// Neon Noir — deep wine nodes with a magenta glow at the high end (bolder = higher score)
const COLOR_HIGH = new THREE.Color("#8052ff"); // >= 75 — Electric Iris
const COLOR_MID = new THREE.Color("#15846e"); // 45–75 — Deep Verdant
const COLOR_LOW = new THREE.Color("#9a9a9a"); // < 45 — Ash Gray

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

/* ── Scroll ratio, read imperatively ──
   Dala's canvas is one fixed background whose particle cloud MORPHS between
   baked shapes as you scroll. We can't ship their .glb models, so formations
   are generated procedurally instead — and unlike theirs, ours mean something:
   a scattered cloud (noise), the connected constellation (signal), and an
   ordered helix path (the roadmap).

   The ratio lives in a module ref updated by ONE passive listener. Never React
   state: a per-frame setState in SmoothScroll was already removed for
   re-rendering the whole app on every scroll frame. */
const scrollRatio = { current: 0 };
let scrollBound = false;
function bindScroll() {
  if (scrollBound || typeof window === "undefined") return;
  scrollBound = true;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollRatio.current = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
}

/** Loose spherical cloud — "scattered noise", the problem state. */
function cloudFormation(n: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    // deterministic pseudo-random so SSR/CSR and every frame agree
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 12345.6789;
    const c = Math.sin(i * 39.425) * 24634.6345;
    const f = (x: number) => (x - Math.floor(x)) * 2 - 1;
    pts.push(new THREE.Vector3(f(a), f(b), f(c)).normalize()
      .multiplyScalar(radius * (1.15 + 0.75 * Math.abs(f(a)))));
  }
  return pts;
}

/** Ordered helix — "the right things in the right order", the roadmap state. */
function pathFormation(n: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const angle = t * Math.PI * 3.2;
    pts.push(new THREE.Vector3(
      Math.cos(angle) * radius * 0.62,
      (t - 0.5) * radius * 3.1,
      Math.sin(angle) * radius * 0.62
    ));
  }
  return pts;
}

function ConstellationScene({
  tools,
  reducedMotion,
  background = false,
}: {
  tools: Tool[];
  reducedMotion: boolean;
  background?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lineRef = useRef<THREE.LineSegments>(null);
  const tmp = useRef(new THREE.Vector3());
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX / window.innerWidth - 0.5;
      target.current.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("mousemove", onMove);
    bindScroll();
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

  // Floating labels: high-score nodes, but spatially spread so the chips
  // never pile on top of each other (greedy min-distance pick).
  const labelled = useMemo(() => {
    const ranked = [...nodes].sort((a, b) => b.tool.score - a.tool.score);
    const chosen: NodeDatum[] = [];
    const MIN_DIST = 1.7; // world units (sphere radius ~2.05)
    for (const n of ranked) {
      if (chosen.length >= 5) break;
      if (chosen.every((c) => c.pos.distanceTo(n.pos) > MIN_DIST)) chosen.push(n);
    }
    return chosen;
  }, [nodes]);

  /* The three morph targets. Index 1 IS the existing sphere, so the hero looks
     exactly as before and the morph only happens further down the page. */
  const formations = useMemo(() => [
    cloudFormation(nodes.length, RADIUS),
    nodes.map((n) => n.pos.clone()),
    pathFormation(nodes.length, RADIUS),
  ], [nodes]);

  // Neighbour PAIRS (indices, not baked vertices) so the lines can follow the
  // nodes as they morph instead of being frozen to the sphere.
  const pairs = useMemo(() => {
    const out: [number, number][] = [];
    nodes.forEach((node, i) => {
      nodes
        .map((n, j) => ({ j, d: node.pos.distanceTo(n.pos) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .forEach(({ j }) => out.push([i, j]));
    });
    return out;
  }, [nodes]);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(pairs.length * 6), 3));
    return geo;
  }, [pairs]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    /* ── Morph on scroll ──
       Blend across the three formations by scroll position: cloud (top) ->
       constellation (middle) -> ordered path (bottom). Positions are lerped
       so the shape eases rather than snapping, and the connecting lines are
       rebuilt from the live positions so they travel with the nodes. */
    /* Scroll-morphing is a BACKGROUND behaviour only. In the hero the
       constellation is a contained figure — a labelled data object — and a
       figure that deforms as you scroll past reads as a glitch, not motion. */
    if (background && !reducedMotion && formations.length === 3) {
      const seg = scrollRatio.current * 2;          // 0..2 across three targets
      const i0 = Math.min(Math.floor(seg), 1);
      const blend = seg - i0;
      const from = formations[i0];
      const to = formations[i0 + 1];
      for (let i = 0; i < nodeRefs.current.length; i++) {
        const mesh = nodeRefs.current[i];
        if (!mesh || !from[i] || !to[i]) continue;
        tmp.current.copy(from[i]).lerp(to[i], blend);
        // gentle breathing so the field never looks frozen
        tmp.current.multiplyScalar(1 + Math.sin(t * 0.6 + i) * 0.012);
        mesh.position.lerp(tmp.current, 0.08);
      }
      const line = lineRef.current;
      if (line) {
        const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let p = 0; p < pairs.length; p++) {
          const a = nodeRefs.current[pairs[p][0]];
          const b = nodeRefs.current[pairs[p][1]];
          if (!a || !b) continue;
          attr.setXYZ(p * 2, a.position.x, a.position.y, a.position.z);
          attr.setXYZ(p * 2 + 1, b.position.x, b.position.y, b.position.z);
        }
        attr.needsUpdate = true;
      }
    }

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
    /* As a background, sit the mass right-of-centre so the hero copy reads on
       the left — the same composition as Dala's brain. */
    <group ref={groupRef} position={background ? [1.85, 0, 0] : [0, 0, 0]}>
      {/* faint outer wireframe shell for depth */}
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[RADIUS + 0.35, 1]} />
        <meshBasicMaterial
          color="#15846e"
          wireframe
          transparent
          opacity={0.07}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* constellation lines */}
      <lineSegments ref={lineRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color="#8052ff"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* nodes */}
      {nodes.map((node, i) => (
        <mesh
          key={node.tool.slug}
          position={node.pos}
          ref={(el) => { nodeRefs.current[i] = el; }}
        >
          <sphereGeometry args={[node.size, 16, 16]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.9} />
        </mesh>
      ))}

      {/* glowing core */}
      <mesh>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshBasicMaterial color="#8052ff" />
      </mesh>
      <pointLight color="#8052ff" intensity={2} distance={6} />

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
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--c-surface)]/85 border border-indigo-500/25 backdrop-blur-md whitespace-nowrap shadow-lg shadow-black/40">
            <span className="text-sm leading-none">{node.tool.icon}</span>
            <span className="text-[10px] font-bold text-[var(--c-ink)] leading-none">
              {node.tool.name}
            </span>
            <span
              className="text-[10px] font-mono font-bold leading-none"
              style={{
                color:
                  node.tool.score >= 75
                    ? "#8052ff"
                    : node.tool.score >= 45
                    ? "#8052ff"
                    : "#9a9a9a",
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

export default function LiveConstellation({
  tools,
  variant = "inline",
}: {
  tools: Tool[];
  /** "background" reproduces Dala's architecture: ONE fixed, full-viewport,
   *  negative-z canvas that every section scrolls over, rather than a visual
   *  boxed inside the hero. */
  variant?: "inline" | "background";
}) {
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

  // R3F's initial measurement of this container misses on first paint (the hero
  // is mid GSAP/Framer entrance), leaving the canvas at its 300x150 HTML default
  // — the constellation rendered as a small patch in the corner until the window
  // was resized. Nudging a resize once the canvas is up forces a correct measure.
  useEffect(() => {
    if (!mounted) return;
    const nudge = () => window.dispatchEvent(new Event("resize"));
    const raf = requestAnimationFrame(nudge);
    const t = setTimeout(nudge, 300);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [mounted]);

  const isBg = variant === "background";

  // Fail-safe: with no data (or before mount) render nothing but the void — the
  // page must never show a gap where the canvas would be.
  if (!mounted || tools.length === 0) {
    return isBg ? null : <div className="w-full h-full min-h-[350px] md:min-h-[500px]" />;
  }

  return (
    <div
      className={
        isBg
          ? "fixed inset-0 -z-10 pointer-events-none select-none"
          : "w-full h-full min-h-[350px] md:min-h-[500px] relative select-none"
      }
      aria-hidden={isBg ? true : undefined}
    >
      <Canvas
        camera={{ position: [0, 0, isBg ? 6.4 : 5.4], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <ambientLight intensity={1.4} />
        <ConstellationScene tools={tools} reducedMotion={reducedMotion} background={isBg} />
      </Canvas>
    </div>
  );
}
