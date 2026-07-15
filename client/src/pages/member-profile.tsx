import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, MessageSquare, ArrowLeft, Briefcase, Globe, UserCircle, Trophy, Award, Footprints } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMessageDock } from "@/hooks/use-message-dock";
import { MERITS } from "@shared/merits";

type Member = {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  city: string | null;
  country: string | null;
  field: string | null;
  bio: string | null;
  role: string;
  isOg?: boolean;
};

type PublicMerit = {
  total: number; virtual: number; real: number;
  rank: { tier: number; name: string; min: number };
  nextRank: { tier: number; name: string; min: number } | null;
  badges: { meritKey: string; route: string; points: number }[];
};

function MemberMeritCard({ memberId }: { memberId: number }) {
  const { data, isLoading } = useQuery<PublicMerit>({
    queryKey: [`/api/members/${memberId}/merits`],
  });
  if (isLoading || !data) return null;
  const earnedKeys = new Set(data.badges.map((b) => b.meritKey));
  const earned = MERITS.filter((m) => earnedKeys.has(m.key));
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Merits</h2>
        <span className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Trophy className="h-3.5 w-3.5" /> Rank {data.rank.tier} · {data.rank.name}
        </span>
      </div>
      <div className="mt-4 flex items-end gap-6">
        <div>
          <p className="font-display text-3xl">{data.total}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">merit points</p>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-sky-500" />{data.virtual}</span>
          <span className="flex items-center gap-1"><Footprints className="h-3.5 w-3.5 text-amber-500" />{data.real}</span>
        </div>
      </div>
      {earned.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {earned.map((m) => (
            <span
              key={m.key}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-foreground"
              title={m.description}
            >
              <Award className="h-3 w-3 text-primary" /> {m.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>();
  const memberId = parseInt(String(id), 10);
  const { user } = useAuth();
  const { openDock } = useMessageDock();

  const { data, isLoading } = useQuery<{ members: Member[]; viewerIsOg?: boolean }>({
    queryKey: ["/api/members"],
  });

  const member = useMemo(
    () => (data?.members ?? []).find((m) => m.id === memberId),
    [data, memberId]
  );

  const viewerIsOg = data?.viewerIsOg ?? false;
  const masked = member?.isOg && !viewerIsOg;

  const isSelf = member && user && member.id === user.id;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">
            Loading member…
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <UserCircle className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h1 className="font-display text-2xl">Member not found</h1>
            <p className="mt-2 text-muted-foreground">
              This member may have left the network.
            </p>
            <Link href="/members">
              <Button variant="outline" className="mt-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to directory
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Masked OG member (viewer is not OG)
  if (masked) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <Link href="/members">
              <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Directory
              </Button>
            </Link>
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
              <Avatar className="mx-auto h-20 w-20">
                <AvatarFallback className="bg-secondary/15 text-2xl font-semibold text-[hsl(var(--secondary))]">OG</AvatarFallback>
              </Avatar>
              <h1 className="mt-5 font-display text-3xl tracking-tight sm:text-4xl">O.G. ZACKER</h1>
              <p className="mt-2 text-muted-foreground">Circle of Trust</p>
              <p className="mx-auto mt-6 max-w-md text-sm text-muted-foreground">
                This member belongs to the O.G. ZACKERS CIRCLE OF TRUST. Their identity and contact details are visible only to fellow O.G. members.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const locationStr = [member.city, member.country].filter(Boolean).join(", ");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <Link href="/members">
            <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" /> Directory
            </Button>
          </Link>

          {/* Header card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                  {member.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
                  {member.fullName || member.username}
                </h1>
                <p className="mt-1 text-muted-foreground">@{member.username}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  {member.field && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-[hsl(var(--secondary))]" />
                      {member.field}
                    </span>
                  )}
                  {locationStr && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-[hsl(var(--secondary))]" />
                      {locationStr}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {member.bio ? (
              <div className="mt-6 border-t border-border pt-6">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  About
                </h2>
                <p className="whitespace-pre-line text-foreground">{member.bio}</p>
              </div>
            ) : (
              <div className="mt-6 border-t border-border pt-6">
                <p className="text-sm italic text-muted-foreground">
                  {member.fullName || member.username} hasn't written a bio yet.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              {!isSelf && (
                <Button
                  onClick={() => openDock(member.id)}
                  data-testid={`button-message-${member.id}`}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Message
                </Button>
              )}
              {locationStr && (
                <Link href="/network">
                  <Button variant="outline">
                    <Globe className="mr-2 h-4 w-4" /> View on map
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Public merits */}
          <MemberMeritCard memberId={member.id} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
