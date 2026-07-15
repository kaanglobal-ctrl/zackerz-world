// ZACKERZ Merit System v1
// -----------------------
// A merit is an award recorded as an append-only row in the `merit_awards`
// ledger (see migrations/0002_merits.sql). Points, route splits and ranks are
// all COMPUTED from that ledger — there is no points column on users.
//
// Earning is fully automatic: tracked app actions (check-ins, RSVPs, posts,
// comments, profile completion, event hosting) fire `ensureMerit`, which is
// idempotent via a unique `dedupe_key`. Admins may also grant manual merits.
//
// Two routes:
//   - "virtual": online actions inside ZACKERZ
//   - "real":    in-person actions (chapter gate check-ins, hosting events)
//
// Ranks I–V are derived from the total points.

export type MeritRoute = "virtual" | "real";

export interface MeritDef {
  key: string;
  title: string;
  description: string;
  route: MeritRoute;
  points: number;
  sourceType: string; // 'profile' | 'post' | 'comment' | 'rsvp' | 'checkin' | 'event_host'
  // dedupe_key template; "{userId}" and "{sourceId}" are substituted at award
  // time. null => caller supplies a unique key (used for admin manual awards).
  dedupe: string | null;
}

export const MERITS: MeritDef[] = [
  // ----- Virtual route -----
  {
    key: "profile_complete",
    title: "Identity Set",
    description: "Completed your profile — city, country, field and bio.",
    route: "virtual", points: 10, sourceType: "profile",
    dedupe: "profile_complete:{userId}",
  },
  {
    key: "first_post",
    title: "First Word",
    description: "Published your first post.",
    route: "virtual", points: 5, sourceType: "post",
    dedupe: "first_post:{userId}",
  },
  {
    key: "first_comment",
    title: "First Reply",
    description: "Left your first comment.",
    route: "virtual", points: 3, sourceType: "comment",
    dedupe: "first_comment:{userId}",
  },
  {
    key: "first_rsvp",
    title: "First Commit",
    description: "RSVP'd to your first event.",
    route: "virtual", points: 5, sourceType: "rsvp",
    dedupe: "first_rsvp:{userId}",
  },
  {
    key: "posts_5",
    title: "Voice",
    description: "Published 5 posts.",
    route: "virtual", points: 10, sourceType: "post",
    dedupe: "posts_5:{userId}",
  },
  {
    key: "posts_25",
    title: "Chronicler",
    description: "Published 25 posts.",
    route: "virtual", points: 25, sourceType: "post",
    dedupe: "posts_25:{userId}",
  },
  // ----- Real route -----
  {
    key: "first_checkin",
    title: "First Boots",
    description: "Checked in at a chapter gate for the first time.",
    route: "real", points: 10, sourceType: "checkin",
    dedupe: "first_checkin:{userId}",
  },
  {
    key: "checkin_5",
    title: "Regular",
    description: "Checked in 5 times.",
    route: "real", points: 15, sourceType: "checkin",
    dedupe: "checkin_5:{userId}",
  },
  {
    key: "checkin_25",
    title: "Anchor",
    description: "Checked in 25 times.",
    route: "real", points: 40, sourceType: "checkin",
    dedupe: "checkin_25:{userId}",
  },
  {
    key: "event_hosted",
    title: "Convener",
    description: "Put up an event as a King or Gatekeeper.",
    route: "real", points: 20, sourceType: "event_host",
    dedupe: "event_hosted:{userId}",
  },
];

export interface MeritRank {
  tier: number; // 1..5
  name: string;
  min: number; // points required
}

export const MERIT_RANKS: MeritRank[] = [
  { tier: 1, name: "Initiate", min: 0 },
  { tier: 2, name: "Builder", min: 20 },
  { tier: 3, name: "Steward", min: 50 },
  { tier: 4, name: "Veteran", min: 100 },
  { tier: 5, name: "Legend", min: 200 },
];

export function rankForPoints(points: number): MeritRank {
  let r = MERIT_RANKS[0];
  for (const rank of MERIT_RANKS) if (points >= rank.min) r = rank;
  return r;
}

export function nextRank(points: number): MeritRank | null {
  for (const rank of MERIT_RANKS) if (points < rank.min) return rank;
  return null;
}

export function meritByKey(key: string): MeritDef | undefined {
  return MERITS.find((m) => m.key === key);
}

// A merit award row (camelCase, for the client). Mirrors the Supabase row.
export interface MeritAward {
  id: number;
  userId: number;
  meritKey: string;
  route: MeritRoute;
  points: number;
  sourceType: string;
  sourceId: string | null;
  awardedByUserId: number | null;
  note: string | null;
  createdAt: string;
}

export interface MeritSummary {
  total: number;
  virtual: number;
  real: number;
  rank: MeritRank;
  nextRank: MeritRank | null;
  awards: MeritAward[];
}
