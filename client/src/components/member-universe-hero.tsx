import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as Lucide from "lucide-react";
import { UNIVERSE_SECTIONS, RING_RADII, type UniverseSection } from "@/lib/member-universe";

// Render a lucide icon by name as a thin monoline "skeleton" glyph — outline only,
// fine stroke, no fill — keeps a refined, uniform look across all sections.
function SectionIcon({
  name,
  size = 22,
  color,
  strokeWidth = 1.2,
}: {
  name: string;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const Cmp = (Lucide as unknown as Record<string, Lucide.LucideIcon>)[name] ?? Lucide.Circle;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}

/**
 * Member-only "universe" hero.
 * Shown only to logged-in members on their 5th+ homepage visit.
 *
 * - Deep 3D space background (three.js starfield + nebula) replaces the star pattern.
 * - The dot-globe appears large, then shrinks to center over ~4s.
 * - Interactive club sections orbit the globe as HTML nodes; click to expand a card.
 * - Reduced-motion / touch fallback: static globe, vertical section list.
 */
export default function MemberUniverseHero() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [globeShrunk, setGlobeShrunk] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const mount = canvasRef.current;
    if (!mount) return;

    // --- three.js scene -------------------------------------------------------
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05060a, 0.06);

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x05060a, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    // soft scene lighting (gives dots a subtle sheen)
    scene.add(new THREE.AmbientLight(0x404a5a, 0.6));
    const keyLight = new THREE.PointLight(0xf5d27a, 1.6, 50);
    keyLight.position.set(4, 3, 6);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x3a5a8a, 0.8, 50);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    // --- starfield: 3 layers for depth (far tiny, mid warm, near big bright) --
    const starLayers: THREE.Points[] = [];
    const makeStarLayer = (
      count: number,
      rMin: number,
      rMax: number,
      size: number,
      palette: number[][],
      opacity: number
    ) => {
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = rMin + Math.random() * (rMax - rMin);
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(p) * Math.cos(t);
        pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
        pos[i * 3 + 2] = r * Math.cos(p);
        const c = palette[Math.floor(Math.random() * palette.length)];
        col[i * 3] = c[0];
        col[i * 3 + 1] = c[1];
        col[i * 3 + 2] = c[2];
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({
        size,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(g, m);
      scene.add(pts);
      starLayers.push(pts);
      return { pts, geo: g, mat: m };
    };
    const gold = [0.96, 0.82, 0.48];
    const warm = [0.95, 0.9, 0.75];
    const white = [0.95, 0.95, 1.0];
    const blue = [0.6, 0.75, 1.0];
    const farStars = makeStarLayer(2200, 16, 40, 0.05, [warm, white, blue], 0.7);
    const midStars = makeStarLayer(700, 8, 18, 0.09, [gold, warm], 0.85);
    const nearStars = makeStarLayer(120, 5, 10, 0.22, [gold, white], 0.95);
    const stars = farStars.pts; // kept for slow rotation below

    // --- nebula sprite layers (rich, multi-color clouds) ----------------------
    const nebulaDefs = [
      { col: "#3a1f5c", x: -6, y: 2, z: -8, scale: 22, op: 0.45 },
      { col: "#5c1f2a", x: 7, y: -3, z: -10, scale: 20, op: 0.4 },
      { col: "#103040", x: 0, y: 4, z: -6, scale: 24, op: 0.5 },
      { col: "#4a3a1a", x: -4, y: -4, z: -7, scale: 18, op: 0.35 },
      { col: "#1a2a5c", x: 5, y: 3, z: -12, scale: 26, op: 0.3 },
    ];
    const nebulas: THREE.Sprite[] = [];
    nebulaDefs.forEach((n) => {
      const mat = new THREE.SpriteMaterial({
        map: makeGlowTexture(n.col),
        transparent: true,
        opacity: n.op,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const s = new THREE.Sprite(mat);
      s.scale.set(n.scale, n.scale, 1);
      s.position.set(n.x, n.y, n.z);
      scene.add(s);
      nebulas.push(s);
    });

    // --- dot globe (from precomputed land points) -----------------------------
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    let dots: THREE.Points | null = null;
    let pins: THREE.Mesh[] = [];

    // load land points lazily
    import("@/data/globe-points.json").then((mod) => {
      const pts: number[][] = (mod as { points: number[][] }).points;
      const pos = new Float32Array(pts.length * 3);
      const sizes = new Float32Array(pts.length); // per-point size for star-like variation
      for (let i = 0; i < pts.length; i++) {
        pos[i * 3] = pts[i][0] * 1.6;
        pos[i * 3 + 1] = pts[i][1] * 1.6;
        pos[i * 3 + 2] = pts[i][2] * 1.6;
        // varied sizes: most small, a few bright/bigger — like the background stars
        const r = Math.random();
        sizes[i] = r < 0.82 ? 0.04 + r * 0.06 : 0.12 + r * 0.16;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
      const m = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: makeStarTexture() },
          uColor: { value: new THREE.Color("#f5d27a") },
        },
        vertexShader: `
          attribute float size;
          uniform float uPixelRatio;
          varying float vSize;
          void main() {
            vSize = size;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          uniform vec3 uColor;
          varying float vSize;
          void main() {
            vec4 tex = texture2D(uTexture, gl_PointCoord);
            float bright = mix(0.6, 1.0, clamp(vSize / 0.25, 0.0, 1.0));
            gl_FragColor = vec4(uColor * bright, tex.a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      dots = new THREE.Points(g, m);
      globeGroup.add(dots);

      // dark core sphere for depth
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 64, 64),
        new THREE.MeshStandardMaterial({
          color: 0x07080c,
          roughness: 0.85,
          metalness: 0.2,
          transparent: true,
          opacity: 0.96,
        })
      );
      globeGroup.add(core);

      // faint latitude/longitude wireframe grid
      const grid = new THREE.Mesh(
        new THREE.SphereGeometry(1.52, 36, 18),
        new THREE.MeshBasicMaterial({
          color: 0xf5d27a,
          wireframe: true,
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
        })
      );
      globeGroup.add(grid);

      // thin shaded fresnel rim — tight crisp edge, not a fat diffuse halo.
      // Higher exponent + tighter sphere = a narrow graded line at the silhouette.
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color("#f5d27a") },
          coreColor: { value: new THREE.Color("#7a5a1a") },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPos;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPos = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform vec3 coreColor;
          varying vec3 vNormal;
          varying vec3 vPos;
          void main() {
            // tight rim: only the very edge lights up, fading to a darker gold inner shade
            float rim = 1.0 - abs(dot(vNormal, vPos));
            float intensity = pow(rim, 6.0);
            vec3 shade = mix(coreColor, glowColor, intensity);
            gl_FragColor = vec4(shade, intensity);
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      });
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.55, 48, 48), atmoMat);
      globeGroup.add(atmo);

      // faint outer glow sprite (very subtle halo breath)
      const glowMat = new THREE.SpriteMaterial({
        map: makeGlowTexture("#f5d27a"),
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glow = new THREE.Sprite(glowMat);
      glow.scale.set(3.8, 3.8, 1);
      globeGroup.add(glow);

      // thin shaded halo ring: bright core filament with darker falloff edges (tubular feel)
      const ringTex = makeRingTexture();
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.06, 2.10, 128),
        new THREE.MeshBasicMaterial({
          map: ringTex,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      ring.rotation.x = Math.PI / 2.4;
      ring.rotation.z = 0.3;
      globeGroup.add(ring);
      const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(2.24, 2.252, 128),
        new THREE.MeshBasicMaterial({
          color: 0xd9c08a,
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      ring2.rotation.x = Math.PI / 2.4;
      ring2.rotation.z = 0.3;
      globeGroup.add(ring2);

      setReady(true);
    });

    globeGroup.scale.setScalar(prefersReduced ? 0.62 : 1.0);

    // --- pointer parallax + drag-to-rotate globe ----------------------------
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const drag = { active: false, lastX: 0, lastY: 0, vx: 0, vy: 0 };
    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 0.4;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 0.4;
      if (drag.active) {
        const dx = e.clientX - drag.lastX;
        const dy = e.clientY - drag.lastY;
        drag.vx = dx * 0.005;
        drag.vy = dy * 0.005;
        globeGroup.rotation.y += drag.vx;
        globeGroup.rotation.x += drag.vy;
        globeGroup.rotation.x = Math.max(-1.2, Math.min(1.2, globeGroup.rotation.x));
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
      }
    };
    const onDown = (e: PointerEvent) => {
      drag.active = true;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
    };
    const onUp = () => { drag.active = false; };
    mount.addEventListener("pointermove", onMove);
    mount.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    // --- animation loop -------------------------------------------------------
    const start = performance.now();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const t = (now - start) / 1000;

      // shrink the globe over ~4s (unless reduced motion → already small)
      if (!prefersReduced) {
        const k = Math.min(1, t / 4);
        const eased = 1 - Math.pow(1 - k, 3);
        const s = 1 - eased * 0.42; // 1.0 → 0.58
        globeGroup.scale.setScalar(s);
        if (k >= 1 && !globeShrunkRef.current) {
          globeShrunkRef.current = true;
          setGlobeShrunk(true);
        }
      }

      // auto-rotate globe (pauses while dragging, with momentum)
      if (!drag.active) {
        globeGroup.rotation.y += prefersReduced ? 0 : (0.0016 + drag.vx);
        drag.vx *= 0.94;
        drag.vy *= 0.94;
      }

      // parallax camera
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      camera.position.x = cur.x * 2;
      camera.position.y = -cur.y * 2;
      camera.lookAt(0, 0, 0);

      // slow starfield rotation (each layer drifts slightly differently)
      stars.rotation.y += 0.00025;
      stars.rotation.x += 0.0001;
      midStars.pts.rotation.y -= 0.00015;
      nearStars.pts.rotation.y += 0.0004;
      // gentle twinkle
      nearStars.mat.opacity = 0.8 + Math.sin(t * 2) * 0.12;

      nebulas.forEach((n, i) => {
        n.position.x += Math.sin(t * 0.1 + i) * 0.002;
        n.material.opacity = 0.3 + Math.sin(t * 0.15 + i * 1.3) * 0.08;
      });

      // key light orbits for living highlights on the globe
      keyLight.position.x = Math.cos(t * 0.2) * 5;
      keyLight.position.z = Math.sin(t * 0.2) * 5 + 2;

      renderer.render(scene, camera);
    };
    animate();

    // --- resize ---------------------------------------------------------------
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("pointermove", onMove);
      mount.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      renderer.dispose();
      [farStars, midStars, nearStars].forEach((sl) => {
        sl.geo.dispose();
        sl.mat.dispose();
      });
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [prefersReduced]);

  // ref mirror so the loop can flip state once
  const globeShrunkRef = useRef(false);
  useEffect(() => {
    globeShrunkRef.current = globeShrunk;
  }, [globeShrunk]);

  const activeSection: UniverseSection | undefined =
    UNIVERSE_SECTIONS.find((s) => s.id === active);

  return (
    <div
      className="universe-hero relative h-[100svh] w-full overflow-hidden bg-[#05060a]"
      data-testid="member-universe-hero"
    >
      {/* three.js canvas mount */}
      <div ref={canvasRef} className="absolute inset-0" aria-hidden />

      {/* vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(5,6,10,0) 30%, rgba(5,6,10,0.7) 100%)",
        }}
      />

      {/* headline — fades out once the globe settles */}
      <div
        className={`pointer-events-none absolute left-1/2 top-[14%] z-20 -translate-x-1/2 text-center transition-opacity duration-1000 ${
          ready ? (globeShrunk || prefersReduced ? "opacity-0" : "opacity-100") : "opacity-0"
        }`}
      >
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-primary/80">
          The Member Universe
        </p>
        <h1 className="mt-3 font-display text-3xl text-cream/90 sm:text-4xl">
          Your world, around one globe.
        </h1>
      </div>

      {/* orbiting section nodes — HTML overlay */}
      {!prefersReduced && (
        <div
          className={`absolute inset-0 z-30 transition-opacity duration-700 ${
            globeShrunk ? "opacity-100" : "opacity-0"
          }`}
        >
          {UNIVERSE_SECTIONS.map((s) => {
            const radius = RING_RADII[s.ring] * 50; // % of half-viewport
            const x = 50 + radius * Math.cos(s.angle);
            const y = 50 + radius * Math.sin(s.angle);
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(isActive ? null : s.id)}
                data-testid={`universe-node-${s.id}`}
                className="universe-node group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <span
                  className="node-orb relative flex h-12 w-12 items-center justify-center rounded-full border bg-[#0b0d14]/80 backdrop-blur transition-transform duration-300 group-hover:scale-110"
                  style={{
                    borderColor: s.accent,
                    boxShadow: `0 0 18px -4px ${s.accent}, inset 0 0 10px -4px ${s.accent}`,
                  }}
                >
                  <SectionIcon name={s.icon} color={s.accent} />
                  <span
                    className="absolute -inset-1 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ boxShadow: `0 0 24px 2px ${s.accent}66` }}
                  />
                </span>
                <span className="mt-1 hidden whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-cream/70 sm:block">
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* expanded section card */}
      {activeSection && (
        <div className="absolute left-1/2 top-1/2 z-40 w-[88vw] max-w-md -translate-x-1/2 -translate-y-1/2">
          <div
            className="universe-card relative overflow-hidden rounded-2xl border bg-[#0b0d14]/95 p-6 backdrop-blur-xl"
            style={{ borderColor: `${activeSection.accent}55` }}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-2xl"
              style={{ background: activeSection.accent }}
            />
            <button
              type="button"
              onClick={() => setActive(null)}
              className="absolute right-3 top-3 text-cream/50 hover:text-cream"
              aria-label="Close"
              data-testid="universe-close"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl"
                style={{ background: `${activeSection.accent}22`, border: `1px solid ${activeSection.accent}55` }}
              >
                <SectionIcon name={activeSection.icon} size={20} color={activeSection.accent} />
              </span>
              <div>
                <h3 className="font-display text-xl text-cream">{activeSection.title}</h3>
                {activeSection.subtitle && (
                  <p className="text-xs text-cream/60">{activeSection.subtitle}</p>
                )}
              </div>
            </div>
            <ul className="mt-5 grid gap-2">
              {activeSection.items.map((it) => (
                <li
                  key={it.label}
                  className="flex items-center justify-between rounded-lg border border-cream/10 bg-cream/[0.03] px-3 py-2.5 text-sm text-cream/85"
                >
                  <span>{it.label}</span>
                  {it.news && (
                    <span className="ml-3 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {it.news}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* reduced-motion / mobile fallback list */}
      {prefersReduced && (
        <div className="absolute inset-0 z-30 overflow-y-auto px-4 py-24">
          <div className="mx-auto max-w-2xl">
            <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-primary/80">
              The Member Universe
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {UNIVERSE_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(active === s.id ? null : s.id)}
                  className="flex items-center gap-3 rounded-xl border border-cream/15 bg-[#0b0d14]/80 p-4 text-left"
                  style={{ borderColor: `${s.accent}44` }}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <div>
                    <div className="font-display text-cream">{s.title}</div>
                    <div className="text-xs text-cream/60">{s.items.length} areas</div>
                  </div>
                </button>
              ))}
            </div>
            {activeSection && (
              <div className="mt-4 rounded-xl border border-cream/15 bg-[#0b0d14] p-5">
                <h3 className="mb-3 font-display text-lg text-cream">{activeSection.emoji} {activeSection.title}</h3>
                <ul className="grid gap-1.5 text-sm text-cream/80">
                  {activeSection.items.map((it) => (
                    <li key={it.label}>— {it.label}{it.news ? ` (${it.news})` : ""}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* hint */}
      {!prefersReduced && (
        <div
          className={`pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-center text-xs uppercase tracking-[0.3em] text-cream/40 transition-opacity duration-700 ${
            globeShrunk ? "opacity-100" : "opacity-0"
          }`}
        >
          Drag the globe · tap a node to explore
        </div>
      )}
    </div>
  );
}

// Soft radial glow texture for sprites / nebulae.
function makeGlowTexture(color: string): THREE.Texture {
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.4, color + "88");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

// Soft round star sprite with a bright core + gentle glow halo, used for the
// globe's land dots so they read as glowing stars (varied size) not square pixels.
function makeStarTexture(): THREE.Texture {
  const size = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  const c = size / 2;
  // soft halo
  const halo = ctx.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0, "rgba(255,255,255,1)");
  halo.addColorStop(0.25, "rgba(255,255,255,0.7)");
  halo.addColorStop(0.5, "rgba(255,255,255,0.22)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);
  // bright pinpoint core
  const core = ctx.createRadialGradient(c, c, 0, c, c, 6);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

// 1D-style shaded ring cross-section: a bright thin core filament in the middle
// with darker gold falloff toward both edges — gives the halo ring a tubular,
// shaded read instead of a flat fat band. Mapped across the ring's radial UV.
function makeRingTexture(): THREE.Texture {
  const w = 64;
  const h = 4;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0.0, "rgba(122,90,26,0)");      // dark outer edge
  g.addColorStop(0.35, "rgba(217,192,138,0.5)"); // shaded falloff
  g.addColorStop(0.5, "rgba(255,240,200,1)");   // bright core filament
  g.addColorStop(0.65, "rgba(217,192,138,0.5)");
  g.addColorStop(1.0, "rgba(122,90,26,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}
