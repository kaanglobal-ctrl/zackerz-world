-- Chapters Gate (NARTHEX) check-in records.
-- One row per member per gate per day; the unique index is the backstop for
-- the "already checked in today" rule enforced in the Express endpoint.

CREATE TABLE IF NOT EXISTS chapter_checkins (
  id BIGSERIAL PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  gate_id INTEGER NOT NULL REFERENCES chapter_gates(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checkin_date DATE NOT NULL DEFAULT (now()::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS chapter_checkins_gate_user_date_key
  ON chapter_checkins (gate_id, user_id, checkin_date);

CREATE INDEX IF NOT EXISTS chapter_checkins_gate_date_idx
  ON chapter_checkins (gate_id, checkin_date);

ALTER TABLE chapter_checkins ENABLE ROW LEVEL SECURITY;

-- Authorization for this app is enforced in the Express API layer, which talks
-- to Supabase using the anon key (see server/supabase.ts). There is no Supabase
-- auth session, so auth.uid() is null at runtime. These policies therefore grant
-- the anon/authenticated roles access while the real membership / gate-open /
-- one-per-day checks live in the POST /api/chapters/:id/check-in handler, with
-- the unique index above as the database backstop. This mirrors the existing
-- tables, which are likewise gated by the Express layer rather than by RLS.
DROP POLICY IF EXISTS chapter_checkins_insert ON chapter_checkins;
CREATE POLICY chapter_checkins_insert ON chapter_checkins
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS chapter_checkins_select ON chapter_checkins;
CREATE POLICY chapter_checkins_select ON chapter_checkins
  FOR SELECT TO anon, authenticated
  USING (true);
