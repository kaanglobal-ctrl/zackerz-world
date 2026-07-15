import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type D3ZoomEvent } from "d3-zoom";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import Navbar from "@/components/navbar";
import CurtainIntro from "@/components/curtain-intro";
import Footer from "@/components/footer";
import { MapPin, Users, X, Plus, Minus, Locate, ChevronRight, DoorOpen, Lock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { geocode, type Coords } from "@/lib/geocode";
import worldTopo from "@/data/world-110m.json";

type Member = {
  id: number;
  username: string;
  fullName: string | null;
  city: string | null;
  country: string | null;
  field: string | null;
  isOg?: boolean;
};

type Marker = {
  coords: Coords;
  members: Member[];
};

type Chapter = {
  id: number;
  city: string;
  country: string;
  lead: string;
  memberCount: number;
  description: string;
  meetingCadence: string;
};

type ChapterMarker = {
  chapter: Chapter;
  coords: Coords;
};

// Compact ZACKERZ crest (reused trident paths from logo.tsx, drawn in a 64×64 space).
function CrestGlyph() {
  return (
    <g fill="hsl(40 40% 97%)">
      <path d="M32 6 L36.6 15 L33.4 15 L33.4 27 L30.6 27 L30.6 15 L27.4 15 Z" />
      <path d="M20 10 L24.6 19 L21.4 19 L21.4 27 L18.6 27 L18.6 19 L15.4 19 Z" />
      <path d="M44 10 L48.6 19 L45.4 19 L45.4 27 L42.6 27 L42.6 19 L39.4 19 Z" />
      <path d="M15 30.5 Q32 39 49 30.5 L49 27 Q32 35.5 15 27 Z" />
      <path d="M27 37 L37 37 L37 38.6 L29.2 52 L37 52 L37 53.6 L27 53.6 L27 51.9 L34.8 38.6 L27 38.6 Z" />
    </g>
  );
}

export default function WorldMap() {
  const { user } = useAuth();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const [size, setSize] = useState({ w: 960, h: 520 });
  const [active, setActive] = useState<Marker | null>(null);
  const [hover, setHover] = useState<Marker | null>(null);
  const [activeChapter, setActiveChapter] = useState<ChapterMarker | null>(null);
  const [hoverChapter, setHoverChapter] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ members: Member[]; viewerIsOg?: boolean }>({
    queryKey: ["/api/members"],
  });

  const { data: chapterData } = useQuery<{ chapters: Chapter[] }>({
    queryKey: ["/api/chapters"],
  });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.max(320, Math.floor(e.contentRect.width));
        setSize({ w, h: Math.round(w * 0.52) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const members = (data?.members ?? []).filter((m) => m.id !== user?.id);

  const markers: Marker[] = useMemo(() => {
    const map = new Map<string, Marker>();
    for (const m of members) {
      const coords = geocode(m.city, m.country);
      if (!coords) continue;
      const key = `${coords[0].toFixed(1)},${coords[1].toFixed(1)}`;
      const ex = map.get(key);
      if (ex) ex.members.push(m);
      else map.set(key, { coords, members: [m] });
    }
    return Array.from(map.values());
  }, [members]);

  const chapterMarkers: ChapterMarker[] = useMemo(() => {
    const chapters = chapterData?.chapters ?? [];
    const out: ChapterMarker[] = [];
    for (const chapter of chapters) {
      const coords = geocode(chapter.city, chapter.country);
      if (!coords) continue;
      out.push({ chapter, coords });
    }
    return out;
  }, [chapterData]);

  const locatedCount = markers.reduce((n, mk) => n + mk.members.length, 0);
  const unlocated = members.length - locatedCount;

  const { path, projection } = useMemo(() => {
    const proj = geoNaturalEarth1().fitExtent(
      [
        [6, 6],
        [size.w - 6, size.h - 6],
      ],
      { type: "Sphere" }
    );
    return { path: geoPath(proj), projection: proj };
  }, [size]);

  const land = useMemo(() => {
    const fc = feature(
      worldTopo as never,
      (worldTopo as never).objects.countries
    ) as unknown as FeatureCollection<Geometry>;
    return fc.features;
  }, []);

  const graticule = useMemo(() => geoGraticule10(), []);
  const spherePath = path({ type: "Sphere" }) ?? "";
  const graticulePath = path(graticule) ?? "";

  const projPoint = (c: Coords) => {
    const xy = projection(c);
    return xy ? { x: xy[0], y: xy[1] } : null;
  };

  // d3-zoom behavior — attached to the SVG; transforms the inner <g>.
  const zoomBehavior = useMemo(
    () =>
      zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .translateExtent([
          [-size.w * 0.5, -size.h * 0.5],
          [size.w * 1.5, size.h * 1.5],
        ])
        .on("zoom", (ev: D3ZoomEvent<SVGSVGElement, unknown>) => {
          if (gRef.current) {
            select(gRef.current).attr("transform", ev.transform.toString());
          }
        }),
    [size.w, size.h]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || isLoading) return;
    select(svg).call(zoomBehavior).on("dblclick.zoom", null);
    return () => {
      select(svg).on(".zoom", null);
    };
  }, [zoomBehavior, isLoading]);

  // Programmatic zoom controls
  const zoomBy = useCallback(
    (factor: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      select(svg).transition().duration(280).call(zoomBehavior.scaleBy, factor);
    },
    [zoomBehavior]
  );

  const resetZoom = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    select(svg)
      .transition()
      .duration(380)
      .call(zoomBehavior.transform, zoomIdentity);
    setActive(null);
  }, [zoomBehavior]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CurtainIntro label="Network" />
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
                Global Network
              </h1>
              <p className="mt-2 text-muted-foreground">
                <span className="font-medium text-foreground">{locatedCount}</span>{" "}
                members across{" "}
                <span className="font-medium text-foreground">{markers.length}</span>{" "}
                cities worldwide.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-[hsl(var(--secondary))]" />
              {unlocated > 0
                ? `${unlocated} pending location`
                : "All members mapped"}
            </div>
          </div>

          <div
            ref={wrapRef}
            className="map-canvas group relative overflow-hidden rounded-2xl border border-border shadow-xl"
          >
            {isLoading ? (
              <div className="flex h-[420px] items-center justify-center text-muted-foreground">
                Loading map…
              </div>
            ) : (
              <>
                <svg
                  ref={svgRef}
                  width={size.w}
                  height={size.h}
                  viewBox={`0 0 ${size.w} ${size.h}`}
                  className="block w-full touch-none"
                  role="img"
                  aria-label="World map of member locations — scroll to zoom, drag to pan"
                >
                  <defs>
                    <filter id="marker-glow" x="-200%" y="-200%" width="500%" height="500%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="land-shadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000" floodOpacity="0.45" />
                    </filter>
                    <radialGradient id="ocean-grad" cx="50%" cy="45%" r="75%">
                      <stop offset="0%" className="map-ocean-mid" />
                      <stop offset="100%" className="map-ocean-edge" />
                    </radialGradient>
                    <linearGradient id="flag-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f0c9a6" />
                      <stop offset="55%" stopColor="#e0a64b" />
                      <stop offset="100%" stopColor="#c98a5e" />
                    </linearGradient>
                    <linearGradient id="flag-shade" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8a5a34" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#8a5a34" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="gate-open-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#c98a5e" />
                      <stop offset="100%" stopColor="#f0c9a6" />
                    </linearGradient>
                    <filter id="flag-shadow" x="-60%" y="-60%" width="220%" height="220%">
                      <feDropShadow dx="1.2" dy="2" stdDeviation="1.4" floodColor="#000" floodOpacity="0.5" />
                    </filter>
                    <filter id="gate-glow" x="-120%" y="-120%" width="340%" height="340%">
                      <feGaussianBlur stdDeviation="2.2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <g ref={gRef}>
                    {/* Ocean sphere */}
                    <path
                      d={spherePath}
                      fill="url(#ocean-grad)"
                      className="stroke-[hsl(var(--border))]"
                      strokeWidth={1}
                    />
                    {/* Graticule */}
                    <path
                      d={graticulePath}
                      className="map-graticule fill-none"
                      strokeWidth={0.5}
                    />
                    {/* Land */}
                    <g filter="url(#land-shadow)">
                      {land.map((f, i) => (
                        <path
                          key={i}
                          d={path(f) ?? ""}
                          className="map-land map-country-border map-country"
                          strokeWidth={0.7}
                        />
                      ))}
                    </g>
                    {/* Member markers */}
                    {markers.map((mk, i) => {
                      const pt = projPoint(mk.coords);
                      if (!pt) return null;
                      const count = mk.members.length;
                      const isHub = count > 2;
                      const isPair = count > 1;
                      const r = isHub ? 7 : isPair ? 5.5 : 4.5;
                      const isActive = active === mk;
                      const isHover = hover === mk;
                      return (
                        <g
                          key={i}
                          transform={`translate(${pt.x} ${pt.y})`}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChapter(null);
                            setActive(mk);
                          }}
                          onMouseEnter={() => setHover(mk)}
                          onMouseLeave={() => setHover(null)}
                        >
                          {isHub && (
                            <>
                              <circle r={r + 14} className="map-pulse-ring" />
                              <circle r={r + 9} className="map-pulse-ring map-pulse-delay" />
                            </>
                          )}
                          <circle
                            r={r + (isHover || isActive ? 7 : 5)}
                            className="map-marker-halo"
                          />
                          <circle
                            r={r + (isHover || isActive ? 1.5 : 0)}
                            className="map-marker-core"
                            filter="url(#marker-glow)"
                          />
                          {(isPair || isHub) && (
                            <text
                              x={0}
                              y={r * 0.35}
                              textAnchor="middle"
                              className="map-marker-count"
                              fontSize={isHub ? 8 : 7}
                              fontWeight={700}
                            >
                              {count}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    {/* Chapter flag markers + gates */}
                    {chapterMarkers.map((cm) => {
                      const pt = projPoint(cm.coords);
                      if (!pt) return null;
                      const gateState: "open" | "forming" | "closed" =
                        cm.chapter.memberCount >= 3
                          ? "open"
                          : cm.chapter.memberCount >= 1
                          ? "forming"
                          : "closed";
                      const isActive = activeChapter?.chapter.id === cm.chapter.id;
                      const isHover = hoverChapter === cm.chapter.id;
                      const lift = isHover || isActive ? 1.12 : 1;
                      return (
                        <g
                          key={`chapter-${cm.chapter.id}`}
                          transform={`translate(${pt.x} ${pt.y - 2})`}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActive(null);
                            setActiveChapter(cm);
                          }}
                          onMouseEnter={() => setHoverChapter(cm.chapter.id)}
                          onMouseLeave={() => setHoverChapter(null)}
                          data-testid={`chapter-flag-${cm.chapter.id}`}
                        >
                          {/* Gate (behind flag) */}
                          <g
                            className={
                              gateState === "open"
                                ? "map-gate-open"
                                : gateState === "forming"
                                ? "map-gate-forming"
                                : "map-gate-closed"
                            }
                            filter={gateState !== "forming" ? "url(#gate-glow)" : undefined}
                          >
                            {gateState === "closed" ? (
                              <path
                                d="M -13 2 A 13 16 0 0 1 13 2 Z"
                                strokeWidth={1.8}
                              />
                            ) : (
                              <path
                                d="M -13 2 A 13 16 0 0 1 13 2"
                                fill="none"
                                strokeWidth={gateState === "open" ? 2.2 : 1.6}
                              />
                            )}
                            {gateState === "open" && (
                              <path
                                d="M -13 2 A 13 16 0 0 1 13 2"
                                fill="none"
                                className="map-gate-open-inner"
                                strokeWidth={0.9}
                              />
                            )}
                            {gateState === "forming" && (
                              // lock glyph for a forming gate
                              <g className="map-gate-lock" transform="translate(0 -6)">
                                <rect x={-3} y={0} width={6} height={5} rx={1} />
                                <path d="M -2 0 L -2 -1.6 A 2 2 0 0 1 2 -1.6 L 2 0" fill="none" strokeWidth={1} />
                              </g>
                            )}
                            {gateState === "closed" && (
                              // lock glyph for a closed gate
                              <g className="map-gate-closed-lock" transform="translate(0 -6)">
                                <rect x={-3} y={0} width={6} height={5} rx={1} />
                                <path d="M -2 0 L -2 -1.6 A 2 2 0 0 1 2 -1.6 L 2 0" fill="none" strokeWidth={1} />
                              </g>
                            )}
                          </g>

                          {/* Flag (scales subtly on hover/active; dimmed when closed) */}
                          <g
                            transform={`scale(${lift})`}
                            style={{ transformOrigin: "0px 0px" }}
                            opacity={gateState === "closed" ? 0.55 : 1}
                          >
                            {/* pole */}
                            <rect
                              x={-1}
                              y={-30}
                              width={2}
                              height={32}
                              rx={1}
                              className="map-flag-pole"
                            />
                            {/* flag body with 3D depth */}
                            <g filter="url(#flag-shadow)">
                              <polygon
                                points="0,-30 16,-27.5 16,-17.5 0,-19"
                                fill="url(#flag-grad)"
                                className="map-chapter-flag"
                              />
                              <polygon
                                points="0,-30 3.4,-29.5 3.4,-18.4 0,-19"
                                fill="url(#flag-shade)"
                              />
                            </g>
                            {/* crest centered on flag */}
                            <g transform="translate(2.9 -29.3) scale(0.165)">
                              <CrestGlyph />
                            </g>
                          </g>

                          {/* gate label */}
                          <text
                            x={0}
                            y={8}
                            textAnchor="middle"
                            className={
                              gateState === "open"
                                ? "map-gate-label-open"
                                : gateState === "forming"
                                ? "map-gate-label-forming"
                                : "map-gate-label-closed"
                            }
                            fontSize={4.6}
                            fontWeight={700}
                          >
                            {gateState === "open"
                              ? "GATE OPEN"
                              : gateState === "forming"
                              ? "FORMING"
                              : "CLOSED"}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>

                {/* Zoom controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
                  <Button
                    size="icon"
                    className="map-zoom-btn h-9 w-9 rounded-lg shadow-md backdrop-blur"
                    onClick={() => zoomBy(1.5)}
                    aria-label="Zoom in"
                    data-testid="button-zoom-in"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="map-zoom-btn h-9 w-9 rounded-lg shadow-md backdrop-blur"
                    onClick={() => zoomBy(1 / 1.5)}
                    aria-label="Zoom out"
                    data-testid="button-zoom-out"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="map-zoom-btn h-9 w-9 rounded-lg shadow-md backdrop-blur"
                    onClick={resetZoom}
                    aria-label="Reset view"
                    data-testid="button-zoom-reset"
                  >
                    <Locate className="h-4 w-4" />
                  </Button>
                </div>

                {/* Pan/zoom hint */}
                <div className="pointer-events-none absolute bottom-4 left-4 rounded-md bg-background/70 px-2.5 py-1 text-xs text-muted-foreground opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
                  Scroll to zoom · Drag to pan
                </div>

                {/* Detail panel */}
                {active && (
                  <div className="absolute right-4 top-4 w-72 rounded-xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <MapPin className="h-4 w-4 text-[hsl(var(--secondary))]" />
                        {active.members[0].city}
                        {active.members[0].country ? `, ${active.members[0].country}` : ""}
                      </div>
                      <button
                        onClick={() => setActive(null)}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {active.members.length} member{active.members.length > 1 ? "s" : ""}
                    </p>
                    <div className="space-y-1">
                      {(() => {
                        const viewerIsOg = data?.viewerIsOg ?? false;
                        const visible = active.members.filter((m) => !(m.isOg && !viewerIsOg));
                        const maskedCount = active.members.length - visible.length;
                        return (
                          <>
                            {maskedCount > 0 && (
                              <div
                                className="flex items-center gap-2.5 rounded-lg bg-secondary/5 p-1.5 -mx-1.5"
                                title="O.G. members are anonymous"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-secondary/20 text-[10px] font-semibold text-[hsl(var(--secondary))]">
                                    OG
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">O.G. ZACKER</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {maskedCount > 1 ? `${maskedCount} anonymous members` : "Circle of Trust"}
                                  </p>
                                </div>
                              </div>
                            )}
                            {visible.map((m) => (
                              <Link
                                key={m.id}
                                href={`/members/${m.id}`}
                                className="group/m flex cursor-pointer items-center gap-2.5 rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-secondary/10"
                                onClick={() => setActive(null)}
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-secondary/15 text-xs text-[hsl(var(--secondary))]">
                                    {m.username.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {m.fullName || m.username}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {m.field || `@${m.username}`}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/m:opacity-100" />
                              </Link>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Chapter detail panel */}
                {activeChapter && (() => {
                  const ch = activeChapter.chapter;
                  const gateState: "open" | "forming" | "closed" =
                    ch.memberCount >= 3 ? "open" : ch.memberCount >= 1 ? "forming" : "closed";
                  return (
                    <div className="absolute right-4 top-4 w-72 rounded-xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <MapPin className="h-4 w-4 text-[hsl(var(--secondary))]" />
                          {ch.city}
                          {ch.country ? `, ${ch.country}` : ""}
                        </div>
                        <button
                          onClick={() => setActiveChapter(null)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div
                        className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          gateState === "open"
                            ? "bg-[hsl(var(--secondary))]/15 text-[hsl(var(--secondary))]"
                            : gateState === "closed"
                            ? "bg-[hsl(8_72%_52%)]/15 text-[hsl(8_78%_52%)]"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {gateState === "open" ? (
                          <>
                            <DoorOpen className="h-3.5 w-3.5" /> Gate open
                          </>
                        ) : gateState === "forming" ? (
                          <>
                            <Lock className="h-3.5 w-3.5" /> Gate forming
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" /> Gate closed
                          </>
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-3.5 w-3.5 text-[hsl(var(--secondary))]" />
                          <span className="text-foreground">{ch.memberCount}</span> members
                          {gateState === "forming" && (
                            <span className="text-muted-foreground">
                              · {Math.max(0, 3 - ch.memberCount)} to open
                            </span>
                          )}
                          {gateState === "closed" && (
                            <span className="text-muted-foreground">· Chapter locked</span>
                          )}
                        </div>
                        <p>
                          <span className="text-muted-foreground">Lead:</span>{" "}
                          <span className="font-medium text-foreground">{ch.lead}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Cadence:</span>{" "}
                          <span className="text-foreground">{ch.meetingCadence}</span>
                        </p>
                        <p className="pt-1 text-muted-foreground">{ch.description}</p>
                      </div>

                      <Link
                        href="/chapters"
                        className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--secondary))]/10 px-3 py-2 text-xs font-medium text-[hsl(var(--secondary))] transition-colors hover:bg-[hsl(var(--secondary))]/20"
                        onClick={() => setActiveChapter(null)}
                      >
                        View chapter
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="map-legend-dot map-marker-core" />
              Member
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
                <rect x="1" y="1" width="1.4" height="14" rx="0.7" className="map-flag-pole" />
                <polygon points="2,1 13,3 13,8 2,7" fill="url(#flag-grad-legend)" />
                <defs>
                  <linearGradient id="flag-grad-legend" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f0c9a6" />
                    <stop offset="55%" stopColor="#e0a64b" />
                    <stop offset="100%" stopColor="#c98a5e" />
                  </linearGradient>
                </defs>
              </svg>
              Chapter flag (crest)
            </div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-[hsl(var(--secondary))]" />
              Gate open (3+)
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Gate forming
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
                <path
                  d="M 1 10 A 7 9 0 0 1 15 10 Z"
                  fill="hsl(8 60% 28% / 0.55)"
                  stroke="hsl(8 72% 52%)"
                  strokeWidth="1.2"
                />
              </svg>
              Gate closed
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-px w-5 bg-[hsl(var(--border))]" />
              Graticule
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Plus className="h-3.5 w-3.5" />
              Scroll / drag to explore
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
