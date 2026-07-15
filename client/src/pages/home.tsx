import { Link } from "wouter";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Shield, Mountain, Users, BookOpen, ArrowRight, Quote, Sparkles, Rocket, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import PublicLayout from "@/components/public-layout";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const GlobeHero = lazy(() => import("@/components/globe-hero"));
const MemberUniverseHero = lazy(() => import("@/components/member-universe-hero"));

const VALUES = [
  {
    icon: Shield,
    title: "Honor",
    body: "The first measure of a human. We hold the line when it costs, and we keep our word as bond.",
  },
  {
    icon: Mountain,
    title: "Discipline",
    body: "Mastery over years, not weekends. We forge strength through ordeal, not comfort.",
  },
  {
    icon: Users,
    title: "Organisation",
    body: "Real bonds, made in person. Local chapters that hold each other accountable to a higher standard.",
  },
  {
    icon: BookOpen,
    title: "Independence",
    body: "We pass on tools, contacts, and knowledge that make each human more sovereign — in capital, mind, and body.",
  },
];

const STATS = [
  { value: "200+", label: "Active members" },
  { value: "40+", label: "Countries" },
  { value: "11", label: "Chapters" },
  { value: "~5%", label: "Acceptance rate" },
];

const CAPABILITIES = [
  {
    icon: Sparkles,
    title: "AI-Powered",
    body: "Next-level infrastructure built in-house — not bolted on.",
  },
  {
    icon: Rocket,
    title: "No Funding Needed",
    body: "Self-funded and sustainable — no outside investors, for now.",
  },
  {
    icon: Users,
    title: "100% User-Built",
    body: "Every feature shaped directly by the people who use it.",
  },
  {
    icon: Crown,
    title: "Member-Governed",
    body: "Real representation — the Order answers to its members.",
  },
];

type Tier = { id: string; name: string; priceYearly: number; currency: string };

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: chapterData } = useQuery<{ chapters: { id: number; city: string; country: string }[] }>({
    queryKey: ["/api/chapters"],
  });
  const { data: eventData } = useQuery<{ events: { id: number; title: string; date: string; location: string }[] }>({
    queryKey: ["/api/events"],
  });
  const { data: tierData } = useQuery<{ tiers: Tier[] }>({ queryKey: ["/api/tiers"] });

  const chapters = chapterData?.chapters?.slice(0, 6) ?? [];
  const events = (eventData?.events ?? [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
  const tiers = tierData?.tiers ?? [];

  const rootRef = useRef<HTMLDivElement>(null);

  // Returning-visitor detection: after 5+ home visits, the hero shows the
  // globe alone and the stats move out of the hero into their own band below.
  // Visit count is tracked per-browser via localStorage — works for members
  // and anonymous visitors without IP tracking. Computed synchronously so the
  // render can branch on the first paint.
  const HOME_VISIT_KEY = "zackerz_home_visits";
  const [isReturning] = useState(() => {
    try {
      const stored = parseInt(localStorage.getItem(HOME_VISIT_KEY) ?? "0", 10) || 0;
      return stored + 1 >= 5; // this visit makes it 5+
    } catch {
      return false;
    }
  });
  // Logged-in members on their 5th+ visit get the full 3D member universe hero.
  const showMemberUniverse = isAuthenticated && isReturning;
  useEffect(() => {
    try {
      const stored = parseInt(localStorage.getItem(HOME_VISIT_KEY) ?? "0", 10) || 0;
      localStorage.setItem(HOME_VISIT_KEY, String(stored + 1));
    } catch {
      /* storage unavailable (private mode) — non-fatal */
    }
  }, []);

  // GSAP scroll choreography + cursor light (skipped for reduced-motion users)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (showMemberUniverse) return; // member universe hero handles its own motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (prefersReduced) return;

      // Hero globe parallax: drift up & fade as you scroll past the hero
      gsap.to(".globe-stage", {
        y: -80,
        opacity: 0.15,
        scale: 0.92,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Hero copy lifts slightly
      gsap.to(".hero-copy", {
        y: -40,
        opacity: 0.6,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Section headers reveal
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 28,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });

      // Pillar cards staggered reveal
      gsap.from(".pillar-card", {
        opacity: 0,
        y: 36,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".pillars-grid", start: "top 80%" },
      });

      // Capability badges staggered reveal
      gsap.from(".capability-badge", {
        opacity: 0,
        y: 36,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".capabilities-grid", start: "top 85%" },
      });

      // Stat count-up
      gsap.utils.toArray<HTMLElement>(".stat-value").forEach((el) => {
        const raw = el.dataset.value ?? el.textContent ?? "";
        const numMatch = String(raw).match(/[\d.]+/);
        if (!numMatch) return;
        const target = parseFloat(numMatch[0]);
        const suffix = String(raw).slice(numMatch.index! + numMatch[0].length);
        const prefix = String(raw).slice(0, numMatch.index);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%" },
          onUpdate: () => {
            const n = Number.isInteger(target) ? Math.round(obj.v) : obj.v.toFixed(0);
            el.textContent = `${prefix}${n}${suffix}`;
          },
        });
      });
    }, root);

    // Cursor-following gold light
    const light = root.querySelector<HTMLElement>(".cursor-light");
    if (light && !prefersReduced) {
      const move = (e: MouseEvent) => {
        light.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      };
      window.addEventListener("mousemove", move);
      return () => {
        window.removeEventListener("mousemove", move);
        ctx.revert();
      };
    }

    return () => ctx.revert();
  }, [chapters.length, events.length, tiers.length, showMemberUniverse]);

  const heroIntroRef = useRef<HTMLDivElement>(null);

  return (
    <PublicLayout>
    <div className="flex flex-col" ref={rootRef}>
      {/* Cursor-following gold light (decorative, fixed) */}
      <div className="cursor-light pointer-events-none fixed left-0 top-0 z-[1] hidden sm:block" aria-hidden>
        <div className="h-[420px] w-[420px] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #f5d27a 0%, transparent 65%)" }} />
      </div>

      {/* Member-only 3D universe hero (logged in + 5th+ visit) */}
      {showMemberUniverse ? (
        <Suspense fallback={null}>
          <MemberUniverseHero />
        </Suspense>
      ) : (
      <section className="hero-section relative overflow-hidden border-b border-border paper-grain min-h-[100svh]">
        {/* 3D globe stage */}
        <div className="globe-stage absolute inset-0 z-0 flex items-center justify-center" aria-hidden>
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(10,10,12,0) 0%, rgba(10,10,12,0.45) 70%)" }} />
          <div className="h-[460px] w-full max-w-2xl sm:h-[560px]">
            <Suspense fallback={null}>
              <GlobeHero chapters={chapters} />
            </Suspense>
          </div>
        </div>

        <div className="hero-copy relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
          <div className="hero-intro" ref={heroIntroRef}>
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-primary">
            A Global Private Members' Order
          </p>
          <h1 className="font-display text-5xl leading-[0.95] text-balance sm:text-7xl">
            The motherhood for humans
            <br />
            who <span className="italic text-primary">have values.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            ZACKERZ is a value-driven alliance for high-achievers who reject weakness,
            choose courage, and forge real bonds in a collapsing world. Physical, not digital.
            Old values, run with the speed and edge of a modern startup.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/apply">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-apply-hero">
                Apply to the Order
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/order">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Read the values
              </Button>
            </Link>
          </div>
          </div>

          <div className="mt-20 grid w-full grid-cols-2 gap-6 border-t border-border pt-12 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="stat-value font-display text-4xl text-primary sm:text-5xl" data-value={s.value}>{s.value}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Capabilities badge row */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="capabilities-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="capability-badge flex flex-col items-center gap-3 rounded-lg border border-card-border px-5 py-7 text-center transition-shadow hover:shadow-md"
              >
                <c.icon className="h-7 w-7 text-primary" />
                <div className="font-display text-xl">{c.title}</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="graphite-band border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="reveal mb-12 max-w-2xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">The Four Pillars</p>
            <h2 className="font-display text-4xl text-balance sm:text-5xl">
              Shared values, not shared opinions.
            </h2>
          </div>
          <div className="pillars-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <Card key={v.title} className="pillar-card border-card-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <v.icon className="mb-4 h-7 w-7 text-primary" />
                <h3 className="mb-2 font-display text-2xl">{v.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quote band */}
      <section className="heritage-navy">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <Quote className="mx-auto mb-6 h-8 w-8 text-secondary/60" />
          <p className="font-display text-3xl leading-snug text-balance sm:text-4xl text-secondary">
            "This is not just a networking or business group. Not a self-improvement course.
            Not another online community. It is an organisation built around shared values."
          </p>
        </div>
      </section>

      {/* Membership tiers */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="reveal mb-12 max-w-2xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">Membership</p>
            <h2 className="font-display text-4xl text-balance sm:text-5xl">You're not buying perks.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              You're gaining position, power, and purpose. Four tiers, each a yearly commitment.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => (
              <Card
                key={tier.id}
                className={`relative border-card-border p-7 ${tier.id === "executive" ? "ring-2 ring-primary" : "bg-card"}`}
              >
                {tier.id === "executive" && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most chosen
                  </span>
                )}
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tier {i + 1}</p>
                <h3 className="mt-1 font-display text-2xl leading-tight">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-primary">{tier.currency}{tier.priceYearly.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">/ year</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  <li className="flex items-start gap-2"><span className="text-primary">•</span> {tier.id === "prospect" ? "Entry to the community & library" : tier.id === "mindset" ? "Coaching & full network access" : tier.id === "executive" ? "Full organisation access & training" : "Founder access & Founders' Circle"}</li>
                </ul>
                <Link href="/membership">
                  <Button className="mt-7 w-full" variant={tier.id === "executive" ? "default" : "outline"}>
                    Choose {tier.name}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Chapters */}
      {chapters.length > 0 && (
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
              <div className="reveal max-w-2xl">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">Chapters</p>
                <h2 className="font-display text-4xl text-balance sm:text-5xl">Local power, global reach.</h2>
              </div>
              <Link href="/chapters">
                <Button variant="ghost" size="sm">
                  All chapters <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {chapters.map((c) => (
                <Card key={c.id} className="border-card-border bg-card p-5">
                  <div className="font-display text-2xl">{c.city}</div>
                  <div className="text-sm text-muted-foreground">{c.country}</div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming events */}
      {events.length > 0 && (
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
              <div className="reveal max-w-2xl">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">Upcoming</p>
                <h2 className="font-display text-4xl text-balance sm:text-5xl">Expeditions & gatherings.</h2>
              </div>
              <Link href="/events">
                <Button variant="ghost" size="sm">
                  All events <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {events.map((e) => (
                <Card key={e.id} className="flex flex-col gap-1 border-card-border p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-display text-xl">{e.title}</div>
                    <div className="text-sm text-muted-foreground">{e.location}</div>
                  </div>
                  <div className="text-sm text-muted-foreground sm:text-right">
                    {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="heritage-navy">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <div className="mb-8 w-24 stripe-rule" />
          <h2 className="font-display text-4xl text-balance sm:text-6xl text-secondary">
            All ethnicities. All faiths. One standard: <span className="italic">Honor.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg text-secondary/70">
            Each applicant is interviewed personally — not to assess wealth or fame, but
            alignment with our values. Historically, only around 5% are accepted.
          </p>
          <Link href="/apply">
            <Button size="lg" variant="secondary" className="mt-8">
              Begin your application
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
    </PublicLayout>
  );
}
