"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function SphereScene({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const outerSphereRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Track mouse coordinates for smooth parallax tilt
  const mouse = useRef({ x: 0, y: 0 });
  const targetMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to ranges around center: -0.5 to 0.5
      targetMouse.current.x = (e.clientX / window.innerWidth) - 0.5;
      targetMouse.current.y = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Generate particle positions
  const [positions] = useState(() => {
    const count = 250;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 2.2 + Math.random() * 1.8; // distributed shell
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  });

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Pulse and rotate the core icosphere
    if (sphereRef.current) {
      if (!prefersReducedMotion) {
        const pulse = 1 + Math.sin(time * 1.5) * 0.06;
        sphereRef.current.scale.set(pulse, pulse, pulse);
        sphereRef.current.rotation.y = time * 0.12;
        sphereRef.current.rotation.x = time * 0.06;
      } else {
        sphereRef.current.rotation.y = time * 0.02;
      }
    }

    // Outer slow-spinning shell
    if (outerSphereRef.current) {
      outerSphereRef.current.rotation.y = -time * 0.05;
      outerSphereRef.current.rotation.z = time * 0.03;
    }

    // Orbit dust particles
    if (pointsRef.current) {
      if (!prefersReducedMotion) {
        pointsRef.current.rotation.y = -time * 0.05;
        pointsRef.current.rotation.x = time * 0.02;
      } else {
        pointsRef.current.rotation.y = -time * 0.01;
      }
    }

    // Smooth parallax lerp based on mouse movement
    if (!prefersReducedMotion && groupRef.current) {
      mouse.current.x += (targetMouse.current.x - mouse.current.x) * 0.04;
      mouse.current.y += (targetMouse.current.y - mouse.current.y) * 0.04;
      
      groupRef.current.rotation.y = mouse.current.x * 0.4;
      groupRef.current.rotation.x = -mouse.current.y * 0.4;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central Pulsing wireframe sphere */}
      <mesh ref={sphereRef}>
        <icosahedronGeometry args={[1.4, 2]} />
        <meshBasicMaterial
          color="#4338CA"
          wireframe
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Outer secondary wireframe layer */}
      <mesh ref={outerSphereRef}>
        <icosahedronGeometry args={[1.7, 1]} />
        <meshBasicMaterial
          color="#3730A3"
          wireframe
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Orbiting dust field */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#6366F1"
          size={0.035}
          sizeAttenuation
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Glowing core dot */}
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#6366F1" />
      </mesh>
    </group>
  );
}

export default function TechSphere() {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  if (!mounted) {
    return <div className="w-full h-full min-h-[350px] md:min-h-[450px]" />;
  }

  if (reducedMotion) {
    return (
      <div className="w-full h-full min-h-[350px] md:min-h-[450px] flex items-center justify-center relative">
        <div className="absolute w-[200px] h-[200px] rounded-full bg-indigo-500/5 blur-[80px]" />
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          fill="none"
          className="text-indigo-500/30 animate-[spin_120s_linear_infinite]"
        >
          <circle cx="110" cy="110" r="90" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" />
          <circle cx="110" cy="110" r="60" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="110" cy="110" r="12" stroke="currentColor" strokeWidth="1.5" />
          <line x1="20" y1="110" x2="200" y2="110" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          <line x1="110" y1="20" x2="110" y2="200" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          <line x1="46.36" y1="46.36" x2="173.64" y2="173.64" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[350px] md:min-h-[500px] relative select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(67,56,202,0.06),transparent_70%)] pointer-events-none" />
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: "none", position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      >
        <ambientLight intensity={1.5} />
        <SphereScene prefersReducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}