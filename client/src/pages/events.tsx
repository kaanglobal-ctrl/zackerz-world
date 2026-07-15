import PublicLayout from "@/components/public-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Compass, Users as UsersIcon, Plus, Plane, ShoppingBag, Landmark, Mountain } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState, type FormEvent } from "react";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type EventItem = {
  id: number; title: string; description: string; date: string;
  location: string; type: string; capacity: number;
};

type HostChapter = { id: number; city: string; country: string; role: "king" | "gatekeeper" };
type HostPermissions = { canHostEvents: boolean; chapters: HostChapter[] };

const TYPE_META: Record<string, { icon: typeof Compass; label: string }> = {
  expedition: { icon: Compass, label: "Expedition" },
  meeting: { icon: UsersIcon, label: "Meeting" },
  festival: { icon: UsersIcon, label: "Festival" },
  masterclass: { icon: UsersIcon, label: "Masterclass" },
};

const EVENT_TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "expedition", label: "Expedition" },
  { value: "masterclass", label: "Masterclass" },
  { value: "festival", label: "Festival" },
];

const CURATED_EXPERIENCES = [
  {
    icon: Mountain,
    title: "Pilgrimage to Athos",
    location: "Mount Athos, Greece",
    description:
      "A monastic retreat on the Holy Mountain — silence, discipline, and centuries of tradition. Limited to a small delegation each season.",
  },
  {
    icon: ShoppingBag,
    title: "Curated Shopping & Culture",
    location: "Istanbul, Türkiye",
    description:
      "Private access to the Grand Bazaar's finest houses, bespoke tailoring, and a night among Ottoman palaces — guided by locals who open doors others can't.",
  },
  {
    icon: Landmark,
    title: "Founders' Summit",
    location: "Shanghai, China",
    description:
      "Where East meets ambition. A closed-door gathering of operators and capital, followed by a private dinner overlooking the Bund.",
  },
  {
    icon: Plane,
    title: "Alpine Chapter Gathering",
    location: "Vienna, Austria",
    description:
      "A weekend of coffeehouse strategy sessions, formalwear, and the kind of conversation that doesn't happen over email.",
  },
];

function HostEventForm({ permissions }: { permissions: HostPermissions }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const firstChapterId = String(permissions.chapters[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [chapterId, setChapterId] = useState(firstChapterId);
  const [type, setType] = useState("meeting");
  const [capacity, setCapacity] = useState("20");

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/events", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event posted", description: "Your free event is live." });
      setTitle(""); setDescription(""); setDate(""); setLocation(""); setCapacity("20"); setType("meeting");
    },
    onError: (e: Error) => {
      toast({ title: "Could not post event", description: e.message, variant: "destructive" });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      title, description, date, location,
      chapterId: chapterId ? Number(chapterId) : undefined,
      type, capacity: Number(capacity) || 20,
    });
  };

  const roleLabel = permissions.chapters[0]?.role === "king" ? "King" : "Gatekeeper";

  return (
    <Card className="mb-10 border-primary/30 bg-card p-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-primary">
          <Plus className="h-3 w-3" /> Put up a free event
        </span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {roleLabel} · {permissions.chapters.map((c) => c.city).join(", ")}
        </span>
      </div>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="ev-title">Title</Label>
          <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Monthly chapter gathering" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ev-desc">Description</Label>
          <Textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} placeholder="What members can expect…" />
        </div>
        <div>
          <Label htmlFor="ev-date">Date &amp; time</Label>
          <Input id="ev-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="ev-location">Location</Label>
          <Input id="ev-location" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Vienna, AT" />
        </div>
        <div>
          <Label htmlFor="ev-type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="ev-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ev-capacity">Capacity</Label>
          <Input id="ev-capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </div>
        {permissions.chapters.length > 1 && (
          <div className="sm:col-span-2">
            <Label htmlFor="ev-chapter">Chapter</Label>
            <Select value={chapterId} onValueChange={setChapterId}>
              <SelectTrigger id="ev-chapter"><SelectValue /></SelectTrigger>
              <SelectContent>
                {permissions.chapters.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.city}, {c.country} ({c.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Posting…" : "Put up event"}
          </Button>
          <span className="text-xs text-muted-foreground">Free — no ticket pricing.</span>
        </div>
      </form>
    </Card>
  );
}

export default function Events() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useQuery<{ events: EventItem[] }>({ queryKey: ["/api/events"] });
  const events = (data?.events ?? [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const { data: perms } = useQuery<HostPermissions | null>({
    queryKey: ["/api/events/host-permissions"],
    enabled: isAuthenticated,
    queryFn: getQueryFn<HostPermissions | null>({ on401: "returnNull" }),
  });
  const canHost = !!perms?.canHostEvents;

  return (
    <PublicLayout>
      <section className="border-b border-border paper-grain">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-primary">Events</p>
          <h1 className="font-display text-5xl leading-tight text-balance sm:text-6xl">
            Tough experiences, stronger connections.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            From Shanghai to Vienna, to Athos. The physical will make you stronger.
          </p>
        </div>
      </section>

      {/* Curated experiences — the jet-setter showcase */}
      <section className="heritage-navy border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-12 max-w-2xl text-center sm:mx-auto">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-secondary/70">Curated Travel</p>
            <h2 className="font-display text-4xl text-balance sm:text-5xl text-secondary">
              A calendar built for those who move.
            </h2>
            <p className="mt-4 text-secondary/70">
              Beyond local chapter meetings, the Order curates a handful of members-only
              expeditions each year — small in number, deliberate in access.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {CURATED_EXPERIENCES.map((exp) => (
              <div
                key={exp.title}
                className="rounded-lg border border-secondary/25 bg-secondary/[0.03] p-6 transition-colors hover:border-secondary/50"
              >
                <exp.icon className="h-6 w-6 text-secondary" />
                <h3 className="mt-4 font-display text-2xl text-secondary">{exp.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs uppercase tracking-wider text-secondary/50">
                  <MapPin className="h-3 w-3" /> {exp.location}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-secondary/70">{exp.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          {canHost && perms && <HostEventForm permissions={perms} />}

          {isLoading ? (
            <p className="text-muted-foreground">Loading events…</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {events.map((e) => {
                const meta = TYPE_META[e.type] ?? TYPE_META.meeting;
                return (
                  <Card key={e.id} className="border-card-border bg-card p-6">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <meta.icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-2xl">{e.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{e.description}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{e.location}</span>
                      <span className="flex items-center gap-1.5"><UsersIcon className="h-3.5 w-3.5" />{e.capacity} spots</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-12 rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="font-display text-2xl">Events are members-only.</p>
            <p className="mt-2 text-sm text-muted-foreground">Join the Order to RSVP to expeditions, masterclasses, and Zackerz Fests.</p>
            <Link href="/apply"><Button className="mt-5">Apply to the Order</Button></Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
