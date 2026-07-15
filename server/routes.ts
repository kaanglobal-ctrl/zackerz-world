import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "node:http";
import { randomBytes } from "node:crypto";
import { storage, hashPassword, verifyPassword, sanitize, computeGateStatus } from "./storage";
import { supabase } from "./supabase";
import {
  insertUserSchema, insertApplicationSchema, insertMembershipSchema,
  insertRsvpSchema, profileUpdateSchema, TIERS,
  insertPostSchema, insertCommentSchema, insertMessageSchema,
  type User,
} from "../shared/schema";

// ---------- Auth middleware ----------
declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers["x-session-token"] as string | undefined;
  if (token) {
    const user = await storage.getUserBySession(token);
    if (user) req.user = user;
  }
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

// ---------- Attachment upload ----------
const MAX_ATTACHMENT_BYTES = 2.5 * 1024 * 1024; // 2.5 MB raw
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "text/plain", "text/csv", "application/json",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function sanitizeFilename(name: string): string {
  // keep alphanumerics, dash, underscore, dot; collapse the rest
  const base = name.replace(/^.*[\\/]/, "");
  return base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 100) || "file";
}

// Parse a data URL, validate, and upload to the private storage bucket.
// Returns { path, name, mime } or throws.
async function uploadAttachment(dataUrl: string, declaredName: string, declaredMime: string) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid file data");
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) throw new Error("File type not allowed");
  let buf: Buffer;
  try {
    buf = Buffer.from(match[2], "base64");
  } catch {
    throw new Error("Invalid file data");
  }
  if (buf.length === 0) throw new Error("Empty file");
  if (buf.length > MAX_ATTACHMENT_BYTES) throw new Error("File too large (max 2.5MB)");

  const safeName = sanitizeFilename(declaredName);
  const id = randomBytes(9).toString("hex");
  const ext = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")) : "";
  const path = `${id}${ext}`;

  const up = await supabase.storage.from("chat-attachments")
    .upload(path, buf, { contentType: mime, upsert: false });
  if (up.error) throw new Error(`Upload failed: ${up.error.message}`);

  return { path, name: safeName, mime };
}

export async function registerRoutes(
  _httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(authMiddleware);

  // ---------- Auth ----------
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      const existingEmail = await storage.getUserByEmail(parsed.email);
      if (existingEmail) return res.status(400).json({ message: "Email already registered" });
      const existingUser = await storage.getUserByUsername(parsed.username);
      if (existingUser) return res.status(400).json({ message: "Username already taken" });
      const user = await storage.createUser({ ...parsed, password: hashPassword(parsed.password) });
      const token = await storage.createSession(user.id);
      res.status(201).json({ user: sanitize(user), token });
    } catch (e) { next(e); }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const user = await storage.getUserByEmail(email);
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = await storage.createSession(user.id);
      res.json({ user: sanitize(user), token });
    } catch (e) { next(e); }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res, next) => {
    try {
      const token = req.headers["x-session-token"] as string;
      if (token) await storage.deleteSession(token);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    res.json({ user: sanitize(req.user) });
  });

  // ---------- Profile ----------
  app.patch("/api/profile", requireAuth, async (req, res, next) => {
    try {
      const parsed = profileUpdateSchema.parse(req.body);
      const updated = await storage.updateUserProfile(req.user!.id, parsed);
      // Virtual-route merit: complete profile (city, country, field, bio).
      if (updated && updated.city && updated.country && updated.field && updated.bio) {
        try { await storage.ensureMerit(req.user!.id, "profile_complete"); }
        catch (e) { console.error("merit profile_complete:", e); }
      }
      res.json({ user: updated ? sanitize(updated) : null });
    } catch (e) { next(e); }
  });

  // ---------- Applications ----------
  app.get("/api/applications/me", requireAuth, async (req, res, next) => {
    try {
      const app = await storage.getApplicationByUser(req.user!.id);
      res.json({ application: app || null });
    } catch (e) { next(e); }
  });

  app.post("/api/applications", requireAuth, async (req, res, next) => {
    try {
      const parsed = insertApplicationSchema.parse(req.body);
      const existing = await storage.getApplicationByUser(req.user!.id);
      if (existing) return res.status(400).json({ message: "You already have an application on file" });
      const application = await storage.createApplication(req.user!.id, parsed);
      res.status(201).json({ application });
    } catch (e) { next(e); }
  });

  app.get("/api/admin/applications", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const status = req.query.status as string | undefined;
      const apps = await storage.listApplications(status);
      res.json({ applications: apps });
    } catch (e) { next(e); }
  });

  app.patch("/api/admin/applications/:id", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const status = req.body.status as "approved" | "rejected";
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const application = await storage.updateApplicationStatus(id, status);
      if (!application) return res.status(404).json({ message: "Application not found" });
      res.json({ application });
    } catch (e) { next(e); }
  });

  // ---------- Memberships ----------
  app.get("/api/memberships/me", requireAuth, async (req, res, next) => {
    try {
      const membership = await storage.getMembershipByUser(req.user!.id);
      res.json({ membership });
    } catch (e) { next(e); }
  });

  app.post("/api/memberships", requireAuth, async (req, res, next) => {
    try {
      const parsed = insertMembershipSchema.parse(req.body);
      // simulate checkout: confirm tier is valid
      if (!TIERS[parsed.tier as keyof typeof TIERS]) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      const existing = await storage.getMembershipByUser(req.user!.id);
      if (existing && existing.status === "active") {
        return res.status(400).json({ message: "Active membership already exists" });
      }
      const membership = await storage.createMembership(req.user!.id, parsed);
      res.status(201).json({ membership });
    } catch (e) { next(e); }
  });

  app.get("/api/tiers", (_req, res) => {
    res.json({ tiers: Object.values(TIERS) });
  });

  // ---------- Chapters ----------
  app.get("/api/chapters", async (req, res, next) => {
    try {
      res.json({ chapters: await storage.listChaptersDetailed(req.user?.id ?? null) });
    } catch (e) { next(e); }
  });

  // ---------- Chapters Gate check-in (NARTHEX) ----------
  async function handleCheckIn(req: Request, res: Response, next: NextFunction) {
    try {
      const chapterId = parseInt(String(req.params.id), 10);
      if (Number.isNaN(chapterId)) return res.status(400).json({ message: "Invalid chapter id" });

      const ctx = await storage.getChapterCheckContext(chapterId);
      if (!ctx) return res.status(404).json({ message: "Chapter not found" });

      const { chapter, gate, gatekeeper } = ctx;
      if (!gate) return res.status(403).json({ message: "Gate sealed", reason: "no gate" });

      const vigil = gatekeeper
        ? { weekday: gatekeeper.weekday, startTime: gatekeeper.start_time, endTime: gatekeeper.end_time }
        : null;
      const gs = computeGateStatus(vigil, chapter.city);
      if (gs.status !== "open") {
        return res.status(403).json({ message: "Gate sealed", reason: gs.reason ?? "sealed" });
      }

      const membership = await storage.getMembershipByUser(req.user!.id);
      if (!membership || membership.status !== "active") {
        return res.status(403).json({ message: "Active membership required" });
      }

      const existing = await storage.getCheckinToday(gate.id, req.user!.id);
      if (existing) return res.status(409).json({ message: "Already checked in today" });

      const { checkedInAt } = await storage.createCheckin(chapterId, gate.id, req.user!.id);
      // Real-route merits: first check-in + milestone check-ins (idempotent).
      try {
        await storage.ensureMerit(req.user!.id, "first_checkin");
        const n = await storage.countCheckinsByUser(req.user!.id);
        if (n >= 5) await storage.ensureMerit(req.user!.id, "checkin_5");
        if (n >= 25) await storage.ensureMerit(req.user!.id, "checkin_25");
      } catch (e) { console.error("merit checkin:", e); }
      res.status(201).json({ ok: true, checkedInAt });
    } catch (e) { next(e); }
  }

  app.post("/api/chapters/:id/check-in", requireAuth, handleCheckIn);
  app.post("/api/chapters/:id/checkin", requireAuth, handleCheckIn);

  // ---------- Events ----------
  app.get("/api/events", async (_req, res, next) => {
    try {
      res.json({ events: await storage.listEvents() });
    } catch (e) { next(e); }
  });

  // Chapters this user may host events for (King or Gatekeeper). Powers the
  // "Put up a free event" form on the Events page. Defined before the :id
  // route so it isn't captured as an event id.
  app.get("/api/events/host-permissions", requireAuth, async (req, res, next) => {
    try {
      const chapters = await storage.getHostChapters(req.user!.id);
      res.json({ canHostEvents: chapters.length > 0, chapters });
    } catch (e) { next(e); }
  });

  app.get("/api/events/:id", async (req, res, next) => {
    try {
      const event = await storage.getEvent(parseInt(String(req.params.id), 10));
      if (!event) return res.status(404).json({ message: "Event not found" });
      res.json({ event, rsvps: await storage.listRsvpsForEvent(event.id) });
    } catch (e) { next(e); }
  });

  // Create a (free) event. Only Kings and Gatekeepers, and only for a chapter
  // they lead. No pricing for now — events are free.
  app.post("/api/events", requireAuth, async (req, res, next) => {
    try {
      const hostChapters = await storage.getHostChapters(req.user!.id);
      if (!hostChapters.length) {
        return res.status(403).json({ message: "Only Kings and Gatekeepers can put up events" });
      }
      const { title, description, date, location, chapterId, type, capacity } = req.body ?? {};
      if (!title || !description || !date || !location) {
        return res.status(400).json({ message: "Title, description, date and location are required" });
      }
      const chosen = chapterId != null && chapterId !== ""
        ? hostChapters.find((c) => c.id === Number(chapterId))
        : hostChapters[0];
      if (!chosen) {
        return res.status(403).json({ message: "You can only put up events for your own chapter" });
      }
      const event = await storage.createEvent(req.user!.id, {
        title: String(title),
        description: String(description),
        date: String(date),
        location: String(location),
        chapterId: chosen.id,
        type: type ? String(type) : "meeting",
        capacity: capacity ? Number(capacity) : 20,
      });
      // Real-route merit: hosting an event (idempotent per event).
      try { await storage.ensureMerit(req.user!.id, "event_hosted", { sourceId: event.id }); }
      catch (e) { console.error("merit event_hosted:", e); }
      res.status(201).json({ event });
    } catch (e) { next(e); }
  });

  // ---------- Merits ----------
  // The member's own full merit summary (Flight Deck).
  app.get("/api/merits/me", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getMeritSummary(req.user!.id));
    } catch (e) { next(e); }
  });

  // Public merit surface for a member profile: totals, rank and earned merit
  // keys only — no notes, sources or admin attribution.
  app.get("/api/members/:id/merits", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const s = await storage.getMeritSummary(id);
      res.json({
        total: s.total,
        virtual: s.virtual,
        real: s.real,
        rank: s.rank,
        nextRank: s.nextRank,
        badges: s.awards.map((a) => ({ meritKey: a.meritKey, route: a.route, points: a.points })),
      });
    } catch (e) { next(e); }
  });

  // Manual admin grant (escape hatch — earning is otherwise automatic).
  app.post("/api/merits/award", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const { userId, meritKey, points, note, route } = req.body ?? {};
      if (!userId || !meritKey) return res.status(400).json({ message: "userId and meritKey are required" });
      const award = await storage.awardMerit(req.user!.id, Number(userId), String(meritKey), {
        points: points != null ? Number(points) : undefined,
        note: note ? String(note) : undefined,
        route,
      });
      res.status(201).json({ award });
    } catch (e) { next(e); }
  });

  app.delete("/api/merits/:id", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      await storage.removeMeritAward(parseInt(String(req.params.id), 10));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // ---------- RSVPs ----------
  app.get("/api/rsvps/me", requireAuth, async (req, res, next) => {
    try {
      res.json({ rsvps: await storage.listRsvpsForUser(req.user!.id) });
    } catch (e) { next(e); }
  });

  app.post("/api/rsvps", requireAuth, async (req, res, next) => {
    try {
      const parsed = insertRsvpSchema.parse(req.body);
      const event = await storage.getEvent(parsed.eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });
      const rsvp = await storage.upsertRsvp(req.user!.id, parsed);
      // Virtual-route merit: first RSVP (going) — idempotent.
      if (rsvp.status === "going") {
        try { await storage.ensureMerit(req.user!.id, "first_rsvp"); }
        catch (e) { console.error("merit first_rsvp:", e); }
      }
      res.status(201).json({ rsvp });
    } catch (e) { next(e); }
  });

  app.delete("/api/rsvps/:eventId", requireAuth, async (req, res, next) => {
    try {
      await storage.deleteRsvp(req.user!.id, parseInt(String(req.params.eventId), 10));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // ---------- Members (directory) ----------
  app.get("/api/members", requireAuth, async (req, res, next) => {
    try {
      const [members, tiers] = await Promise.all([
        storage.listMembers(),
        storage.listMembershipTiers(),
      ]);
      const myTier = tiers.get(req.user!.id) ?? null;
      const viewerIsOg = myTier === "og";
      const out = members.map((m: any) => {
        const isOg = tiers.get(m.id) === "og";
        // Hide OG member identities from non-OG viewers
        if (isOg && !viewerIsOg) {
          return {
            ...m,
            fullName: null,
            username: "og-zacker",
            field: null,
            bio: null,
            isOg: true,
          } as any;
        }
        return { ...m, isOg } as any;
      });
      res.json({ members: out, viewerIsOg });
    } catch (e) { next(e); }
  });

  // ---------- Posts (social feed) ----------
  app.get("/api/posts", requireAuth, async (_req, res, next) => {
    try {
      res.json({ posts: await storage.listPosts() });
    } catch (e) { next(e); }
  });

  app.post("/api/posts", requireAuth, async (req, res, next) => {
    try {
      const parsed = insertPostSchema.parse(req.body);
      const post = await storage.createPost(req.user!.id, parsed);
      // Virtual-route merits: first post + milestone posts (idempotent).
      try {
        await storage.ensureMerit(req.user!.id, "first_post");
        const n = await storage.countPostsByUser(req.user!.id);
        if (n >= 5) await storage.ensureMerit(req.user!.id, "posts_5");
        if (n >= 25) await storage.ensureMerit(req.user!.id, "posts_25");
      } catch (e) { console.error("merit post:", e); }
      res.status(201).json({ post });
    } catch (e) { next(e); }
  });

  app.delete("/api/posts/:id", requireAuth, async (req, res, next) => {
    try {
      await storage.deletePost(req.user!.id, parseInt(String(req.params.id), 10));
      res.json({ ok: true });
    } catch (e) {
      if (e instanceof Error && e.message.includes("authorized")) return res.status(403).json({ message: e.message });
      next(e);
    }
  });

  // ---------- Comments ----------
  app.get("/api/posts/:id/comments", requireAuth, async (req, res, next) => {
    try {
      res.json({ comments: await storage.listComments(parseInt(String(req.params.id), 10)) });
    } catch (e) { next(e); }
  });

  app.post("/api/posts/:id/comments", requireAuth, async (req, res, next) => {
    try {
      const parsed = insertCommentSchema.parse({ ...req.body, postId: parseInt(String(req.params.id), 10) });
      const comment = await storage.createComment(req.user!.id, parsed);
      // Virtual-route merit: first comment (idempotent).
      try { await storage.ensureMerit(req.user!.id, "first_comment"); }
      catch (e) { console.error("merit first_comment:", e); }
      res.status(201).json({ comment });
    } catch (e) { next(e); }
  });

  // ---------- Likes ----------
  app.post("/api/posts/:id/like", requireAuth, async (req, res, next) => {
    try {
      const result = await storage.toggleLike(req.user!.id, parseInt(String(req.params.id), 10));
      res.json(result);
    } catch (e) { next(e); }
  });

  // ---------- Messages ----------
  app.get("/api/messages/conversations", requireAuth, async (req, res, next) => {
    try {
      res.json({ conversations: await storage.listConversations(req.user!.id) });
    } catch (e) { next(e); }
  });

  app.get("/api/messages/unread", requireAuth, async (req, res, next) => {
    try {
      res.json({ count: await storage.unreadCount(req.user!.id) });
    } catch (e) { next(e); }
  });

  app.get("/api/messages/:userId", requireAuth, async (req, res, next) => {
    try {
      const partnerId = parseInt(String(req.params.userId), 10);
      const msgs = await storage.listMessages(req.user!.id, partnerId);
      await storage.markThreadRead(req.user!.id, partnerId);
      res.json({ messages: msgs, partner: sanitize((await storage.getUser(partnerId))!) });
    } catch (e) { next(e); }
  });

  app.post("/api/messages/:userId", requireAuth, async (req, res, next) => {
    try {
      const receiverId = parseInt(String(req.params.userId), 10);
      if (receiverId === req.user!.id) return res.status(400).json({ message: "Cannot message yourself" });
      const parsed = insertMessageSchema.parse({ ...req.body, receiverId });

      let attachmentMeta: { path: string; name: string; mime: string } | undefined;
      if (parsed.attachment) {
        attachmentMeta = await uploadAttachment(
          parsed.attachment.dataUrl,
          parsed.attachment.name,
          parsed.attachment.mime,
        );
      }

      const message = await storage.sendMessage(req.user!.id, {
        receiverId: parsed.receiverId,
        content: parsed.content ?? "",
        attachment: attachmentMeta,
      } as any);
      res.status(201).json({ message });
    } catch (e) { next(e); }
  });

  // Authenticated, access-checked attachment download.
  // Returns a short-lived signed URL the client is redirected to / can fetch.
  app.get("/api/messages/:messageId/attachment", requireAuth, async (req, res, next) => {
    try {
      const messageId = parseInt(String(req.params.messageId), 10);
      const msg = await storage.getMessage(messageId);
      if (!msg || !msg.attachmentPath) return res.status(404).json({ message: "Not found" });
      // Only sender or receiver may view the attachment.
      if (msg.senderId !== req.user!.id && msg.receiverId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const url = await storage.signedAttachmentUrl(msg.attachmentPath);
      if (!url) return res.status(500).json({ message: "Could not generate download link" });
      res.json({ url, name: msg.attachmentName, mime: msg.attachmentMime });
    } catch (e) { next(e); }
  });

  return _httpServer;
}
