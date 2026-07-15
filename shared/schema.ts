import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---------- Users ----------
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["member", "admin"] }).notNull().default("member"),
  fullName: text("full_name"),
  city: text("city"),
  country: text("country"),
  field: text("field"),
  bio: text("bio"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  fullName: true,
  city: true,
  country: true,
}).extend({
  email: z.string().email(),
  username: z.string().min(3).max(40),
  password: z.string().min(6).max(100),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  field: z.string().max(120).optional(),
  bio: z.string().max(600).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type User = typeof users.$inferSelect;

// Public-safe user (no password)
export type PublicUser = Omit<User, "password">;

// ---------- Sessions ----------
export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ---------- Applications ----------
export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  age: text("age").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  field: text("field").notNull(),
  yearsExperience: text("years_experience").notNull(),
  whyJoin: text("why_join").notNull(),
  valuesAlignment: text("values_alignment").notNull(),
  contribution: text("contribution").notNull(),
  referral: text("referral"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  userId: true,
  status: true,
  createdAt: true,
}).extend({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  age: z.string().min(1),
  country: z.string().min(2),
  city: z.string().min(2),
  field: z.string().min(2),
  yearsExperience: z.string().min(1),
  whyJoin: z.string().min(20).max(1200),
  valuesAlignment: z.string().min(20).max(1200),
  contribution: z.string().min(20).max(1200),
  referral: z.string().max(300).optional().or(z.literal("")),
});

export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;

// ---------- Memberships ----------
export const memberships = sqliteTable("memberships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  tier: text("tier", { enum: ["prospect", "mindset", "executive", "og"] }).notNull(),
  status: text("status", { enum: ["active", "pending", "expired"] }).notNull().default("active"),
  startedAt: text("started_at").notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text("expires_at").notNull(),
});

export const insertMembershipSchema = createInsertSchema(memberships).omit({
  id: true,
  userId: true,
  status: true,
  startedAt: true,
  expiresAt: true,
}).extend({
  tier: z.enum(["prospect", "mindset", "executive", "og"]),
});

export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Membership = typeof memberships.$inferSelect;

export const TIERS = {
  prospect: { id: "prospect", name: "Prospect Membership", priceYearly: 200, currency: "$" },
  mindset: { id: "mindset", name: "Mindset & Success Coaching", priceYearly: 600, currency: "$" },
  executive: { id: "executive", name: "Executive Membership", priceYearly: 1800, currency: "$" },
  og: { id: "og", name: "OG ZACKERS CIRCLE OF TRUST", priceYearly: 2800, currency: "$" },
} as const;

export const TIER_FEATURES: Record<string, string[]> = {
  prospect: [
    "Entry to the ZACKERZ community",
    "Foundational content & member library",
    "Event discovery & chapter introductions",
    "Eligibility to apply for full membership",
    "Member-only communications",
  ],
  mindset: [
    "Confidence & Communication Coaching",
    "Personal Transformation Coaching",
    "Self-Mastery curriculum (full access)",
    "Full access to the network",
  ],
  executive: [
    "Everything in Mindset & Success Coaching",
    "Full access to the organisation",
    "Executive training & leadership development",
    "Priority booking on expeditions & masterclasses",
  ],
  og: [
    "Everything in Executive Membership",
    "Private meeting with the Kaiser",
    "Founders' Circle privileges",
    "Direct mentor pairing in your field",
  ],
};

export const TIER_PREREQUISITE: Record<string, string | null> = {
  prospect: null,
  mindset: null,
  executive: "Prospect membership required",
  og: "Prospect level and personal meeting with the Kaiser mandatory",
};

// ---------- Chapters ----------
export const chapters = sqliteTable("chapters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  city: text("city").notNull(),
  country: text("country").notNull(),
  lead: text("lead").notNull(),
  memberCount: integer("member_count").notNull().default(0),
  description: text("description").notNull(),
  meetingCadence: text("meeting_cadence").notNull(),
});

export type Chapter = typeof chapters.$inferSelect;

// ---------- Events ----------
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  location: text("location").notNull(),
  chapterId: integer("chapter_id"),
  type: text("type", { enum: ["expedition", "meeting", "festival", "masterclass"] }).notNull().default("meeting"),
  capacity: integer("capacity").notNull().default(20),
});

export type Event = typeof events.$inferSelect;

// ---------- RSVPs ----------
export const rsvps = sqliteTable("rsvps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  eventId: integer("event_id").notNull(),
  status: text("status", { enum: ["going", "interested"] }).notNull().default("going"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertRsvpSchema = createInsertSchema(rsvps).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  status: z.enum(["going", "interested"]),
  eventId: z.number(),
});

export type InsertRsvp = z.infer<typeof insertRsvpSchema>;
export type Rsvp = typeof rsvps.$inferSelect;

// ---------- Posts (social feed) ----------
export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  content: z.string().min(1).max(2000),
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

// ---------- Comments ----------
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  postId: z.number(),
  content: z.string().min(1).max(1000),
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// ---------- Post Likes ----------
export const postLikes = sqliteTable("post_likes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type PostLike = typeof postLikes.$inferSelect;

// ---------- Direct Messages ----------
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  attachmentPath: text("attachment_path"),
  attachmentName: text("attachment_name"),
  attachmentMime: text("attachment_mime"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  readAt: text("read_at"),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  senderId: true,
  createdAt: true,
  readAt: true,
  attachmentPath: true,
  attachmentName: true,
  attachmentMime: true,
}).extend({
  receiverId: z.number(),
  content: z.string().max(2000),
  attachment: z.object({
    name: z.string().min(1).max(120),
    mime: z.string().min(1).max(100),
    dataUrl: z.string().min(1),
  }).optional(),
}).refine(
  (v) => (v.content && v.content.trim().length > 0) || !!v.attachment,
  { message: "Message must have text or an attachment" }
);

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ---------- Chapter Gate check-ins (NARTHEX) ----------
export const chapterCheckins = sqliteTable("chapter_checkins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chapterId: integer("chapter_id").notNull(),
  gateId: integer("gate_id").notNull(),
  userId: integer("user_id").notNull(),
  checkedInAt: text("checked_in_at").notNull().$defaultFn(() => new Date().toISOString()),
  checkinDate: text("checkin_date").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type ChapterCheckin = typeof chapterCheckins.$inferSelect;
