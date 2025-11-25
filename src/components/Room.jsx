import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera, useTexture, useVideoTexture, Text as DreiText, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { LayoutProvider } from './LayoutContext';

function StarField({ count = 1000 }) {
  const mesh = useRef();
  const light = useRef();

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const x = Math.random() * 100 - 50;
      const y = Math.random() * 100 - 50;
      const z = Math.random() * 100 - 50;
      temp.push({ t, factor, speed, x, y, z, mx: 0, my: 0 });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    particles.forEach((particle, i) => {
      let { t, factor, speed, x, y, z } = particle;
      t = particle.t += speed / 2;
      const a = Math.cos(t) + Math.sin(t * 1) / 10;
      const b = Math.sin(t) + Math.cos(t * 2) / 10;
      const s = Math.cos(t);

      // Move particles towards camera to simulate flying
      particle.z += 0.1;
      if (particle.z > 20) particle.z = -50;

      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.scale.set(s, s, s);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();

      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[null, null, count]}>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshPhongMaterial color="#ffffff" />
      </instancedMesh>
    </>
  );
}

import cockpitVideo from '../assets/Animatedcockpit.mp4';

import { useControls, Leva } from 'leva';

function CockpitBackground({ position, scale }) {
  const texture = useVideoTexture(cockpitVideo);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  return (
    <mesh position={position} scale={[scale, scale, 1]} renderOrder={-1}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent={true} opacity={1} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

import { useSpring, animated } from '@react-spring/three';

function ExpandableScreen({
  buttonPos, buttonRot, buttonLabel,
  alignedPos, alignedRot, alignedScale,
  focusedPos, focusedRot, focusedScale,
  children,
  width, height,
  color,
  nodeRef,
  isActive,
  onToggle
}) {
  console.log('ExpandableScreen rendering:', buttonLabel);
  const [hovered, setHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false); // Local focus state for zooming
  useCursor(hovered);

  // Reset focus when closed
  React.useEffect(() => {
    if (!isActive) setIsFocused(false);
  }, [isActive]);

  // Spring for the Window Animation
  const { winPos, winRot, winScale, winOpacity } = useSpring({
    winPos: !isActive ? buttonPos : (isFocused ? focusedPos : alignedPos),
    winRot: !isActive ? buttonRot : (isFocused ? focusedRot : alignedRot),
    winScale: !isActive ? [0.1, 0.1, 0.1] : (isFocused ? focusedScale : alignedScale),
    winOpacity: !isActive ? 0 : 1,
    config: { mass: 1, tension: 170, friction: 26 }
  });

  return (
    <>
      {/* 1. The Button (Static Position) */}
      <group position={buttonPos} rotation={buttonRot}>
        <Html transform position={[0, 0, 0]} style={{ pointerEvents: 'auto' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            style={{
              padding: '10px 20px',
              background: isActive ? color : '#333',
              color: isActive ? '#000000' : '#ffffff',
              border: '1px solid #555',
              fontFamily: '"Press Start 2P", cursive',
              fontSize: '0.8rem',
              boxShadow: isActive ? 'none' : `4px 4px 0 ${color}`,
              transform: isActive ? 'translate(2px, 2px)' : 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.1s ease'
            }}
          >
            {buttonLabel}
          </button>
        </Html>
      </group>

      {/* 2. The Window (Animated Position) */}
      <animated.group
        position={winPos}
        rotation={winRot}
        scale={winScale}
        style={{ opacity: winOpacity }}
        visible={winOpacity.to(o => o > 0.1)} // Hide when fully closed
      >
        {isActive && (
          <Html
            transform
            style={{
              width: `${width}px`,
              height: `${height}px`,
              background: 'transparent',
              borderRadius: '4px',
              overflow: 'hidden',
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              marginTop: '60px'
            }}
          >
            {/* Header with Close Button */}
            <div style={{ height: '40px', background: `${color}40`, display: 'flex', justifyContent: 'flex-end', padding: '0 10px', alignItems: 'center' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  padding: '0 10px'
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
              onClick={(e) => {
                e.stopPropagation();
                // Zoom disabled as per user request
              }}
            >
              <div ref={nodeRef} style={{ width: '100%', height: '100%', overflowY: 'auto' }} />
            </div>
          </Html>
        )}
      </animated.group>
    </>
  );
}

function Scene({ setLeftNode, setCenterNode, setRightNode }) {
  console.log('Scene rendering');
  const [shopOpen, setShopOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const {
    cx, cy, cz, crx, cry, crz, cs,
    lbx, lby, lbz,
    rbx, rby, rbz,
    shopWinX, statusWinX, winY, winZ,
    bgX, bgY, bgZ, bgScale
  } = useControls('Layout', {
    // Center Screen
    cx: { value: 1.8, min: -20, max: 20, step: 0.1 },
    cy: { value: 3.4, min: -20, max: 20, step: 0.1 },
    cz: { value: -9.3, min: -20, max: 20, step: 0.1 },
    crx: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
    cry: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
    crz: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
    cs: { value: 1.2, min: 0.1, max: 5, step: 0.1 },

    // Left Button
    lbx: { value: -2.5, min: -30, max: 30, step: 0.1 },
    lby: { value: -1.3, min: -20, max: 20, step: 0.1 },
    lbz: { value: 12.4, min: -20, max: 20, step: 0.1 },

    // Right Button
    rbx: { value: 6.5, min: -30, max: 30, step: 0.1 },
    rby: { value: -1.4, min: -20, max: 20, step: 0.1 },
    rbz: { value: 12.4, min: -20, max: 20, step: 0.1 },

    // Window Positions
    shopWinX: { value: -5.2, min: -30, max: 30, step: 0.1 },
    statusWinX: { value: 9, min: -30, max: 30, step: 0.1 }, // User requested 9 for Status
    winY: { value: 4.5, min: -20, max: 20, step: 0.1 },
    winZ: { value: 5, min: -20, max: 20, step: 0.1 },

    // Background
    bgX: { value: 2, min: -50, max: 50, step: 0.1 },
    bgY: { value: 1.9, min: -50, max: 50, step: 0.1 },
    bgZ: { value: 25, min: -50, max: 50, step: 0.1 },
    bgScale: { value: 12.5, min: 1, max: 50, step: 0.1 },
  });

  // Hardcoded values based on user approval
  const camPos = [2, 2.5, 32];
  const camFov = 50;
  const orbitTarget = [2, 1, 0];

  // Center Screen Dimensions
  const centerWidth = 1400; // Reduced to 1400 to ensure buttons at -7.5 are clickable
  const centerHeight = 700;

  return (
    <>
      <PerspectiveCamera makeDefault position={camPos} fov={camFov} />
      <OrbitControls
        target={orbitTarget}
        enableZoom={false}
        enablePan={false}
        minDistance={32}
        maxDistance={32}
        minPolarAngle={Math.PI / 2.2}
        maxPolarAngle={Math.PI / 2.2}
        minAzimuthAngle={0}
        maxAzimuthAngle={0}
      />

      {/* Atmosphere */}
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 10, 40]} />

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
      <pointLight position={[-10, 10, -10]} intensity={1} color="#ff00ff" />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#ffffff" />

      {/* Cockpit Background */}
      <React.Suspense fallback={null}>
        <CockpitBackground position={[bgX, bgY, bgZ]} scale={bgScale} />
      </React.Suspense>

      {/* StarField Background */}
      <StarField />

      {/* Center Screen (Static) */}
      <group position={[cx, cy, cz]} rotation={[crx, cry, crz]} scale={cs}>
        {/* Hidden Frame for Hit Area if needed, or just remove mesh if totally invisible */}
        <mesh scale={[14, 7.2, 0.1]} visible={false}>
          <boxGeometry />
          <meshStandardMaterial color="#00ffff" />
        </mesh>
        <Html
          transform
          style={{
            width: `${centerWidth}px`,
            height: `${centerHeight}px`,
            background: 'transparent',
            borderRadius: '4px',
            border: 'none',
            boxShadow: 'none',
            overflow: 'hidden'
          }}
        >
          <div ref={setCenterNode} style={{ width: '100%', height: '100%', overflowY: 'auto' }} />
        </Html>
      </group>

      {/* Left Screen (Expandable) - SHOP */}
      <ExpandableScreen
        buttonPos={[lbx, lby, lbz]}
        buttonRot={[0, 0, 0]}
        buttonLabel="SHOP"
        alignedPos={[shopWinX, winY, winZ]}
        alignedRot={[0, 0, 0]}
        alignedScale={[0.4, 0.4, 0.4]}
        focusedPos={[0, 3.5, 25]}
        focusedRot={[0, 0, 0]}
        focusedScale={[1, 1, 1]}
        width={1000}
        height={1500}
        color="#ff00ff"
        nodeRef={setLeftNode}
        isActive={shopOpen}
        onToggle={() => setShopOpen(!shopOpen)}
      />

      {/* Right Screen (Expandable) - STATUS */}
      <ExpandableScreen
        buttonPos={[rbx, rby, rbz]}
        buttonRot={[0, 0, 0]} // Flat rotation
        buttonLabel="STATUS"
        alignedPos={[statusWinX, winY, winZ]}
        alignedRot={[0, 0, 0]}
        alignedScale={[0.4, 0.4, 0.4]}
        focusedPos={[0, 3.5, 25]}
        focusedRot={[0, 0, 0]}
        focusedScale={[1, 1, 1]}
        width={1000}
        height={1500}
        color="#00ff00"
        nodeRef={setRightNode}
        isActive={statusOpen}
        onToggle={() => setStatusOpen(!statusOpen)}
      />
    </>
  );
}

function Room({ children }) {
  console.log('Room rendering');
  const [leftNode, setLeftNode] = useState(null);
  const [centerNode, setCenterNode] = useState(null);
  const [rightNode, setRightNode] = useState(null);

  return (
    <LayoutProvider value={{ leftNode, centerNode, rightNode }}>
      <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
        <Leva theme={{ sizes: { rootWidth: '300px' }, colors: { elevation1: '#333' } }} />
        <Canvas gl={{ antialias: true }}>
          <Scene
            setLeftNode={setLeftNode}
            setCenterNode={setCenterNode}
            setRightNode={setRightNode}
          />
        </Canvas>
        {/* Render children (Game) outside Canvas so it can use DOM portals */}
        {children}
      </div>
    </LayoutProvider>
  );
}

export default Room;
