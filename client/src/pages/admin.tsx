import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

type Application = {
  id: number; userId: number; fullName: string; email: string; age: string;
  country: string; city: string; field: string; yearsExperience: string;
  whyJoin: string; valuesAlignment: string; contribution: string; referral?: string | null;
  status: "pending" | "approved" | "rejected"; createdAt: string;
};

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");

  const { data, isLoading } = useQuery<{ applications: Application[] }>({
    queryKey: ["/api/admin/applications", filter],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/applications?status=${filter}`);
      return res.json();
    },
  });
  const apps = (data?.applications ?? []).slice().reverse();

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
      (await apiRequest("PATCH", `/api/admin/applications/${id}`, { status })).json(),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({ title: `Application ${vars.status}.` });
    },
  });

  const FILTERS: { id: typeof filter; label: string }[] = [
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h1 className="font-display text-4xl">Warden's console</h1>
          <p className="mt-1 text-muted-foreground">Review and decide on applications.</p>

          <div className="mt-6 flex gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f.id}
                variant={filter === f.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : apps.length === 0 ? (
              <p className="text-muted-foreground">No {filter} applications.</p>
            ) : (
              apps.map((a) => (
                <Card key={a.id} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-2xl">{a.fullName}</h2>
                        <p className="text-sm text-muted-foreground">{a.email} · {a.age} yrs · {a.city}, {a.country}</p>
                      </div>
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs capitalize">{a.status}</span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div><dt className="text-muted-foreground">Field</dt><dd>{a.field} ({a.yearsExperience} yrs)</dd></div>
                      {a.referral && <div><dt className="text-muted-foreground">Referral</dt><dd>{a.referral}</dd></div>}
                    </dl>
                    <div className="mt-4 space-y-3 text-sm">
                      <div><p className="text-muted-foreground">Why join</p><p>{a.whyJoin}</p></div>
                      <div><p className="text-muted-foreground">Values alignment</p><p>{a.valuesAlignment}</p></div>
                      <div><p className="text-muted-foreground">Contribution</p><p>{a.contribution}</p></div>
                    </div>
                    {a.status === "pending" && (
                      <div className="mt-5 flex gap-2">
                        <Button size="sm" onClick={() => decide.mutate({ id: a.id, status: "approved" })} data-testid={`button-approve-${a.id}`}>
                          <Check className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a.id, status: "rejected" })} data-testid={`button-reject-${a.id}`}>
                          <X className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}