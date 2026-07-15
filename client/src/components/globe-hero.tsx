import { useEffect, useRef } from "react";
import * as THREE from "three";
import globeData from "@/data/globe-points.json";
import { geocode, type Coords } from "@/lib/geocode";

type Chapter = { city: string; country: string };

// lat/lng (degrees) -> cartesian on sphere of given radius
function toCartesian(lng: number, lat: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export default function GlobeHero({ chapters }: { chapters: Chapter[] }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 640;

    // ---- Scene setup ----
    const R = 1; // globe radius
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 3.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // ---- Land dots ----
    const pts = (globeData as { points: number[][] }).points;
    const positions = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      positions[i * 3] = p[0] * R;
      positions[i * 3 + 1] = p[1] * R;
      positions[i * 3 + 2] = p[2] * R;
    });
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dotMat = new THREE.PointsMaterial({
      color: 0xc9a24b, // muted gold
      size: isMobile ? 0.018 : 0.013,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const dots = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(dots);

    // ---- Core sphere (very dark, gives dots depth/occlusion) ----
    const coreGeo = new THREE.SphereGeometry(R * 0.99, 48, 48);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0c, transparent: true, opacity: 0.96 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(core);

    // ---- Atmosphere glow (backside fresnel-ish) ----
    const atmoGeo = new THREE.SphereGeometry(R * 1.12, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0xc9a24b,
      transparent: true,
      opacity: 0.07,
      side: THREE.BackSide,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    globeGroup.add(atmo);

    // ---- Chapter pins (public chapter locations only) ----
    const pinGroup = new THREE.Group();
    globeGroup.add(pinGroup);
    const seen = new Set<string>();
    for (const ch of chapters) {
      const c: Coords | null = geocode(ch.city, ch.country);
      if (!c) continue;
      const key = `${c[0].toFixed(1)},${c[1].toFixed(1)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const pos = toCartesian(c[0], c[1], R * 1.01);

      // pin dot
      const pinGeo = new THREE.SphereGeometry(isMobile ? 0.016 : 0.013, 12, 12);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0xf5d27a });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.copy(pos);
      pinGroup.add(pin);

      // glow halo
      const haloGeo = new THREE.SphereGeometry(isMobile ? 0.03 : 0.026, 12, 12);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xf5d27a, transparent: true, opacity: 0.25 });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pos);
      pinGroup.add(halo);

      // store base opacity for pulse
      (halo as any).__base = 0.25;
    }

    // ---- Interaction: drag to rotate + auto-rotate ----
    let rotY = 0;
    let rotX = 0.18;
    let velY = prefersReduced ? 0 : 0.0016;
    let dragging = false;
    let lastX = 0, lastY = 0;
    let targetVelY = prefersReduced ? 0 : 0.0016;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      targetVelY = 0;
      mount.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      rotY += dx * 0.005;
      rotX += dy * 0.005;
      rotX = Math.max(-1.1, Math.min(1.1, rotX));
      velY = dx * 0.0008; // fling momentum
    };
    const onUp = () => {
      dragging = false;
      targetVelY = prefersReduced ? 0 : 0.0016;
      mount.style.cursor = "grab";
    };
    mount.style.cursor = "grab";
    mount.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // ---- Resize ----
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ---- Render loop ----
    let raf = 0;
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.016;
      if (!dragging) {
        velY += (targetVelY - velY) * 0.05;
        rotY += velY;
      }
      globeGroup.rotation.y = rotY;
      globeGroup.rotation.x = rotX;

      // pulse halos
      pinGroup.children.forEach((halo, i) => {
        if (i % 2 === 1) { // halos are odd indices
          const base = (halo as any).__base ?? 0.25;
          (halo.material as THREE.MeshBasicMaterial).opacity =
            base * (0.6 + 0.4 * Math.sin(t * 2 + i));
        }
      });

      renderer.render(scene, camera);
    };

    if (prefersReduced) {
      renderer.render(scene, camera);
    } else {
      animate();
    }

    // ---- Cleanup ----
    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      pinGroup.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [chapters]);

  return <div ref={mountRef} className="globe-canvas h-full w-full" data-testid="globe-hero" />;
}
