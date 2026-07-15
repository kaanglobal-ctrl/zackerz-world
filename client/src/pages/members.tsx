import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, MapPin, Search, Users } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMessageDock } from "@/hooks/use-message-dock";

type Member = {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  city: string | null;
  country: string | null;
  field: string | null;
  role: string;
  isOg?: boolean;
};

export default function Members() {
  const { user } = useAuth();
  const { openDock } = useMessageDock();
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery<{ members: Member[]; viewerIsOg?: boolean }>({ queryKey: ["/api/members"] });
  const viewerIsOg = data?.viewerIsOg ?? false;

  const members = (data?.members ?? []).filter((m) => {
    if (m.id === user?.id) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.username.toLowerCase().includes(q) ||
      (m.fullName ?? "").toLowerCase().includes(q) ||
      (m.field ?? "").toLowerCase().includes(q) ||
      (m.city ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl">Member Directory</h1>
              <p className="mt-2 text-muted-foreground">{members.length} members in the network.</p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                data-testid="input-member-search"
              />
            </div>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Loading members…</p>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-display text-xl">No members found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => {
                const masked = m.isOg && !viewerIsOg;
                const displayName = masked ? "O.G. ZACKER" : (m.fullName || m.username);
                return (
                <Card key={m.id} className="border-border" data-testid={`card-member-${m.id}`}>
                  <CardContent className="p-5">
                    {masked ? (
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarFallback className="bg-secondary/15 text-xs text-[hsl(var(--secondary))]">OG</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-lg leading-tight">O.G. ZACKER</p>
                          <p className="truncate text-sm text-muted-foreground">Circle of Trust</p>
                        </div>
                      </div>
                    ) : (
                    <Link href={`/members/${m.id}`} className="flex items-start gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {m.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg leading-tight hover:text-primary" data-testid={`text-member-name-${m.id}`}>
                          {displayName}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">@{m.username}</p>
                      </div>
                    </Link>
                    )}
                    <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                      {m.field && <p className="truncate">{m.field}</p>}
                      {(m.city || m.country) && (
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5" />
                          {[m.city, m.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    {masked ? (
                      <p className="mt-4 w-full text-center text-xs text-muted-foreground">Anonymous</p>
                    ) : (
                    <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => openDock(m.id)} data-testid={`button-message-${m.id}`}>
                      <MessageSquare className="mr-2 h-4 w-4" /> Message
                    </Button>
                    )}
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
