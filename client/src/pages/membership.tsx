import PublicLayout from "@/components/public-layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { TIERS, TIER_FEATURES, TIER_PREREQUISITE } from "@shared/schema";

const ORDER = ["prospect", "mindset", "executive", "og"] as const;

export default function Membership() {
  const { data } = useQuery<{ tiers: typeof TIERS[keyof typeof TIERS][] }>({ queryKey: ["/api/tiers"] });
  const tiers = data?.tiers ?? [];
  const byId = Object.fromEntries(tiers.map((t) => [t.id, t]));

  return (
    <PublicLayout>
      <section className="border-b border-border paper-grain">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-primary">Membership</p>
          <h1 className="font-display text-5xl leading-tight text-balance sm:text-6xl">
            You're not buying perks. You're gaining position, power, and purpose.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">A yearly commitment. Membership may be cancelled at any time.</p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ORDER.map((id, i) => {
              const tier = byId[id] ?? TIERS[id];
              const features = TIER_FEATURES[id];
              const prereq = TIER_PREREQUISITE[id];
              const featured = id === "executive";
              return (
                <div
                  key={id}
                  data-testid={`card-tier-${id}`}
                  className={`relative flex flex-col rounded-lg border bg-card p-7 ${featured ? "border-primary ring-2 ring-primary" : "border-border"}`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Most chosen
                    </span>
                  )}
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tier {i + 1}</p>
                  <h2 className="mt-1 font-display text-2xl leading-tight">{tier?.name ?? "—"}</h2>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-display text-4xl text-primary">{tier?.currency}{tier?.priceYearly.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">/ year</span>
                  </div>
                  <ul className="mt-6 space-y-2.5">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {prereq && (
                    <p className="mt-4 text-xs italic text-muted-foreground">{prereq}</p>
                  )}
                  <div className="mt-auto pt-6">
                    <Link href="/checkout">
                      <Button className="w-full" variant={featured ? "default" : "outline"} data-testid={`button-choose-${id}`}>
                        Choose {tier?.name}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Applications are reviewed personally. Historically, only a small fraction of applicants are accepted.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
