import {
  type User, type InsertUser, type Application, type InsertApplication,
  type Membership, type InsertMembership, type Chapter, type Event,
  type Rsvp, type InsertRsvp, type ProfileUpdate,
  type Post, type InsertPost, type Comment, type InsertComment,
  type InsertMessage, type Message,
} from '../shared/schema';
import {
  MERITS, meritByKey, rankForPoints, nextRank,
  type MeritAward, type MeritSummary, type MeritRoute,
} from '../shared/merits';
import { supabase } from './supabase';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

// ---------- Password hashing (unchanged from SQLite version) ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(scryptSync(password, salt, 64));
  const storedBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(hashBuf, storedBuf);
}

// strip password
export function sanitize(u: User) {
  const { password, ...rest } = u;
  return rest;
}

// ---------- Row mappers (snake_case DB -> camelCase types) ----------
function mapUser(r: any): User {
  return {
    id: r.id,
    email: r.email,
    username: r.username,
    password: r.password,
    role: r.role,
    fullName: r.full_name ?? null,
    city: r.city ?? null,
    country: r.country ?? null,
    field: r.field ?? null,
    bio: r.bio ?? null,
    createdAt: r.created_at,
  };
}

function mapApplication(r: any): Application {
  return {
    id: r.id,
    userId: r.user_id,
    fullName: r.full_name,
    email: r.email,
    age: r.age,
    country: r.country,
    city: r.city,
    field: r.field,
    yearsExperience: r.years_experience,
    whyJoin: r.why_join,
    valuesAlignment: r.values_alignment,
    contribution: r.contribution,
    referral: r.referral ?? null,
    status: r.status,
    createdAt: r.created_at,
  };
}

function mapMembership(r: any): Membership {
  return {
    id: r.id,
    userId: r.user_id,
    tier: r.tier,
    status: r.status,
    startedAt: r.started_at,
    expiresAt: r.expires_at,
  };
}

function mapChapter(r: any): Chapter {
  return {
    id: r.id,
    city: r.city,
    country: r.country,
    lead: r.lead,
    memberCount: r.member_count,
    description: r.description,
    meetingCadence: r.meeting_cadence,
  };
}

function mapEvent(r: any): Event {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    date: r.date,
    location: r.location,
    chapterId: r.chapter_id ?? null,
    type: r.type,
    capacity: r.capacity,
  };
}

function mapMeritAward(r: any): MeritAward {
  return {
    id: r.id,
    userId: r.user_id,
    meritKey: r.merit_key,
    route: r.route,
    points: r.points,
    sourceType: r.source_type,
    sourceId: r.source_id ?? null,
    awardedByUserId: r.awarded_by_user_id ?? null,
    note: r.note ?? null,
    createdAt: r.created_at,
  };
}

function mapRsvp(r: any): Rsvp {
  return {
    id: r.id,
    userId: r.user_id,
    eventId: r.event_id,
    status: r.status,
    createdAt: r.created_at,
  };
}

function mapPost(r: any): Post {
  return {
    id: r.id,
    userId: r.user_id,
    content: r.content,
    createdAt: r.created_at,
  };
}

function mapComment(r: any): Comment {
  return {
    id: r.id,
    postId: r.post_id,
    userId: r.user_id,
    content: r.content,
    createdAt: r.created_at,
  };
}

function mapMessage(r: any): Message {
  return {
    id: r.id,
    senderId: r.sender_id,
    receiverId: r.receiver_id,
    content: r.content,
    attachmentPath: r.attachment_path ?? null,
    attachmentName: r.attachment_name ?? null,
    attachmentMime: r.attachment_mime ?? null,
    createdAt: r.created_at,
    readAt: r.read_at ?? null,
  };
}

// Throw on Supabase error so Express error handler catches it.
function unwrap<T>(res: { data: T | null; error: any }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------- Chapters Gate: time-based open/sealed logic ----------
// IANA timezone per chapter city (Gate status is computed in local time).
const CITY_TIMEZONES: Record<string, string> = {
  Istanbul: "Europe/Istanbul",
  Vienna: "Europe/Vienna",
  Paris: "Europe/Paris",
  London: "Europe/London",
  Belgrade: "Europe/Belgrade",
};

// The live gate_gatekeepers data stores weekday 4 to mean Friday, i.e. a
// Monday-indexed week (Mon=0 … Sun=6). Map both the DB value and the current
// day through this same convention so the two always agree.
const WEEKDAY_MON0: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

export type Vigil = { weekday: number; startTime: string; endTime: string } | null;

export function computeGateStatus(
  vigil: Vigil,
  city: string,
  now: Date = new Date(),
): { status: "open" | "sealed"; reason?: string } {
  if (!vigil) return { status: "sealed", reason: "no vigil set" };
  const tz = CITY_TIMEZONES[city] ?? "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  const currentWeekday = WEEKDAY_MON0[wd];
  const current = `${hh}:${mm}`;
  if (currentWeekday !== vigil.weekday) return { status: "sealed", reason: "outside vigil window" };
  if (current < vigil.startTime || current > vigil.endTime) {
    return { status: "sealed", reason: "outside vigil window" };
  }
  return { status: "open" };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface IStorage {
  // users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;
  updateUserProfile(id: number, data: ProfileUpdate): Promise<User | undefined>;
  // sessions
  createSession(userId: number): Promise<string>;
  getUserBySession(token: string): Promise<User | undefined>;
  deleteSession(token: string): Promise<void>;
  // applications
  getApplicationByUser(userId: number): Promise<Application | undefined>;
  createApplication(userId: number, data: InsertApplication): Promise<Application>;
  listApplications(status?: string): Promise<Application[]>;
  getApplication(id: number): Promise<Application | undefined>;
  updateApplicationStatus(id: number, status: "approved" | "rejected"): Promise<Application | undefined>;
  // memberships
  getMembershipByUser(userId: number): Promise<Membership | undefined>;
  listMembershipTiers(): Promise<Map<number, string>>;
  createMembership(userId: number, data: InsertMembership): Promise<Membership>;
  // chapters
  listChapters(): Promise<Chapter[]>;
  // events
  listEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(userId: number, data: { title: string; description: string; date: string; location: string; chapterId: number | null; type: string; capacity: number }): Promise<Event>;
  // chapters a user may host events for (King or Gatekeeper)
  getHostChapters(userId: number): Promise<{ id: number; city: string; country: string; role: "king" | "gatekeeper" }[]>;
  // merits (append-only ledger; totals/ranks computed from it)
  listMeritAwards(userId: number): Promise<MeritAward[]>;
  getMeritSummary(userId: number): Promise<MeritSummary>;
  ensureMerit(userId: number, meritKey: string, opts?: { sourceId?: string | number; awardedByUserId?: number; note?: string }): Promise<void>;
  awardMerit(adminId: number, userId: number, meritKey: string, opts: { points?: number; note?: string; route?: MeritRoute }): Promise<MeritAward>;
  removeMeritAward(awardId: number): Promise<void>;
  countPostsByUser(userId: number): Promise<number>;
  countCommentsByUser(userId: number): Promise<number>;
  countCheckinsByUser(userId: number): Promise<number>;
  // rsvps
  listRsvpsForUser(userId: number): Promise<Rsvp[]>;
  listRsvpsForEvent(eventId: number): Promise<Rsvp[]>;
  upsertRsvp(userId: number, data: InsertRsvp): Promise<Rsvp>;
  deleteRsvp(userId: number, eventId: number): Promise<void>;
  // members (directory)
  listMembers(): Promise<User[]>;
  // posts
  createPost(userId: number, data: InsertPost): Promise<Post>;
  listPosts(): Promise<(Post & { authorName: string; authorFullName: string | null; likeCount: number; commentCount: number })[]>;
  deletePost(userId: number, postId: number): Promise<void>;
  // comments
  createComment(userId: number, data: InsertComment): Promise<Comment & { authorName: string; authorFullName: string | null }>;
  listComments(postId: number): Promise<(Comment & { authorName: string; authorFullName: string | null })[]>;
  // likes
  toggleLike(userId: number, postId: number): Promise<{ liked: boolean }>;
  // messages
  sendMessage(senderId: number, data: InsertMessage): Promise<Message>;
  listMessages(userA: number, userB: number): Promise<Message[]>;
  listConversations(userId: number): Promise<{ partnerId: number; partnerName: string; partnerFullName: string | null; lastContent: string; lastAt: string; unread: number }[]>;
  markThreadRead(userId: number, partnerId: number): Promise<void>;
  unreadCount(userId: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // ---------- Users ----------
  async getUser(id: number) {
    const res = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    return res.data ? mapUser(res.data) : undefined;
  }
  async getUserByEmail(email: string) {
    const res = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    return res.data ? mapUser(res.data) : undefined;
  }
  async getUserByUsername(username: string) {
    const res = await supabase.from('users').select('*').eq('username', username).maybeSingle();
    return res.data ? mapUser(res.data) : undefined;
  }
  async createUser(user: InsertUser & { role?: string }) {
    const res = await supabase.from('users').insert({
      email: user.email,
      username: user.username,
      password: user.password,
      role: (user.role as "member" | "admin") || "member",
      full_name: user.fullName || null,
      city: user.city || null,
      country: user.country || null,
    }).select('*').single();
    return mapUser(unwrap(res));
  }
  async updateUserProfile(id: number, data: ProfileUpdate) {
    const existing = await this.getUser(id);
    if (!existing) return undefined;
    const res = await supabase.from('users').update({
      full_name: data.fullName ?? existing.fullName,
      city: data.city ?? existing.city,
      country: data.country ?? existing.country,
      field: data.field ?? existing.field,
      bio: data.bio ?? existing.bio,
    }).eq('id', id).select('*').single();
    return mapUser(unwrap(res));
  }

  // ---------- Sessions ----------
  async createSession(userId: number) {
    const token = randomBytes(32).toString("hex");
    unwrap(await supabase.from('sessions').insert({ token, user_id: userId }));
    return token;
  }
  async getUserBySession(token: string) {
    const sres = await supabase.from('sessions').select('user_id').eq('token', token).maybeSingle();
    if (!sres.data) return undefined;
    return this.getUser(sres.data.user_id);
  }
  async deleteSession(token: string) {
    unwrap(await supabase.from('sessions').delete().eq('token', token));
  }

  // ---------- Applications ----------
  async getApplicationByUser(userId: number) {
    const res = await supabase.from('applications').select('*').eq('user_id', userId).maybeSingle();
    return res.data ? mapApplication(res.data) : undefined;
  }
  async createApplication(userId: number, data: InsertApplication) {
    const res = await supabase.from('applications').insert({
      user_id: userId,
      full_name: data.fullName,
      email: data.email,
      age: data.age,
      country: data.country,
      city: data.city,
      field: data.field,
      years_experience: data.yearsExperience,
      why_join: data.whyJoin,
      values_alignment: data.valuesAlignment,
      contribution: data.contribution,
      referral: data.referral || null,
    }).select('*').single();
    return mapApplication(unwrap(res));
  }
  async listApplications(status?: string) {
    let q = supabase.from('applications').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const res = await q;
    const rows = unwrap(res) as any[];
    return rows.map(mapApplication);
  }
  async getApplication(id: number) {
    const res = await supabase.from('applications').select('*').eq('id', id).maybeSingle();
    return res.data ? mapApplication(res.data) : undefined;
  }
  async updateApplicationStatus(id: number, status: "approved" | "rejected") {
    const res = await supabase.from('applications').update({ status }).eq('id', id).select('*').single();
    return mapApplication(unwrap(res));
  }

  // ---------- Memberships ----------
  async getMembershipByUser(userId: number) {
    const res = await supabase.from('memberships').select('*').eq('user_id', userId).maybeSingle();
    return res.data ? mapMembership(res.data) : undefined;
  }
  async listMembershipTiers(): Promise<Map<number, string>> {
    const res = await supabase.from('memberships').select('user_id,tier,status');
    const map = new Map<number, string>();
    for (const r of (unwrap(res) as any[])) {
      if (r.status === 'active') map.set(r.user_id, r.tier);
    }
    return map;
  }
  async createMembership(userId: number, data: InsertMembership) {
    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const res = await supabase.from('memberships').insert({
      user_id: userId,
      tier: data.tier,
      status: "active",
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    }).select('*').single();
    return mapMembership(unwrap(res));
  }

  // ---------- Chapters ----------
  async listChapters() {
    const res = await supabase.from('chapters').select('*').order('city', { ascending: true });
    return (unwrap(res) as any[]).map(mapChapter);
  }

  // Chapters enriched with King / Gate / Gatekeeper (Ostiary) / Vigil, a
  // server-computed gate status, and whether the given user checked in today.
  async listChaptersDetailed(userId: number | null) {
    const chapters = unwrap(
      await supabase.from('chapters').select('*').order('city', { ascending: true })
    ) as any[];
    const chapterIds = chapters.map((c) => c.id);

    const gates = chapterIds.length
      ? (unwrap(await supabase.from('chapter_gates').select('*')
          .in('chapter_id', chapterIds).eq('active', true).order('id', { ascending: true })) as any[])
      : [];
    const gateByChapter = new Map<number, any>();
    for (const g of gates) if (!gateByChapter.has(g.chapter_id)) gateByChapter.set(g.chapter_id, g);

    const gateIds = gates.map((g) => g.id);
    const gatekeepers = gateIds.length
      ? (unwrap(await supabase.from('gate_gatekeepers').select('*')
          .in('gate_id', gateIds).order('id', { ascending: true })) as any[])
      : [];
    const gkByGate = new Map<number, any>();
    for (const gk of gatekeepers) if (!gkByGate.has(gk.gate_id)) gkByGate.set(gk.gate_id, gk);

    const userIds = new Set<number>();
    for (const c of chapters) if (c.king_user_id) userIds.add(c.king_user_id);
    for (const gk of gatekeepers) if (gk.user_id) userIds.add(gk.user_id);
    const usersRows = userIds.size
      ? (unwrap(await supabase.from('users').select('id,full_name,codename')
          .in('id', Array.from(userIds))) as any[])
      : [];
    const userById = new Map<number, any>();
    for (const u of usersRows) userById.set(u.id, u);

    // Check-ins for this user today. The table may not exist yet (migration
    // applied separately) — treat any failure as "not checked in".
    let checkedGateIds = new Set<number>();
    if (userId && gateIds.length) {
      try {
        const cks = unwrap(await supabase.from('chapter_checkins').select('gate_id')
          .eq('user_id', userId).eq('checkin_date', todayIso()).in('gate_id', gateIds)) as any[];
        checkedGateIds = new Set(cks.map((c) => c.gate_id));
      } catch { /* table missing or unreadable — no check-ins */ }
    }

    return chapters.map((c) => {
      const base = mapChapter(c);
      const gate = gateByChapter.get(c.id) ?? null;
      const gk = gate ? (gkByGate.get(gate.id) ?? null) : null;
      const kingUser = c.king_user_id ? userById.get(c.king_user_id) : null;
      const gkUser = gk ? userById.get(gk.user_id) : null;
      const vigil: Vigil = gk
        ? { weekday: gk.weekday, startTime: gk.start_time, endTime: gk.end_time }
        : null;
      const gs = computeGateStatus(vigil, c.city);
      return {
        ...base,
        king: kingUser
          ? { userId: kingUser.id, codename: kingUser.codename ?? null, fullName: kingUser.full_name ?? null }
          : null,
        gate: gate
          ? { id: gate.id, name: gate.name, address: gate.address ?? null, active: !!gate.active }
          : null,
        gatekeeper: gkUser
          ? { userId: gkUser.id, codename: gkUser.codename ?? null, fullName: gkUser.full_name ?? null }
          : null,
        vigil,
        gateStatus: gs.status,
        gateReason: gs.reason ?? null,
        checkedInToday: gate ? checkedGateIds.has(gate.id) : false,
      };
    });
  }

  // Load chapter + its active gate + gatekeeper for the check-in endpoint.
  async getChapterCheckContext(chapterId: number) {
    const cres = await supabase.from('chapters').select('*').eq('id', chapterId).maybeSingle();
    if (!cres.data) return null;
    const chapter = cres.data as any;
    const gres = await supabase.from('chapter_gates').select('*')
      .eq('chapter_id', chapterId).eq('active', true).order('id', { ascending: true });
    const gate = ((gres.data as any[]) ?? [])[0] ?? null;
    let gatekeeper: any = null;
    if (gate) {
      const gkres = await supabase.from('gate_gatekeepers').select('*')
        .eq('gate_id', gate.id).order('id', { ascending: true });
      gatekeeper = ((gkres.data as any[]) ?? [])[0] ?? null;
    }
    return { chapter, gate, gatekeeper };
  }

  async getCheckinToday(gateId: number, userId: number) {
    const res = await supabase.from('chapter_checkins').select('id')
      .eq('gate_id', gateId).eq('user_id', userId).eq('checkin_date', todayIso()).maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data ?? null;
  }

  async createCheckin(chapterId: number, gateId: number, userId: number) {
    const checkedInAt = new Date().toISOString();
    const res = await supabase.from('chapter_checkins').insert({
      chapter_id: chapterId,
      gate_id: gateId,
      user_id: userId,
      checked_in_at: checkedInAt,
      checkin_date: todayIso(),
    }).select('*').single();
    unwrap(res);
    return { checkedInAt };
  }

  // ---------- Events ----------
  async listEvents() {
    const res = await supabase.from('events').select('*').order('date', { ascending: true });
    return (unwrap(res) as any[]).map(mapEvent);
  }
  async getEvent(id: number) {
    const res = await supabase.from('events').select('*').eq('id', id).maybeSingle();
    return res.data ? mapEvent(res.data) : undefined;
  }
  async createEvent(_userId: number, data: { title: string; description: string; date: string; location: string; chapterId: number | null; type: string; capacity: number }) {
    const res = await supabase.from('events').insert({
      title: data.title,
      description: data.description,
      date: data.date,
      location: data.location,
      chapter_id: data.chapterId,
      type: data.type,
      capacity: data.capacity,
    }).select('*').single();
    return mapEvent(unwrap(res));
  }
  // Chapters a user may host events for: as King (chapters.king_user_id) or as
  // Gatekeeper (gate_gatekeepers -> chapter_gates -> chapters, active gates only).
  async getHostChapters(userId: number) {
    const kingRes = await supabase.from('chapters')
      .select('id,city,country').eq('king_user_id', userId);
    if (kingRes.error) throw new Error(kingRes.error.message);
    const kingChapters = (kingRes.data as any[]) ?? [];

    const gkRes = await supabase.from('gate_gatekeepers')
      .select('gate_id').eq('user_id', userId);
    if (gkRes.error) throw new Error(gkRes.error.message);
    const gateIds = ((gkRes.data as any[]) ?? []).map((g) => g.gate_id);

    let gkChapters: any[] = [];
    if (gateIds.length) {
      const gatesRes = await supabase.from('chapter_gates')
        .select('id,chapter_id,active').in('id', gateIds).eq('active', true);
      if (gatesRes.error) throw new Error(gatesRes.error.message);
      const chapterIds = ((gatesRes.data as any[]) ?? []).map((g) => g.chapter_id).filter((v, i, a) => a.indexOf(v) === i);
      if (chapterIds.length) {
        const chRes = await supabase.from('chapters')
          .select('id,city,country').in('id', chapterIds);
        if (chRes.error) throw new Error(chRes.error.message);
        gkChapters = (chRes.data as any[]) ?? [];
      }
    }

    const out: { id: number; city: string; country: string; role: "king" | "gatekeeper" }[] = [];
    for (const c of kingChapters) out.push({ id: c.id, city: c.city, country: c.country, role: "king" });
    for (const c of gkChapters) if (!out.some((x) => x.id === c.id)) out.push({ id: c.id, city: c.city, country: c.country, role: "gatekeeper" });
    return out;
  }

  // ---------- Merits (ledger) ----------
  async listMeritAwards(userId: number) {
    const res = await supabase.from('merit_awards')
      .select('*').eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (res.error) throw new Error(res.error.message);
    return ((res.data as any[]) ?? []).map(mapMeritAward);
  }

  async getMeritSummary(userId: number): Promise<MeritSummary> {
    const awards = await this.listMeritAwards(userId);
    const total = awards.reduce((s, a) => s + a.points, 0);
    const virtual = awards.filter((a) => a.route === "virtual").reduce((s, a) => s + a.points, 0);
    const real = awards.filter((a) => a.route === "real").reduce((s, a) => s + a.points, 0);
    return { total, virtual, real, rank: rankForPoints(total), nextRank: nextRank(total), awards };
  }

  // Idempotent award: inserts only if dedupe_key is new. Used by auto-award
  // hooks (a duplicate insert hits the unique index and is silently ignored).
  async ensureMerit(userId: number, meritKey: string, opts: { sourceId?: string | number; awardedByUserId?: number; note?: string } = {}) {
    const def = meritByKey(meritKey);
    if (!def) throw new Error(`Unknown merit: ${meritKey}`);
    const dedupeKey = def.dedupe
      ? def.dedupe.replace("{userId}", String(userId)).replace("{sourceId}", String(opts.sourceId ?? ""))
      : `manual:${userId}:${meritKey}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const res = await supabase.from('merit_awards').insert({
      user_id: userId,
      merit_key: def.key,
      route: def.route,
      points: def.points,
      source_type: def.sourceType,
      source_id: opts.sourceId != null ? String(opts.sourceId) : null,
      dedupe_key: dedupeKey,
      awarded_by_user_id: opts.awardedByUserId ?? null,
      note: opts.note ?? null,
    });
    if (res.error) {
      // 23505 = unique_violation -> already awarded; expected for idempotent calls.
      if (res.error.code !== '23505') throw new Error(res.error.message);
    }
  }

  // Manual admin grant. Always inserts with a fresh dedupe_key so an admin can
  // grant the same merit more than once (e.g. a service bonus).
  async awardMerit(adminId: number, userId: number, meritKey: string, opts: { points?: number; note?: string; route?: MeritRoute }): Promise<MeritAward> {
    const def = meritByKey(meritKey);
    const route: MeritRoute = opts.route ?? def?.route ?? "virtual";
    const points = opts.points ?? def?.points ?? 0;
    const dedupeKey = `admin:${userId}:${meritKey}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const res = await supabase.from('merit_awards').insert({
      user_id: userId,
      merit_key: meritKey,
      route,
      points,
      source_type: "admin",
      source_id: String(adminId),
      dedupe_key: dedupeKey,
      awarded_by_user_id: adminId,
      note: opts.note ?? null,
    }).select('*').single();
    return mapMeritAward(unwrap(res));
  }

  async removeMeritAward(awardId: number) {
    const res = await supabase.from('merit_awards').delete().eq('id', awardId);
    if (res.error) throw new Error(res.error.message);
  }

  async countPostsByUser(userId: number) {
    const res = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  }

  async countCommentsByUser(userId: number) {
    const res = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  }

  async countCheckinsByUser(userId: number) {
    const res = await supabase.from('chapter_checkins').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  }

  // ---------- RSVPs ----------
  async listRsvpsForUser(userId: number) {
    const res = await supabase.from('rsvps').select('*').eq('user_id', userId);
    return (unwrap(res) as any[]).map(mapRsvp);
  }
  async listRsvpsForEvent(eventId: number) {
    const res = await supabase.from('rsvps').select('*').eq('event_id', eventId);
    return (unwrap(res) as any[]).map(mapRsvp);
  }
  async upsertRsvp(userId: number, data: InsertRsvp) {
    const res = await supabase.from('rsvps').upsert({
      user_id: userId,
      event_id: data.eventId,
      status: data.status,
    }, { onConflict: 'user_id,event_id' }).select('*').single();
    return mapRsvp(unwrap(res));
  }
  async deleteRsvp(userId: number, eventId: number) {
    unwrap(await supabase.from('rsvps').delete()
      .eq('user_id', userId).eq('event_id', eventId));
  }

  // ---------- Members (directory) ----------
  async listMembers() {
    const res = await supabase.from('users').select('*').order('created_at', { ascending: false });
    const rows = unwrap(res) as any[];
    return rows.map((r) => { const { password, ...rest } = mapUser(r); return rest as User; });
  }

  // ---------- Posts ----------
  async createPost(userId: number, data: InsertPost) {
    const res = await supabase.from('posts').insert({
      user_id: userId, content: data.content,
    }).select('*').single();
    return mapPost(unwrap(res));
  }
  async listPosts() {
    const res = await supabase.from('posts_feed').select('*')
      .order('created_at', { ascending: false }).limit(200);
    const rows = unwrap(res) as any[];
    return rows.map((r) => ({
      ...mapPost(r),
      authorName: r.author_name,
      authorFullName: r.author_full_name ?? null,
      likeCount: Number(r.like_count),
      commentCount: Number(r.comment_count),
    }));
  }
  async deletePost(userId: number, postId: number) {
    const pres = await supabase.from('posts').select('user_id').eq('id', postId).maybeSingle();
    const post = pres.data;
    if (!post || post.user_id !== userId) throw new Error("Not authorized to delete this post");
    // FKs cascade comments + likes, but delete explicitly to be safe across views
    await supabase.from('comments').delete().eq('post_id', postId);
    await supabase.from('post_likes').delete().eq('post_id', postId);
    unwrap(await supabase.from('posts').delete().eq('id', postId));
  }

  // ---------- Comments ----------
  async createComment(userId: number, data: InsertComment) {
    const res = await supabase.from('comments').insert({
      user_id: userId, post_id: data.postId, content: data.content,
    }).select('*').single();
    const c = mapComment(unwrap(res));
    const u = await this.getUser(userId);
    return { ...c, authorName: u?.username ?? "unknown", authorFullName: u?.fullName ?? null };
  }
  async listComments(postId: number) {
    const res = await supabase.from('comments_with_author').select('*')
      .eq('post_id', postId).order('created_at', { ascending: true });
    const rows = unwrap(res) as any[];
    return rows.map((r) => ({
      ...mapComment(r),
      authorName: r.author_name,
      authorFullName: r.author_full_name ?? null,
    }));
  }

  // ---------- Likes ----------
  async toggleLike(userId: number, postId: number) {
    const existing = await supabase.from('post_likes').select('id')
      .eq('post_id', postId).eq('user_id', userId).maybeSingle();
    if (existing.data) {
      unwrap(await supabase.from('post_likes').delete().eq('id', existing.data.id));
      return { liked: false };
    }
    unwrap(await supabase.from('post_likes').insert({ post_id: postId, user_id: userId }));
    return { liked: true };
  }

  // ---------- Messages ----------
  async sendMessage(senderId: number, data: InsertMessage) {
    const res = await supabase.from('messages').insert({
      sender_id: senderId, receiver_id: data.receiverId, content: data.content ?? "",
      attachment_path: data.attachment?.path ?? null,
      attachment_name: data.attachment?.name ?? null,
      attachment_mime: data.attachment?.mime ?? null,
    }).select('*').single();
    return mapMessage(unwrap(res));
  }
  async listMessages(userA: number, userB: number) {
    const res = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`)
      .order('created_at', { ascending: true });
    return (unwrap(res) as any[]).map(mapMessage);
  }
  async listConversations(userId: number) {
    const res = await supabase.from('messages').select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    const rows = (unwrap(res) as any[]).map(mapMessage);
    const map = new Map<number, { partnerId: number; partnerName: string; partnerFullName: string | null; lastContent: string; lastAt: string; unread: number }>();
    for (const row of rows) {
      const pid = row.senderId === userId ? row.receiverId : row.senderId;
      const partner = await this.getUser(pid);
      const existing = map.get(pid);
      const unreadInc = row.receiverId === userId && !row.readAt ? 1 : 0;
      if (!existing) {
        map.set(pid, {
          partnerId: pid,
          partnerName: partner?.username ?? "unknown",
          partnerFullName: partner?.fullName ?? null,
          lastContent: (row.content && row.content.trim()) || (row.attachmentName ? `📎 ${row.attachmentName}` : "Attachment"),
          lastAt: row.createdAt,
          unread: unreadInc,
        });
      } else {
        existing.unread += unreadInc;
      }
    }
    return Array.from(map.values());
  }
  async markThreadRead(userId: number, partnerId: number) {
    unwrap(await supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('receiver_id', userId).eq('sender_id', partnerId).is('read_at', null));
  }
  async unreadCount(userId: number) {
    const res = await supabase.from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId).is('read_at', null);
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  }

  // Fetch a single message row (for access-checked downloads)
  async getMessage(id: number): Promise<Message | null> {
    const res = await supabase.from('messages').select('*').eq('id', id).single();
    if (res.error) return null;
    return mapMessage(res.data);
  }

  // Create a short-lived signed download URL for an attachment.
  // Caller must verify the requesting user is sender or receiver first.
  async signedAttachmentUrl(path: string): Promise<string | null> {
    const res = await supabase.storage.from('chat-attachments')
      .createSignedUrl(path, 300); // 5 minutes
    if (res.error || !res.data?.signedUrl) return null;
    return res.data.signedUrl;
  }
}

export const storage = new DatabaseStorage();
