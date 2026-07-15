-- ZACKERZ Merit System v1 — append-only merit ledger.
-- Every merit award (auto or admin-granted) is one row. Totals, splits, and
-- ranks are computed from this table — there is no points column on users.
-- Auto-awards use a unique dedupe_key so each merit fires at most once per
-- source (e.g. first check-in, first post), preventing point farming.
--
-- Routes: 'virtual' (online actions) | 'real' (in-person actions).
-- source_type: 'checkin' | 'rsvp' | 'post' | 'comment' | 'profile' | 'event_host' | 'admin'
-- awarded_by_user_id is NULL for automatic awards.

CREATE TABLE IF NOT EXISTS merit_awards (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merit_key TEXT NOT NULL,
  route TEXT NOT NULL CHECK (route IN ('virtual','real')),
  points INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL,
  source_id TEXT,
  dedupe_key TEXT NOT NULL,
  awarded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS merit_awards_dedupe_key_key
  ON merit_awards (dedupe_key);

CREATE INDEX IF NOT EXISTS merit_awards_user_id_idx
  ON merit_awards (user_id);

ALTER TABLE merit_awards ENABLE ROW LEVEL SECURITY;

-- Authorization is enforced in the Express API layer (anon key, no Supabase
-- auth session), mirroring the other tables. RLS grants anon/authenticated
-- access; the real checks live in the routes.
DROP POLICY IF EXISTS merit_awards_insert ON merit_awards;
CREATE POLICY merit_awards_insert ON merit_awards
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS merit_awards_select ON merit_awards;
CREATE POLICY merit_awards_select ON merit_awards
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS merit_awards_delete ON merit_awards;
CREATE POLICY merit_awards_delete ON merit_awards
  FOR DELETE TO anon, authenticated
  USING (true);
