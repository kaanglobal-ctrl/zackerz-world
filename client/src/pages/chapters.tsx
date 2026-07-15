import { lazy, Suspense } from "react";
import PublicLayout from "@/components/public-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Users, Crown, KeyRound, Clock, DoorOpen, Lock, Check, Landmark } from "lucide-react";

const GlobeHero = lazy(() => import("@/components/globe-hero"));

const ROMAN = ["I", "II", "III", "IV"];
const FOUNDED_CHAPTERS = [
  { city: "Paris", country: "France" },
  { city: "Vienna", country: "Austria" },
  { city: "Belgrade", country: "Serbia" },
  { city: "Istanbul", country: "Türkiye" },
];

type GateStatus = "open" | "sealed";

type Chapter = {
  id: number; city: string; country: string; lead: string;
  memberCount: number; description: string; meetingCadence: string;
  king: { userId: number; codename: string | null; fullName: string | null } | null;
  gate: { id: number; name: string; address: string | null; active: boolean } | null;
  gatekeeper: { userId: number; codename: string | null; fullName: string | null } | null;
  vigil: { weekday: number; startTime: string; endTime: string } | null;
  gateStatus: GateStatus;
  gateReason: string | null;
  checkedInToday: boolean;
};

// Live gatekeeper data is Monday-indexed (weekday 4 = Friday). Match the server.
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function vigilLabel(vigil: Chapter["vigil"]): string {
  if (!vigil) return "No vigil set";
  const day = WEEKDAYS[vigil.weekday] ?? "—";
  return `${day}s · ${vigil.startTime}–${vigil.endTime}`;
}

function parseErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message.replace(/^\d+:\s*/, "") : "";
  try {
    const j = JSON.parse(raw);
    return j.message ? (j.reason ? `${j.message} — ${j.reason}` : j.message) : raw;
  } catch {
    return raw || "Something went wrong";
  }
}

export default function Chapters() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ chapters: Chapter[] }>({ queryKey: ["/api/chapters"] });
  const { data: membershipData } = useQuery<{ membership: { status?: string } | null }>({
    queryKey: ["/api/memberships/me"],
    enabled: isAuthenticated,
  });
  const isMember = membershipData?.membership?.status === "active";

  const chapters = data?.chapters ?? [];

  const checkIn = useMutation({
    mutationFn: async (chapterId: number) =>
      (await apiRequest("POST", `/api/chapters/${chapterId}/check-in`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chapters"] });
      toast({ title: "Checked in ✓", description: "Your presence at the Gate is recorded." });
    },
    onError: (e) =>
      toast({ title: "Could not check in", description: parseErrorMessage(e), variant: "destructive" }),
  });

  return (
    <PublicLayout>
      <section className="border-b border-border paper-grain">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-primary">Chapters</p>
          <h1 className="font-display text-5xl leading-tight text-balance sm:text-6xl">
            The power of a global network, concentrated locally.
          </h1>
        </div>
      </section>

      {/* Founded chapters showcase — classical/heritage styling */}
      <section className="heritage-navy border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <Landmark className="mx-auto mb-5 h-9 w-9 text-secondary" />
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-secondary/70">Established &amp; Active</p>
          <h2 className="mt-4 font-display text-4xl text-balance sm:text-5xl text-secondary">
            We have already formed <span className="italic">four Chapters.</span>
          </h2>
          <div className="mx-auto mt-8 w-24 stripe-rule" />

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FOUNDED_CHAPTERS.map((c, i) => (
              <div
                key={c.city}
                className="rounded-lg border border-secondary/25 bg-secondary/[0.03] px-6 py-8 transition-colors hover:border-secondary/50"
              >
                <div className="font-display text-lg text-secondary/50">{ROMAN[i]}</div>
                <div className="mt-2 font-display text-2xl text-secondary">{c.city}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-secondary/50">{c.country}</div>
              </div>
            ))}
          </div>

          <div className="mt-16 h-[320px] sm:h-[420px]">
            <Suspense fallback={null}>
              <GlobeHero chapters={FOUNDED_CHAPTERS} />
            </Suspense>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading chapters…</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {chapters.map((c) => {
                const open = c.gateStatus === "open";
                const canCheckIn = open && isAuthenticated && isMember && !c.checkedInToday;
                return (
                  <Card key={c.id} className="border-card-border bg-card p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="font-display text-3xl">{c.city}</h2>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {c.country}
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {c.memberCount}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.description}</p>

                    {/* Chapters Gate */}
                    <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--secondary))]">
                            {c.gate?.name ?? "Chapters Gate"}
                          </p>
                          {c.gate?.address && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.gate.address}</p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            open ? "gate-badge-open" : "gate-badge-sealed"
                          }`}
                        >
                          {open ? <DoorOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          {open ? "OPEN" : "SEALED"}
                        </span>
                      </div>

                      <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 shrink-0 text-[hsl(var(--secondary))]" />
                          <dt className="text-muted-foreground">King:</dt>
                          <dd className="min-w-0 truncate">
                            {c.king?.codename ? (
                              <>
                                <span className="font-medium text-foreground">{c.king.codename}</span>
                                {c.king.fullName && (
                                  <span className="ml-1.5 text-xs text-muted-foreground">{c.king.fullName}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Vacant</span>
                            )}
                          </dd>
                        </div>

                        <div className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4 shrink-0 text-[hsl(var(--secondary))]" />
                          <dt className="text-muted-foreground">Ostiary:</dt>
                          <dd className="min-w-0 truncate">
                            {c.gatekeeper?.codename ? (
                              <>
                                <span className="font-medium text-foreground">{c.gatekeeper.codename}</span>
                                {c.gatekeeper.fullName && (
                                  <span className="ml-1.5 text-xs text-muted-foreground">{c.gatekeeper.fullName}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </dd>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-[hsl(var(--secondary))]" />
                          <dt className="text-muted-foreground">Vigil:</dt>
                          <dd className="text-foreground">{vigilLabel(c.vigil)}</dd>
                        </div>
                      </dl>

                      <div className="mt-4">
                        {c.checkedInToday ? (
                          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-[hsl(var(--secondary))]/40 bg-[hsl(var(--secondary))]/10 px-3 py-2 text-sm font-medium text-[hsl(var(--secondary))]">
                            <Check className="h-4 w-4" /> Checked in ✓
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full gate-checkin-btn"
                            disabled={!canCheckIn || checkIn.isPending}
                            onClick={() => checkIn.mutate(c.id)}
                            data-testid={`button-checkin-${c.id}`}
                          >
                            <DoorOpen className="mr-1.5 h-4 w-4" />
                            {checkIn.isPending && checkIn.variables === c.id
                              ? "Checking in…"
                              : open
                              ? "Check in"
                              : "Gate sealed"}
                          </Button>
                        )}
                        {!open && !c.checkedInToday && (
                          <p className="mt-2 text-center text-xs text-muted-foreground">
                            Opens on {vigilLabel(c.vigil)}
                          </p>
                        )}
                        {open && !c.checkedInToday && isAuthenticated && !isMember && (
                          <p className="mt-2 text-center text-xs text-muted-foreground">
                            Active membership required to check in.
                          </p>
                        )}
                        {open && !c.checkedInToday && !isAuthenticated && (
                          <p className="mt-2 text-center text-xs text-muted-foreground">
                            Sign in as a member to check in.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                      <span className="text-muted-foreground">Lead: <span className="text-foreground">{c.lead}</span></span>
                      <span className="text-muted-foreground">{c.meetingCadence}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
