"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import * as THREE from "three";

function WireframeGlobe() {
  const globeRef = useRef<THREE.Mesh>(null);

  // Rotate the globe slowly on every frame
  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.001;
      globeRef.current.rotation.x += 0.0005;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Inner solid dark sphere */}
      <Sphere args={[2, 64, 64]}>
        <meshBasicMaterial color="#000000" />
      </Sphere>
      
      {/* Outer cyan wireframe */}
      <Sphere args={[2.02, 32, 32]}>
        <meshBasicMaterial color="#22d3ee" wireframe={true} transparent opacity={0.3} />
      </Sphere>

      {/* Aurora Simulation Glow (Top Pole) */}
      <pointLight position={[0, 2.5, 0]} color="#a855f7" intensity={50} distance={5} />
    </group>
  );
}

export default function Earth3D() {
  return (
    <div className="w-full h-full cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 1.5, 4.5], fov: 60 }}>
        <ambientLight intensity={0.1} />
        <WireframeGlobe />
        {/* Allows the user to drag and rotate the globe */}
        <OrbitControls enableZoom={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}