import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  HeartPulse,
  Plane,
  Baby,
  PartyPopper,
  Hammer,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Member = {
  id: number;
  username: string;
  fullName: string | null;
};

type Club = {
  id: string;
  name: string;
  blurb: string;
  subItems?: string[];
  icon: LucideIcon;
  /** Club Leader — a member role: the member designated to lead this club. */
  leaderId?: number;
};

const INITIAL_CLUBS: Club[] = [
  { id: "business", name: "BUSINESS CLUB", blurb: "Founders, operators and dealmakers building ventures together.", icon: Briefcase },
  { id: "health", name: "HEALTH CLUB", blurb: "Longevity, performance and wellbeing.", subItems: ["OFF-GRID"], icon: HeartPulse },
  { id: "nomads", name: "NOMADS CLUB", blurb: "Location-independent members roaming the world.", icon: Plane },
  { id: "kids-family", name: "KIDS+FAMILY'S CLUB", blurb: "Family life, parenting and next-generation ZACKERS.", icon: Baby },
  { id: "party", name: "PARTY CLUB", blurb: "Gatherings, nightlife and celebrations across chapters.", icon: PartyPopper },
  { id: "consumer-producer", name: "CONSUMER TO PRODUCER", blurb: "From consuming to creating — makers and builders.", icon: Hammer },
];

/** Gold embers that drift up through the scene. Generated once per mount. */
function useEmbers(count = 16) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const left = Math.round((i / count) * 100 + Math.random() * 4);
        const size = 2 + Math.round(Math.random() * 3);
        const duration = 9 + Math.random() * 10;
        const delay = -Math.random() * duration;
        return { left, size, duration, delay, i };
      }),
    [count],
  );
}

function ClubCard({
  club,
  members,
  leader,
  memberName,
  onSetLeader,
}: {
  club: Club;
  members: Member[];
  leader: Member | undefined;
  memberName: (m: Member) => string;
  onSetLeader: (clubId: string, leaderId: number | undefined) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false); // Select open/focused → freeze tilt
  const Icon = club.icon;

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || locked) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    const maxTilt = 9; // degrees
    el.style.setProperty("--rx", `${(-py * maxTilt).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(px * maxTilt).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  const reset = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      ref={cardRef}
      className={`club-card-3d is-interactive ${locked ? "is-locked" : ""}`}
      data-testid={`club-${club.id}`}
      onPointerMove={handleMove}
      onPointerLeave={reset}
    >
      {/* Animated gold border frame */}
      <span className="club-frame" aria-hidden />
      {/* Pointer-tracking sheen */}
      <span className="club-sheen" aria-hidden />

      <CardContent className="relative p-5 sm:p-6">
        {/* Depth layer 1 — seal */}
        <div className="club-layer-1 mb-4 flex items-center justify-between">
          <span className="club-seal">
            <Icon size={20} strokeWidth={1.8} />
          </span>
          {leader ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4a84b]/40 bg-[#d4a84b]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e8c56a]">
              <Crown size={11} /> Led
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5a4a32]/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e8e2d6]/45">
              Vacant
            </span>
          )}
        </div>

        {/* Depth layer 2 — title + blurb */}
        <div className="club-layer-2">
          <h2 className="font-display text-xl tracking-[0.06em] text-[#e8e2d6] sm:text-2xl">
            {club.name}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#e8e2d6]/70">
            {club.blurb}
          </p>

          {club.subItems && (
            <ul className="mt-3 space-y-1">
              {club.subItems.map((sub) => (
                <li
                  key={sub}
                  className="inline-flex items-center rounded-md border border-[#5a4a32]/60 bg-[#5a4a32]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e8e2d6]/70"
                >
                  {sub}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Depth layer 3 — leader (stable, no heavy translateZ) */}
        <div className="club-layer-3 mt-5 border-t border-[#5a4a32]/40 pt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e8e2d6]/55">
            <Crown size={13} /> Club Leader
          </div>
          {leader ? (
            <div className="mb-3 flex items-center gap-2">
              <Avatar className="h-7 w-7 ring-1 ring-[#5a4a32]/60">
                <AvatarFallback className="bg-[#5a4a32]/25 text-[11px] text-[#e8e2d6]">
                  {memberName(leader).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-[#e8e2d6]">{memberName(leader)}</span>
            </div>
          ) : (
            <p className="mb-3 text-sm text-[#e8e2d6]/50">No leader yet</p>
          )}

          <Select
            value={club.leaderId != null ? String(club.leaderId) : "none"}
            onValueChange={(v) =>
              onSetLeader(club.id, v === "none" ? undefined : Number(v))
            }
            onOpenChange={(open) => setLocked(open)}
          >
            <SelectTrigger
              className="relative h-8 border-[#5a4a32]/60 bg-transparent text-xs text-[#e8e2d6] hover:border-[#5a4a32]/90"
              data-testid={`club-leader-select-${club.id}`}
              onFocus={() => setLocked(true)}
              onBlur={() => setLocked(false)}
            >
              <SelectValue placeholder="Assign a leader" />
            </SelectTrigger>
            <SelectContent
              className="z-[100] border-[#5a4a32]/60 bg-[#0b0d14] text-[#e8e2d6]"
              position="popper"
              sideOffset={6}
            >
              <SelectItem value="none">No leader</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {memberName(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </div>
  );
}

export default function ClubsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { data } = useQuery<{ members: Member[] }>({ queryKey: ["/api/members"] });
  const [clubs, setClubs] = useState<Club[]>(INITIAL_CLUBS);
  const embers = useEmbers(8);

  if (isLoading) {
    return (
      <div className="flex h-[100svh] w-full items-center justify-center bg-[#05060a] text-sm text-muted-foreground">
        Loading clubs…
      </div>
    );
  }
  if (!isAuthenticated) return <Redirect to="/login" />;

  const members = data?.members ?? [];
  const memberName = (m: Member) => m.fullName || m.username;
  const leaderOf = (club: Club) => members.find((m) => m.id === club.leaderId);

  const setLeader = (clubId: string, leaderId: number | undefined) =>
    setClubs((prev) => prev.map((c) => (c.id === clubId ? { ...c, leaderId } : c)));

  return (
    <div className="clubs-scene flex min-h-[100svh] flex-col text-[#e8e2d6]">
      {/* Immersive background layers */}
      <div className="clubs-embers" aria-hidden>
        {embers.map((e) => (
          <span
            key={e.i}
            className="clubs-ember"
            style={{
              left: `${e.left}%`,
              width: `${e.size}px`,
              height: `${e.size}px`,
              animationDuration: `${e.duration}s`,
              animationDelay: `${e.delay}s`,
            }}
          />
        ))}
      </div>
      <Navbar />
      <main className="relative z-10 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-10 sm:mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5a4a32]/60 bg-[#5a4a32]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e8e2d6]/75">
              ZACKERZ · Inner Circles
            </span>
            <h1 className="mt-4 font-display text-4xl text-[#e8c56a] drop-shadow-[0_2px_24px_rgba(232,197,106,0.25)] sm:text-6xl">
              Clubs
            </h1>
            <p className="mt-3 max-w-xl text-[#e8e2d6]/65">
              Every club can have a Club Leader — a member designated to lead it.
              Move your cursor across a card to step inside.
            </p>
          </div>

          <div className="clubs-stage">
            <div className="clubs-grid">
              {clubs.map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  members={members}
                  leader={leaderOf(club)}
                  memberName={memberName}
                  onSetLeader={setLeader}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
