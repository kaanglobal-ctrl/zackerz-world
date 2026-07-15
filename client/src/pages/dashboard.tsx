import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MemberLevelBadge from "@/components/member-level-badge";
import { Calendar, MapPin, Users, Clock, ShieldCheck, ShieldAlert, Hourglass, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MeritPanel from "@/components/merit-panel";

type Membership = { id: number; tier: "prospect" | "mindset" | "executive" | "og"; status: string; expiresAt: string };
type Application = { id: number; status: "pending" | "approved" | "rejected" };
type Rsvp = { id: number; eventId: number; status: "going" | "interested" };
type EventItem = { id: number; title: string; date: string; location: string; type: string; capacity: number };

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    fullName: user?.fullName || "",
    city: user?.city || "",
    country: user?.country || "",
    field: user?.field || "",
    bio: user?.bio || "",
  });

  const { data: appData } = useQuery<{ application: Application | null }>({
    queryKey: ["/api/applications/me"],
  });
  const { data: memData } = useQuery<{ membership: Membership | null }>({
    queryKey: ["/api/memberships/me"],
  });
  const { data: rsvpData } = useQuery<{ rsvps: Rsvp[] }>({ queryKey: ["/api/rsvps/me"] });
  const { data: eventData } = useQuery<{ events: EventItem[] }>({ queryKey: ["/api/events"] });

  const application = appData?.application ?? null;
  const membership = memData?.membership ?? null;
  const myRsvps = rsvpData?.rsvps ?? [];
  const events = (eventData?.events ?? []).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const myEvents = events.filter((e) => myRsvps.some((r) => r.eventId === e.id));

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: number; status: "going" | "interested" }) =>
      (await apiRequest("POST", "/api/rsvps", { eventId, status })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rsvps/me"] });
      toast({ title: "RSVP updated." });
    },
  });
  const cancelRsvp = useMutation({
    mutationFn: async (eventId: number) => (await apiRequest("DELETE", `/api/rsvps/${eventId}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rsvps/me"] });
      toast({ title: "RSVP cancelled." });
    },
  });

  const saveProfile = async () => {
    try {
      await apiRequest("PATCH", "/api/profile", profile);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditing(false);
      toast({ title: "Profile updated." });
    } catch (err) {
      toast({ title: "Could not save", description: err instanceof Error ? err.message : "", variant: "destructive" });
    }
  };

  const appStatus = application?.status;
  const isMember = membership?.status === "active";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          {/* Header */}
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl">Welcome, {user?.username}.</h1>
              <p className="mt-1 text-muted-foreground">{user?.email}</p>
            </div>
            {membership && <MemberLevelBadge tier={membership.tier} />}
          </div>

          {/* Status row */}
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {/* Application status */}
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" /> Application
                </div>
                {!application ? (
                  <p className="mt-2 text-sm">No application yet. <Link href="/apply" className="text-primary hover:underline">Apply</Link>.</p>
                ) : appStatus === "pending" ? (
                  <div className="mt-2 flex items-center gap-2"><Hourglass className="h-5 w-5 text-amber-600" /><span className="font-display text-xl">Under review</span></div>
                ) : appStatus === "approved" ? (
                  <div className="mt-2 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /><span className="font-display text-xl">Approved</span></div>
                ) : (
                  <div className="mt-2 flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /><span className="font-display text-xl">Not accepted</span></div>
                )}
              </CardContent>
            </Card>

            {/* Membership status */}
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Users className="h-4 w-4" /> Membership
                </div>
                {isMember ? (
                  <>
                    <p className="mt-2 font-display text-xl">{membership.tier === "og" ? "OG ZACKERS CIRCLE OF TRUST" : membership.tier === "executive" ? "Executive" : membership.tier === "mindset" ? "Mindset & Success" : "Prospect"}</p>
                    <p className="text-xs text-muted-foreground">Renews {new Date(membership.expiresAt).toLocaleDateString()}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm">No active membership. <Link href="/membership" className="text-primary hover:underline">Choose a tier</Link>.</p>
                )}
              </CardContent>
            </Card>

            {/* RSVPs */}
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Your events
                </div>
                <p className="mt-2 font-display text-xl">{myRsvps.length} RSVPs</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Profile */}
            <Card className="border-border lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-xl">Profile</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)}>{editing ? "Cancel" : "Edit"}</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {editing ? (
                  <>
                    <div className="space-y-1.5"><Label>Full name</Label><Input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5"><Label>City</Label><Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></div>
                      <div className="space-y-1.5"><Label>Country</Label><Input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} /></div>
                    </div>
                    <div className="space-y-1.5"><Label>Field</Label><Input value={profile.field} onChange={(e) => setProfile({ ...profile, field: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Bio</Label><Textarea rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} /></div>
                    <Button className="w-full" onClick={saveProfile}>Save profile</Button>
                  </>
                ) : (
                  <dl className="space-y-2 text-sm">
                    {([["Full name", user?.fullName], ["City", user?.city], ["Country", user?.country], ["Field", user?.field], ["Bio", user?.bio]] as const).map(([k, v]) => (
                      <div key={k}><dt className="text-muted-foreground">{k}</dt><dd>{v || "—"}</dd></div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>

            {/* Upcoming events */}
            <Card className="border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-display text-xl">Upcoming events</CardTitle>
              </CardHeader>
              <CardContent>
                {isMember ? (
                  <div className="space-y-3">
                    {events.map((e) => {
                      const rsvp = myRsvps.find((r) => r.eventId === e.id);
                      return (
                        <div key={e.id} className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-display text-lg">{e.title}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{e.capacity}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {rsvp ? (
                              <>
                                <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs text-primary">{rsvp.status === "going" ? "Going" : "Interested"}</span>
                                <Button size="sm" variant="outline" onClick={() => cancelRsvp.mutate(e.id)}>Cancel</Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" onClick={() => rsvpMutation.mutate({ eventId: e.id, status: "going" })}>Going</Button>
                                <Button size="sm" variant="outline" onClick={() => rsvpMutation.mutate({ eventId: e.id, status: "interested" })}>Interested</Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {myEvents.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Your confirmed events</p>
                        {myEvents.map((e) => (
                          <div key={e.id} className="flex items-center gap-2 text-sm"><Clock className="h-3.5 w-3.5 text-primary" />{e.title} — {new Date(e.date).toLocaleDateString()}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="font-display text-xl">Activate membership to RSVP</p>
                    <p className="mt-1 text-sm text-muted-foreground">Choose a tier to unlock events & expeditions.</p>
                    <Link href="/membership"><Button className="mt-4">View membership</Button></Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Merit system */}
          <div className="mt-8">
            <MeritPanel />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
