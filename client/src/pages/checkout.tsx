import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Lock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { TIERS, TIER_FEATURES, TIER_PREREQUISITE } from "@shared/schema";

type TierId = "prospect" | "mindset" | "executive" | "og";
const ORDER: TierId[] = ["prospect", "mindset", "executive", "og"];

export default function Checkout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { data } = useQuery<{ tiers: typeof TIERS[keyof typeof TIERS][] }>({ queryKey: ["/api/tiers"] });
  const { data: memData } = useQuery<{ membership: { status: string; tier: string } | null }>({ queryKey: ["/api/memberships/me"] });

  const tiers = data?.tiers ?? [];
  const byId = Object.fromEntries(tiers.map((t) => [t.id, t]));
  const activeTier = memData?.membership?.status === "active" ? (memData.membership.tier as TierId) : null;

  const checkout = useMutation({
    mutationFn: async (tier: TierId) => (await apiRequest("POST", "/api/memberships", { tier })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memberships/me"] });
      toast({ title: "Membership activated. Welcome to the Order." });
      navigate("/dashboard");
    },
    onError: (err) => toast({
      title: "Could not complete",
      description: err instanceof Error ? err.message.split(":").slice(1).join(":").trim() : "",
      variant: "destructive",
    }),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="mb-10 text-center">
            <h1 className="font-display text-4xl sm:text-5xl">Choose your level</h1>
            <p className="mt-3 text-muted-foreground">Simulated checkout — no real charge. Select a tier to activate your membership.</p>
          </div>

          {activeTier && (
            <div className="mb-8 rounded-lg border border-primary/30 bg-primary/10 p-4 text-center text-sm">
              You're an active <strong>{TIERS[activeTier]?.name}</strong> member.
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ORDER.map((id, i) => {
              const tier = byId[id] ?? TIERS[id];
              const features = TIER_FEATURES[id];
              const prereq = TIER_PREREQUISITE[id];
              const isCurrent = activeTier === id;
              const featured = id === "executive";
              return (
                <Card key={id} className={`border-border ${featured ? "ring-2 ring-primary" : ""}`} data-testid={`card-checkout-${id}`}>
                  <CardContent className="p-6">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tier {i + 1}</p>
                    <h2 className="mt-1 font-display text-2xl leading-tight">{tier?.name}</h2>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-display text-3xl text-primary">{tier?.currency}{tier?.priceYearly.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">/ year</span>
                    </div>
                    <ul className="mt-5 space-y-2">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />{f}</li>
                      ))}
                    </ul>
                    {prereq && <p className="mt-4 text-xs italic text-muted-foreground">{prereq}</p>}
                    {isCurrent ? (
                      <Button className="mt-5 w-full" disabled><Lock className="mr-2 h-4 w-4" />Current tier</Button>
                    ) : (
                      <Button
                        className="mt-5 w-full"
                        variant={featured ? "default" : "outline"}
                        onClick={() => checkout.mutate(id)}
                        disabled={checkout.isPending}
                        data-testid={`button-checkout-${id}`}
                      >
                        {checkout.isPending ? "Processing…" : `Activate ${tier?.name}`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {!user && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">Sign in</Link> to complete your membership.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
