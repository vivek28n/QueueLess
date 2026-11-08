import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Checks whether WebGL is supported in the current environment
 */
const checkWebGLSupport = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

/**
 * Generates an offscreen CanvasTexture for a queue token with sharp typography
 */
const createTokenTexture = (tokenText, subtitle, isActive) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Disc background
  ctx.fillStyle = isActive ? '#0c1626' : '#080d1a';
  ctx.beginPath();
  ctx.arc(128, 128, 122, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.lineWidth = isActive ? 8 : 4;
  ctx.strokeStyle = isActive ? '#06b6d4' : '#1e293b';
  ctx.stroke();

  // Active inner glow ring
  if (isActive) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(128, 128, 108, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Token number
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isActive ? '#38bdf8' : '#e2e8f0';
  ctx.font = 'bold 74px "JetBrains Mono", monospace, -apple-system, sans-serif';
  ctx.fillText(tokenText, 128, 108);

  // Status badge subtext
  ctx.fillStyle = isActive ? '#10b981' : '#64748b';
  ctx.font = 'bold 22px "Plus Jakarta Sans", -apple-system, sans-serif';
  ctx.fillText(subtitle, 128, 172);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

/**
 * Generates screen texture for counter terminal
 */
const createDeskScreenTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, 256, 160);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 156);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('COUNTER 01', 20, 36);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('STATUS: ONLINE', 20, 68);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 28px "JetBrains Mono", monospace';
  ctx.fillText('SERVING: #01', 20, 112);

  ctx.fillStyle = '#6366f1';
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillText('IN LINE: 4 PATRONS', 20, 142);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

export const QueueHeroCanvas = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [hasWebGL] = useState(() => checkWebGLSupport());

  useEffect(() => {
    // 1. Skip if WebGL unsupported
    if (!hasWebGL) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Detect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Detect mobile device
    const isMobile = window.innerWidth < 768;

    // 2. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090d16, 0.04);

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 5.2, 11.5);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });

    // Cap device pixel ratio at 2 for performance
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // 3. Lighting Setup (Restrained Indigo & Cyan palette)
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 9, 6);
    scene.add(keyLight);

    // Cyan counter point light
    const cyanLight = new THREE.PointLight(0x06b6d4, 4.0, 14);
    cyanLight.position.set(-2.2, 2.5, 0.5);
    scene.add(cyanLight);

    // Indigo queue track point light
    const indigoLight = new THREE.PointLight(0x6366f1, 3.5, 14);
    indigoLight.position.set(2.5, 2.2, 2.0);
    scene.add(indigoLight);

    // Soft fill rim light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-6, -2, -4);
    scene.add(rimLight);

    // 4. Asset Collections for Disposal
    const disposables = [];

    // Helper to register disposable objects
    const registerDisposable = (item) => {
      if (item) disposables.push(item);
      return item;
    };

    // 5. Construct The Service Counter
    const deskGroup = new THREE.Group();
    deskGroup.position.set(-2.4, 0.2, -0.2);

    // Counter Top
    const deskTopGeo = registerDisposable(new THREE.BoxGeometry(3.6, 0.22, 1.8));
    const deskTopMat = registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x141d2e,
        roughness: 0.35,
        metalness: 0.6,
      })
    );
    const deskTop = new THREE.Mesh(deskTopGeo, deskTopMat);
    deskTop.position.y = 1.0;
    deskGroup.add(deskTop);

    // Counter Base / Pedestal
    const deskBaseGeo = registerDisposable(new THREE.BoxGeometry(3.4, 1.0, 1.6));
    const deskBaseMat = registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x090e1a,
        roughness: 0.6,
        metalness: 0.3,
      })
    );
    const deskBase = new THREE.Mesh(deskBaseGeo, deskBaseMat);
    deskBase.position.y = 0.45;
    deskGroup.add(deskBase);

    // Counter Front Accent Glow Bar
    const accentBarGeo = registerDisposable(new THREE.BoxGeometry(3.1, 0.05, 0.04));
    const accentBarMat = registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.8,
        roughness: 0.2,
      })
    );
    const accentBar = new THREE.Mesh(accentBarGeo, accentBarMat);
    accentBar.position.set(0, 0.7, 0.82);
    deskGroup.add(accentBar);

    // Counter Desk Screen Display
    const screenGeo = registerDisposable(new THREE.BoxGeometry(0.75, 0.52, 0.04));
    const screenTexture = registerDisposable(createDeskScreenTexture());
    const screenMat = registerDisposable(
      new THREE.MeshStandardMaterial({
        map: screenTexture,
        roughness: 0.25,
        metalness: 0.2,
      })
    );
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0.8, 1.42, 0.1);
    screenMesh.rotation.x = -0.15;
    screenMesh.rotation.y = -0.3;
    deskGroup.add(screenMesh);

    scene.add(deskGroup);

    // 6. Floor Queue Guide Rails (Subtle pathway)
    const trackGroup = new THREE.Group();
    const trackCurvePoints = [
      new THREE.Vector3(-1.0, 0.02, 0.2),
      new THREE.Vector3(0.5, 0.02, 0.8),
      new THREE.Vector3(1.8, 0.02, 1.8),
      new THREE.Vector3(2.8, 0.02, 3.2),
    ];

    const trackCurve = new THREE.CatmullRomCurve3(trackCurvePoints);
    const trackGeo = registerDisposable(
      new THREE.TubeGeometry(trackCurve, 32, 0.035, 8, false)
    );
    const trackMat = registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        emissive: 0x6366f1,
        emissiveIntensity: 0.6,
        roughness: 0.4,
      })
    );
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackGroup.add(trackMesh);

    // Floor subtle grid pad
    const gridPadGeo = registerDisposable(new THREE.PlaneGeometry(9.0, 7.0));
    const gridPadMat = registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x080c16,
        roughness: 0.9,
        metalness: 0.1,
      })
    );
    const gridPad = new THREE.Mesh(gridPadGeo, gridPadMat);
    gridPad.rotation.x = -Math.PI / 2;
    gridPad.position.y = -0.01;
    trackGroup.add(gridPad);

    scene.add(trackGroup);

    // 7. Floating Numbered Queue Tokens
    const tokenDefinitions = [
      { id: '#01', sub: '● SERVING', active: true, x: -1.4, z: 0.2, yBase: 1.7 },
      { id: '#02', sub: 'NEXT', active: false, x: 0.2, z: 0.7, yBase: 1.25 },
      { id: '#03', sub: 'WAITING', active: false, x: 1.3, z: 1.5, yBase: 1.05 },
      { id: '#04', sub: 'WAITING', active: false, x: 2.3, z: 2.4, yBase: 0.85 },
      { id: '#05', sub: 'IN LINE', active: false, x: 3.3, z: 3.4, yBase: 0.65 },
    ];

    const tokenMeshes = [];
    const tokenRadius = 0.58;
    const tokenDepth = 0.12;

    tokenDefinitions.forEach((def, index) => {
      const tokenGroup = new THREE.Group();
      tokenGroup.position.set(def.x, def.yBase, def.z);

      // Token disc body
      const cylinderGeo = registerDisposable(
        new THREE.CylinderGeometry(tokenRadius, tokenRadius, tokenDepth, 32)
      );

      // Top face canvas texture
      const discTexture = registerDisposable(createTokenTexture(def.id, def.sub, def.active));

      // Side material
      const sideMat = registerDisposable(
        new THREE.MeshStandardMaterial({
          color: def.active ? 0x0ea5e9 : 0x1e293b,
          metalness: 0.7,
          roughness: 0.25,
          emissive: def.active ? 0x0284c7 : 0x000000,
          emissiveIntensity: def.active ? 0.8 : 0,
        })
      );

      // Top face material
      const topMat = registerDisposable(
        new THREE.MeshStandardMaterial({
          map: discTexture,
          roughness: 0.25,
          metalness: 0.3,
        })
      );

      // Bottom material
      const bottomMat = registerDisposable(
        new THREE.MeshStandardMaterial({
          color: 0x090d16,
          roughness: 0.6,
        })
      );

      // Cylinder materials: [side, top, bottom]
      const materials = [sideMat, topMat, bottomMat];
      const tokenMesh = new THREE.Mesh(cylinderGeo, materials);
      tokenMesh.rotation.x = Math.PI / 8; // Tilted slightly forward toward camera
      tokenGroup.add(tokenMesh);

      // Subtle active pulse ring for Token #01
      if (def.active) {
        const ringGeo = registerDisposable(
          new THREE.RingGeometry(tokenRadius + 0.08, tokenRadius + 0.14, 32)
        );
        const ringMat = registerDisposable(
          new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
          })
        );
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2 + Math.PI / 8;
        tokenGroup.add(ringMesh);
        tokenGroup.userData.ring = ringMesh;
      }

      tokenGroup.userData = {
        ...tokenGroup.userData,
        index,
        yBase: def.yBase,
        active: def.active,
        phase: index * 0.7,
      };

      scene.add(tokenGroup);
      tokenMeshes.push(tokenGroup);
    });

    // 8. Mouse Parallax Tracking
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

      mouse.targetX = ((clientX - rect.left) / rect.width - 0.5) * 2;
      mouse.targetY = ((clientY - rect.top) / rect.height - 0.5) * 2;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 9. Intersection Observer (Pause rendering when offscreen)
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // 10. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 11. Render Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      if (!isVisible) {
        // Yield execution loop when offscreen
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolation (Damped spring)
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      // Restrained camera sway
      camera.position.x = mouse.x * 0.9;
      camera.position.y = 5.2 - mouse.y * 0.6;
      camera.lookAt(0.3, 0.9, 0.4);

      if (!prefersReducedMotion) {
        // Gentle bobbing and progression simulation
        tokenMeshes.forEach((mesh) => {
          const { yBase, phase, active, ring } = mesh.userData;

          if (active) {
            // Active token floats prominently above the counter
            mesh.position.y = yBase + Math.sin(elapsedTime * 1.8) * 0.09;
            mesh.rotation.y = Math.sin(elapsedTime * 0.6) * 0.12;

            if (ring) {
              const scale = 1.0 + Math.sin(elapsedTime * 3.0) * 0.08;
              ring.scale.set(scale, scale, 1);
            }
          } else {
            // Waiting tokens sway subtly in queue rhythm
            mesh.position.y = yBase + Math.sin(elapsedTime * 1.4 + phase) * 0.05;
            mesh.rotation.y = Math.sin(elapsedTime * 0.5 + phase) * 0.06;
          }
        });

        // Counter light breathing
        cyanLight.intensity = 3.6 + Math.sin(elapsedTime * 2.0) * 0.6;
        indigoLight.intensity = 3.2 + Math.cos(elapsedTime * 1.5) * 0.5;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    // If reduced motion is requested, render single frame and stop loop
    if (prefersReducedMotion) {
      renderer.render(scene, camera);
    } else {
      animate();
    }

    // 12. Cleanup & Memory Disposal
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Dispose all scene geometries, materials, and canvas textures
      disposables.forEach((item) => {
        if (item.dispose) {
          item.dispose();
        }
      });

      // Clear scene
      while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
      }

      renderer.dispose();
    };
  }, [hasWebGL]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[420px] sm:h-[480px] lg:h-[540px] flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/40 via-[#0a0f1d]/70 to-[#070a13] border border-slate-800/80 shadow-2xl"
    >
      {/* Subtle ambient backlights */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {hasWebGL ? (
        <>
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
          />

          {/* Interactive HUD badge */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 px-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 backdrop-blur-md shadow-lg">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-medium">Live 3D Dispatch Simulation</span>
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest hidden sm:inline-block font-mono">
              Hover to orbit
            </span>
          </div>
        </>
      ) : (
        /* Graceful WebGL Unavailable 2D Fallback */
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Counter 01 · Dispatch Active</span>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-sm w-full space-y-3">
            <p className="text-xs text-slate-400 uppercase font-mono">Now Serving</p>
            <p className="text-5xl font-black text-cyan-400 font-mono">#01</p>
            <p className="text-xs text-slate-400">Next In Line: Token #02 · ~4 mins wait</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueHeroCanvas;
