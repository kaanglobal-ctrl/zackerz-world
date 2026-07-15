-- ZACKERZ Merit System v1 — one-time backfill.
-- Awards merits retroactively for actions members already performed before the
-- merit system existed. Idempotent: ON CONFLICT (dedupe_key) DO NOTHING means it
-- can be re-run safely. event_hosted is intentionally skipped (events have no
-- host_user_id column to attribute them).

-- Virtual: profile complete
INSERT INTO merit_awards (user_id, merit_key, route, points, source_type, source_id, dedupe_key, note)
SELECT u.id, 'profile_complete', 'virtual', 10, 'profile', NULL, 'profile_complete:'||u.id, 'Backfill'
FROM users u
WHERE COALESCE(u.city,'') <> '' AND COALESCE(u.country,'') <> ''
  AND COALESCE(u.field,'') <> '' AND COALESCE(u.bio,'') <> ''
ON CONFLICT (dedupe_key) DO NOTHING;

-- Virtual: first post / posts milestones
INSERT INTO merit_awards (user_id, merit_key, route, points, source_type, dedupe_key, note)
SELECT user_id, 'first_post', 'virtual', 5, 'post', 'first_post:'||user_id, 'Backfill'
FROM (SELECT DISTINCT user_id FROM posts) p
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO merit_awards (user_id, merit_key, route, points, source_type, dedupe_key, note)
SELECT user_id, 'posts_5', 'virtual', 10, 'post', 'posts_5:'||user_id, 'Backfill'
FROM (SELECT user_id FROM posts GROUP BY user_id HAVING COUNT(*) >= 5) x
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO merit_awards (user_id, merit_key, route, points, source_type, dedupe_key, note)
SELECT user_id, 'posts_25', 'virtual', 25, 'post', 'posts_25:'||user_id, 'Backfill'
FROM (SELECT user_id FROM posts GROUP BY user_id HAVING COUNT(*) >= 25) x
ON CONFLICT (dedupe_key) DO NOTHING;

-- Virtual: first comment
INSERT INTO merit_awards (user_id, merit_key, route, points, source_type, dedupe_key, note)
SELECT user_id, 'first_comment', 'virtual', 3, 'comment', 'first_comment:'||user_id, 'Backfill'
FROM (SELECT DISTINCT user_id FROM comments) c
ON CONFLICT (dedupe_key) DO NOTHING;

-- Virtual: first RSVP (going)
INSERT INTO merit_awards (user_id, merit_key, route, points, source_type, dedupe_key, note)
SELECT user_id, 'first_rsvp', 'virtual', 5, 'rsvp', 'first_rsvp:'||user_id, 'Backfill'
FROM (SELECT DISTINCT user_id FROM rsvps WHERE status = 'going') r
ON CONFLICT (dedupe_key) DO NOTHING;

-- Real: first check-in / check-in milestones
INSERT INTO merit_awards (user_id, merit_key, route, points, source_type, dedupe_key, note)
SELECT user_id, 'first_checkin', 'real', 10, 'checkin', 'first_checkin:'||user_id, 'Backfill'
FROM (SELECT DISTINCT user_id FROM chapter_checkins) c
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO merit_awards (user_id, merit_key, route, points, source_type, dedupe_key, note)
SELECT user_id, 'checkin_5', 'real', 15, 'checkin', 'checkin_5:'||user_id, 'Backfill'
FROM (SELECT user_id FROM chapter_checkins GROUP BY user_id HAVING COUNT(*) >= 5) x
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO merit_awards (user_id, merit_key, route, points, source_type, dedupe_key, note)
SELECT user_id, 'checkin_25', 'real', 40, 'checkin', 'checkin_25:'||user_id, 'Backfill'
FROM (SELECT user_id FROM chapter_checkins GROUP BY user_id HAVING COUNT(*) >= 25) x
ON CONFLICT (dedupe_key) DO NOTHING;
