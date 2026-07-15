import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Trophy, Globe, Footprints, Sparkles, Award, Check, ArrowRight,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  MERITS, type MeritSummary, type MeritAward,
} from "@shared/merits";
import { useState, type FormEvent } from "react";

type Member = { id: number; username: string | null; fullName: string | null };

const RANK_NAMES = ["Initiate", "Builder", "Steward", "Veteran", "Legend"];

function RouteCard({ label, points, total, icon: Icon, accent, barClass }: {
  label: string; points: number; total: number; icon: typeof Globe; accent: string; barClass: string;
}) {
  const pct = total > 0 ? Math.round((points / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Icon className={`h-3.5 w-3.5 ${accent}`} /> {label}
        </span>
        <span className="font-display text-lg">{points}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div className={`h-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AdminAwardForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [meritKey, setMeritKey] = useState(MERITS[0].key);
  const [note, setNote] = useState("");

  const { data: membersData } = useQuery<{ members: Member[] }>({ queryKey: ["/api/members"] });
  const members = membersData?.members ?? [];

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => apiRequest("POST", "/api/merits/award", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/merits/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Merit awarded", description: "The member's merit total updated." });
      setNote("");
    },
    onError: (e: Error) => toast({ title: "Could not award", description: e.message, variant: "destructive" }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    mutation.mutate({ userId: Number(userId), meritKey, note: note || undefined });
  };

  return (
    <div className="mt-6 rounded-lg border border-dashed border-border p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Admin — grant a merit</p>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="m-member">Member</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger id="m-member"><SelectValue placeholder="Select member" /></SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.fullName || m.username || `#${m.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="m-merit">Merit</Label>
          <Select value={meritKey} onValueChange={setMeritKey}>
            <SelectTrigger id="m-merit"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MERITS.map((m) => (
                <SelectItem key={m.key} value={m.key}>{m.title} (+{m.points})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="m-note">Note (optional)</Label>
          <Textarea id="m-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for the grant…" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={mutation.isPending || !userId}>
            {mutation.isPending ? "Awarding…" : "Grant merit"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function MeritPanel() {
  const { user } = useAuth();
  const { data: summary, isLoading } = useQuery<MeritSummary>({ queryKey: ["/api/merits/me"] });

  if (isLoading || !summary) {
    return (
      <Card className="border-border">
        <CardHeader><CardTitle className="font-display text-xl">Merits</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Loading merits…</p></CardContent>
      </Card>
    );
  }

  const earnedKeys = new Set(summary.awards.map((a: MeritAward) => a.meritKey));
  const virtualMerits = MERITS.filter((m) => m.route === "virtual");
  const realMerits = MERITS.filter((m) => m.route === "real");
  const nextRank = summary.nextRank;
  const rankFloor = summary.rank.min;
  const rankSpan = nextRank ? nextRank.min - rankFloor : 1;
  const rankPct = nextRank ? Math.min(100, Math.round(((summary.total - rankFloor) / rankSpan) * 100)) : 100;

  const recent = summary.awards.slice(0, 6);

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-xl">Merits</CardTitle>
        <span className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Trophy className="h-3.5 w-3.5" /> Rank {summary.rank.tier} · {summary.rank.name}
        </span>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total + rank progress */}
        <div>
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-4xl">{summary.total}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">merit points</p>
            </div>
            {nextRank ? (
              <p className="text-right text-xs text-muted-foreground">
                {nextRank.min - summary.total} pts to <span className="text-foreground">Rank {nextRank.tier} · {nextRank.name}</span>
              </p>
            ) : (
              <p className="text-right text-xs text-primary">Top rank reached</p>
            )}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-primary" style={{ width: `${rankPct}%` }} />
          </div>
        </div>

        {/* Route split */}
        <div className="grid gap-3 sm:grid-cols-2">
          <RouteCard label="Virtual route" points={summary.virtual} total={summary.total} icon={Globe} accent="text-sky-500" barClass="bg-sky-500" />
          <RouteCard label="Real route" points={summary.real} total={summary.total} icon={Footprints} accent="text-amber-500" barClass="bg-amber-500" />
        </div>

        {/* Badges */}
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Badges</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[...virtualMerits, ...realMerits].map((m) => {
              const earned = earnedKeys.has(m.key);
              return (
                <div
                  key={m.key}
                  className={`flex items-start gap-2 rounded-lg border p-3 ${earned ? "border-primary/40 bg-primary/5" : "border-border bg-card/30 opacity-60"}`}
                >
                  <Award className={`mt-0.5 h-4 w-4 shrink-0 ${earned ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {m.title} <span className="text-xs text-muted-foreground">+{m.points}</span>
                      {earned && <Check className="h-3.5 w-3.5 text-primary" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{m.route === "virtual" ? "Virtual" : "Real"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next missions */}
        {recent.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Recent merits
            </p>
            <ul className="space-y-1.5">
              {recent.map((a) => {
                const def = MERITS.find((m) => m.key === a.meritKey);
                return (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      {def?.title ?? a.meritKey}
                      {a.sourceType === "admin" && <span className="text-[10px] uppercase tracking-wider text-primary">admin</span>}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      +{a.points}
                      <span>{new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {user?.role === "admin" && <AdminAwardForm />}
      </CardContent>
    </Card>
  );
}
