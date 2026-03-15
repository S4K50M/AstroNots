"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// --- 1. Glowing Aurora Ring ---
function AuroraRing() {
  const ringRef = useRef(null);
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = clock.getElapsedTime() * 0.3; // Spin
    // Pulsating size effect
    const scale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
    ringRef.current.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={ringRef} position={[0, 1.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.3, 0.15, 16, 100]} />
      {/* Additive blending makes it glow intensely when overlapping */}
      <meshBasicMaterial color="#a855f7" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

// --- 2. Magnetic Field Lines ---
function Magnetosphere() {
  return (
    <group>
      {/* Create 4 intersecting vertical rings to simulate dipole magnetic fields */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, (Math.PI / 4) * i, 0]}>
          <torusGeometry args={[2.5, 0.01, 16, 100]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// --- 3. Animated Solar Wind Particles ---
function SolarWind() {
  const count = 1000;
  const pointsRef = useRef(null);

  // Generate random starting positions for 1000 particles
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30; // X spread
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20; // Y spread
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 15; // Z depth (start far back)
    }
    return pos;
  }, []);

  // Animate particles moving towards the camera (Z axis)
  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.position.z += delta * 15; // Speed of solar wind
    if (pointsRef.current.position.z > 20) {
      pointsRef.current.position.z = -10; // Reset behind earth
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#22d3ee" size={0.04} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// --- 4. The Main Globe ---
function WireframeGlobe() {
  const globeRef = useRef(null);

  // Slow rotation
  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0015;
    }
  });

  return (
    // Scaled up massively and pushed down on the Y axis so only the North Pole shows
    <group ref={globeRef} position={[0, -2.8, 0]} scale={[2.2, 2.2, 2.2]}>
      {/* Core (Solid Black to hide particles passing behind it) */}
      <mesh>
        <sphereGeometry args={[1.98, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* Outer Wireframe */}
      <mesh>
        <sphereGeometry args={[2, 48, 48]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <AuroraRing />
      <Magnetosphere />
    </group>
  );
}

// --- MAIN EXPORT ---
export default function Earth3D() {
  return (
    // Fixed to the background, blocking user interaction so they can click UI elements instead
    <div className="absolute inset-0 z-0 pointer-events-none w-full h-full overflow-hidden">
      <Canvas camera={{ position: [0, 1.5, 6], fov: 60 }}>
        {/* Fog adds depth so particles fade into the darkness */}
        <fog attach="fog" args={["#000000", 3, 12]} />
        <SolarWind />
        <WireframeGlobe />
      </Canvas>
      
      {/* Gradient vignette to blend the edges of the canvas into the UI */}
      <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void opacity-80 pointer-events-none" />
    </div>
  );
}