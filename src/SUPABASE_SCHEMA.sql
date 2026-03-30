-- ================================================================
-- SUPABASE SQL SCHEMA — Mafia Game
-- Supabase dashboard > SQL Editor da ishga tushiring
-- ================================================================

-- ROOMS jadvali
CREATE TABLE IF NOT EXISTS rooms (
  room_id       TEXT PRIMARY KEY,
  creator_id    TEXT NOT NULL,
  creator_name  TEXT NOT NULL,
  type          TEXT DEFAULT 'public',
  max_players   INTEGER DEFAULT 10,
  status        TEXT DEFAULT 'waiting',   -- waiting | playing | ended
  is_day        BOOLEAN DEFAULT TRUE,
  day_count     INTEGER DEFAULT 1,
  time_left     INTEGER DEFAULT 30,
  phase         TEXT DEFAULT 'discussion', -- discussion | voting | night
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ROOM_PLAYERS jadvali
CREATE TABLE IF NOT EXISTS room_players (
  id          BIGSERIAL PRIMARY KEY,
  room_id     TEXT REFERENCES rooms(room_id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  username    TEXT NOT NULL,
  user_image  TEXT DEFAULT '/avatars/default.jpg',
  is_ready    BOOLEAN DEFAULT FALSE,
  is_alive    BOOLEAN DEFAULT TRUE,
  role        TEXT,                         -- Don | Mafia | Komissar | Shifokor | Aholi
  votes       INTEGER DEFAULT 0,
  surrendered BOOLEAN DEFAULT FALSE,
  active_role TEXT DEFAULT 'none',
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- NIGHT_ACTIONS jadvali (tungi harakatlar)
CREATE TABLE IF NOT EXISTS night_actions (
  id          BIGSERIAL PRIMARY KEY,
  room_id     TEXT NOT NULL,
  actor_id    TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  action_type TEXT NOT NULL,   -- kill | check | shoot | heal
  day_count   INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, actor_id, day_count)
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_actions ENABLE ROW LEVEL SECURITY;

-- Hamma o'qiy oladi (game data public)
CREATE POLICY "rooms_select_all"    ON rooms         FOR SELECT USING (TRUE);
CREATE POLICY "players_select_all"  ON room_players  FOR SELECT USING (TRUE);
CREATE POLICY "actions_select_all"  ON night_actions FOR SELECT USING (TRUE);

-- Hamma yoza oladi (auth kerak emas — anon key bilan ishlaydi)
CREATE POLICY "rooms_insert_all"    ON rooms         FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "rooms_update_all"    ON rooms         FOR UPDATE USING (TRUE);
CREATE POLICY "rooms_delete_all"    ON rooms         FOR DELETE USING (TRUE);

CREATE POLICY "players_insert_all"  ON room_players  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "players_update_all"  ON room_players  FOR UPDATE USING (TRUE);
CREATE POLICY "players_delete_all"  ON room_players  FOR DELETE USING (TRUE);

CREATE POLICY "actions_insert_all"  ON night_actions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "actions_update_all"  ON night_actions FOR UPDATE USING (TRUE);
CREATE POLICY "actions_delete_all"  ON night_actions FOR DELETE USING (TRUE);

-- ================================================================
-- REALTIME ENABLE (Supabase Dashboard > Database > Replication)
-- rooms va room_players jadvallarini realtime qo'shing
-- ================================================================

-- Auto-cleanup: 1 soatdan o'tgan xonalarni o'chirish (cron job)
-- Supabase > Functions > Schedule yoki Edge Functions ishlatiladi

-- ================================================================
-- INDEX
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_rooms_status     ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_players_room_id  ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_actions_room_day ON night_actions(room_id, day_count);
