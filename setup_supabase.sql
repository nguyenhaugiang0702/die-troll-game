-- ==============================================================================
-- SETUP DATABASE CHO DIE AGAIN: PUPPET ESCAPE (SUPABASE / POSTGRESQL)
-- id skin là UUID; name là mã skin ('auto', 'ghost', 'flame'...)
-- ==============================================================================

-- 1. Bảng danh mục Skins (id là UUID tự sinh, name là mã định danh 'auto', 'ghost'...)
CREATE TABLE IF NOT EXISTS public.skins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,        -- 'auto', 'wooden', 'ninja', 'flame', 'ghost'...
  display_name TEXT NOT NULL,              -- 'Tự Động Theo Màn', 'Hồn Ma Vất Vưởng'...
  icon TEXT NOT NULL DEFAULT '👕',         -- '🥷', '👻'...
  description TEXT,                        -- Mô tả trang phục & hiệu ứng
  unlock_type VARCHAR(20) NOT NULL,        -- 'free' | 'level' | 'deaths' | 'event' | 'shop'
  req_value INTEGER DEFAULT 0,             -- Màn yêu cầu hoặc Số lần chết yêu cầu
  preview_color VARCHAR(30) DEFAULT '#fff',
  is_active BOOLEAN DEFAULT true,          -- Bật/tắt skin trong game
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. QUAN TRỌNG: Nạp sẵn danh mục Skins vào bảng skins TRƯỚC
-- ------------------------------------------------------------------------------
INSERT INTO public.skins (name, display_name, icon, description, unlock_type, req_value, preview_color) VALUES
  ('auto', 'Tự Động Theo Màn', '⚡', 'Tự động đổi diện mạo sau mỗi 10 màn chơi', 'free', 0, '#8a7bff'),
  ('wooden', 'Rối Gỗ Cổ Điển', '🪵', 'Màn 1 - 10: Chú rối gỗ đơn sơ nhưng kiên cường', 'level', 1, '#f3e9d2'),
  ('ninja', 'Ninja Bóng Đêm', '🥷', 'Màn 11 - 20: Tung khăn đỏ phấp phới trong gió', 'level', 11, '#2b283a'),
  ('flame', 'Hỏa Thần Rực Lửa', '🔥', 'Màn 21 - 30: Sinh ra từ biển dung nham hừng hực', 'level', 21, '#ff6348'),
  ('frost', 'Thạch Anh Băng Giá', '❄️', 'Màn 31 - 40: Cơ thể kết tinh từ băng vĩnh cửu', 'level', 31, '#70a1ff'),
  ('golden', 'Vua Hoàng Kim', '👑', 'Màn 41 - 50: Đầu đội vương miện đính hồng ngọc', 'level', 41, '#f5c542'),
  ('bruised', 'Rối Bầm Dập', '🩹', 'Mở khóa khi Chết ≥ 10 lần: Đầy vết thương và băng cá nhân', 'deaths', 10, '#dcd0ff'),
  ('ghost', 'Hồn Ma Vất Vưởng', '👻', 'Mở khóa khi Chết ≥ 50 lần: Hóa thành bóng ma lơ lửng', 'deaths', 50, '#7bed9f'),
  ('reaper', 'Thần Chết Mini', '☠️', 'Mở khóa khi Chết ≥ 100 lần: Áo choàng và lưỡi hái sắc bén', 'deaths', 100, '#1e1830'),
  ('troll', 'Thánh Troll Bất Tử', '🌈', 'Mở khóa khi Chết ≥ 200 lần: Cơ thể phát sáng Neon cầu vồng', 'deaths', 200, '#ff3838')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  unlock_type = EXCLUDED.unlock_type,
  req_value = EXCLUDED.req_value,
  preview_color = EXCLUDED.preview_color;

-- ------------------------------------------------------------------------------
-- 3. Tạo bảng players nếu chưa có và thêm cột equipped_skin_id (UUID)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT DEFAULT '🎭',
  level INTEGER DEFAULT 1,
  deaths INTEGER DEFAULT 0,
  play_time INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Thêm cột equipped_skin_id (UUID)
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '🎭',
  ADD COLUMN IF NOT EXISTS play_time INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS equipped_skin_id UUID;

-- Tạo khóa ngoại an toàn nối từ players.equipped_skin_id -> skins.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_equipped_skin_id_fkey'
  ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_equipped_skin_id_fkey
      FOREIGN KEY (equipped_skin_id) REFERENCES public.skins(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Cập nhật mặc định các người chơi chưa có skin sang UUID của skin 'auto'
UPDATE public.players
SET equipped_skin_id = (SELECT id FROM public.skins WHERE name = 'auto' LIMIT 1)
WHERE equipped_skin_id IS NULL;

-- ------------------------------------------------------------------------------
-- 4. Bảng lưu tủ đồ skin người chơi đã mở khóa (player_skins với cả 2 ID là UUID)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_skins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  skin_id UUID NOT NULL REFERENCES public.skins(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_player_skin UNIQUE (player_id, skin_id)
);

CREATE INDEX IF NOT EXISTS idx_player_skins_player ON public.player_skins(player_id);

-- ------------------------------------------------------------------------------
-- 5. Phân quyền Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_skins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép mọi người đọc bảng điểm" ON public.players;
CREATE POLICY "Cho phép mọi người đọc bảng điểm" ON public.players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép người chơi thêm mới" ON public.players;
CREATE POLICY "Cho phép người chơi thêm mới" ON public.players FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép người chơi cập nhật thông tin" ON public.players;
CREATE POLICY "Cho phép người chơi cập nhật thông tin" ON public.players FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Cho phép đọc danh mục skin" ON public.skins;
CREATE POLICY "Cho phép đọc danh mục skin" ON public.skins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép đọc tủ đồ cá nhân" ON public.player_skins;
CREATE POLICY "Cho phép đọc tủ đồ cá nhân" ON public.player_skins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép thêm skin đã mở khóa" ON public.player_skins;
CREATE POLICY "Cho phép thêm skin đã mở khóa" ON public.player_skins FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. TỰ ĐỘNG MỞ KHÓA SKIN DỰA THEO SỐ MÀN CHƠI (level) VÀ SỐ LẦN CHẾT (deaths)
-- ------------------------------------------------------------------------------

-- 6.1. Đồng bộ toàn bộ người chơi hiện tại vào bảng player_skins
INSERT INTO public.player_skins (player_id, skin_id)
SELECT 
  p.id AS player_id,
  s.id AS skin_id
FROM public.players p
CROSS JOIN public.skins s
WHERE 
  s.name = 'auto'
  OR s.unlock_type = 'free'
  OR (s.unlock_type = 'level' AND p.level >= s.req_value)
  OR (s.unlock_type = 'deaths' AND p.deaths >= s.req_value)
ON CONFLICT (player_id, skin_id) DO NOTHING;

-- 6.2. Trigger tự động mở khóa skin mỗi khi người chơi qua màn hoặc chết thêm
CREATE OR REPLACE FUNCTION public.auto_unlock_player_skins()
RETURNS TRIGGER AS $$
BEGIN
  -- Tự động mở khóa các skin đạt chuẩn
  INSERT INTO public.player_skins (player_id, skin_id)
  SELECT 
    NEW.id AS player_id,
    s.id AS skin_id
  FROM public.skins s
  WHERE 
    s.name = 'auto'
    OR s.unlock_type = 'free'
    OR (s.unlock_type = 'level' AND NEW.level >= s.req_value)
    OR (s.unlock_type = 'deaths' AND NEW.deaths >= s.req_value)
  ON CONFLICT (player_id, skin_id) DO NOTHING;

  -- Nếu người chơi chưa có equipped_skin_id, gán mặc định sang UUID của skin 'auto'
  IF NEW.equipped_skin_id IS NULL THEN
    NEW.equipped_skin_id := (SELECT id FROM public.skins WHERE name = 'auto' LIMIT 1);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_unlock_player_skins ON public.players;
CREATE TRIGGER trg_auto_unlock_player_skins
BEFORE INSERT OR UPDATE OF level, deaths, equipped_skin_id ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.auto_unlock_player_skins();
