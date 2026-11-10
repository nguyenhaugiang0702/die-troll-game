-- ==============================================================================
-- SETUP DATABASE CHO DIE AGAIN: PUPPET ESCAPE (SUPABASE / POSTGRESQL)
-- 100% QUẢN LÝ TẬP TRUNG TỪ DATABASE:
-- - Danh mục Skins trong bảng public.skins (id là UUID tự sinh, name là slug kỹ thuật)
-- - Người chơi lưu equipped_skin_id trỏ về UUID của public.skins
-- - Tủ đồ cá nhân public.player_skins tự động mở khóa theo Màn (level) & Số lần chết (deaths)
-- ==============================================================================

-- 1. Bảng danh mục Skins
CREATE TABLE IF NOT EXISTS public.skins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,        -- Mã slug: 'auto', 'wooden', 'ninja', 'flame', 'box'...
  display_name TEXT NOT NULL,              -- 'Tự Động Theo Màn', 'Ninja Bóng Đêm'...
  icon TEXT NOT NULL DEFAULT '👕',         -- '🥷', '👻', '⚡'...
  description TEXT,                        -- Mô tả trang phục & cách mở khóa
  unlock_type VARCHAR(20) NOT NULL,        -- 'auto' | 'free' | 'level' | 'deaths'
  req_value INTEGER DEFAULT 0,             -- Màn yêu cầu hoặc Số lần chết yêu cầu
  preview_color VARCHAR(30) DEFAULT '#fff',
  effect_move TEXT,                        -- Mô tả hiệu ứng khi Di chuyển
  effect_jump TEXT,                        -- Mô tả hiệu ứng khi Nhảy
  effect_land TEXT,                        -- Mô tả hiệu ứng khi Tiếp đất
  sort_order INTEGER DEFAULT 0,            -- Thứ tự hiển thị trong modal
  is_active BOOLEAN DEFAULT true,          -- Bật/tắt skin trong game
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Nâng cấp các cột nếu bảng đã tồn tại từ trước
ALTER TABLE public.skins
  ADD COLUMN IF NOT EXISTS effect_move TEXT,
  ADD COLUMN IF NOT EXISTS effect_jump TEXT,
  ADD COLUMN IF NOT EXISTS effect_land TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ------------------------------------------------------------------------------
-- 2. Nạp toàn bộ 17 Skins chính thức vào Database (UPSERT an toàn theo name)
-- ------------------------------------------------------------------------------
INSERT INTO public.skins (
  name, display_name, icon, description, unlock_type, req_value, preview_color,
  effect_move, effect_jump, effect_land, sort_order
) VALUES
  (
    'auto', 'Tự Động Theo Màn', '⚡',
    'Tự động đổi diện mạo và hiệu ứng mới sau mỗi 10 màn chơi (Màn 1, 11, 21, 31, 41)!',
    'auto', 0, '#8a7bff',
    'Tự đổi vệt bước chân theo từng chặng màn chơi',
    'Phản lực bật nhảy biến hóa tương ứng theo màn',
    'Sóng xung kích tiếp đất đổi mới sau mỗi 10 màn',
    0
  ),
  (
    'wooden', 'Rối Gỗ Cổ Điển', '🪵',
    'Màn 1 - 10: Chú rối gỗ đơn sơ nhưng kiên cường, sinh ra để vượt qua cạm bẫy.',
    'level', 1, '#f3e9d2',
    'Bụi dăm gỗ cổ điển vương lại sau gót chân',
    'Cụm bụi đất & dăm gỗ bung nhẹ đẩy tung lên cao',
    'Sóng bụi gỗ dăm bào lan tỏa sang hai bên mặt sàn',
    1
  ),
  (
    'ninja', 'Ninja Bóng Đêm', '🥷',
    'Màn 11 - 20: Tung khăn đỏ phấp phới trong gió, thoắt ẩn thoắt hiện né gai nhọn.',
    'level', 11, '#ff4757',
    'Khói ánh trăng bạc & vệt lụa đỏ thoắt ẩn thoắt hiện',
    'Bom khói ánh trăng "Poof!" kèm tia ám khí đỏ rực',
    'Khói bóng tối dạ hành tản nhanh & vệt chém lướt sàn',
    2
  ),
  (
    'flame', 'Hỏa Thần Rực Lửa', '🔥',
    'Màn 21 - 30: Sinh ra từ biển dung nham, đầu bốc lửa hừng hực không sợ bẫy.',
    'level', 21, '#ff6348',
    'Vệt tàn lửa than hồng & đốm lửa bập bùng bốc lên',
    'Phản lực lửa bốc cháy dữ dội đẩy tung người lên',
    'Sóng nhiệt rực lửa & tia lửa tóe rực rỡ mặt đất',
    3
  ),
  (
    'frost', 'Thạch Anh Băng Giá', '❄️',
    'Màn 31 - 40: Cơ thể kết tinh từ băng vĩnh cửu, lạnh lùng vượt qua mọi cú lừa.',
    'level', 31, '#70a1ff',
    'Sương giá băng tuyết & vụn băng pha lê lấp lánh',
    'Băng vỡ tung (Ice Shatter) với ánh pha lê xanh ngọc',
    'Vòng gai băng nứt toác & làn sương lạnh tỏa trên sàn',
    4
  ),
  (
    'golden', 'Vua Hoàng Kim', '👑',
    'Màn 41 - 50: Đầu đội vương miện đính hồng ngọc, bộ giáp hoàng gia của người sắp phá đảo.',
    'level', 41, '#f5c542',
    'Bụi vàng kim tuyến 24k & những ngôi sao lấp lánh',
    'Chùm pháo sao hoàng kim bung nở rực rỡ dưới chân',
    'Hào quang vương giả bừng sáng với bụi vàng & hồng ngọc',
    5
  ),
  (
    'box', 'Thùng Carton Tự Vệ', '📦',
    'Mở khóa khi Chết ≥ 5 lần: Chui vào thùng carton để trốn tránh thực tại cay đắng bị game troll.',
    'deaths', 5, '#e1b12c',
    'Vụn bìa carton dăm xốp bay lả tả sau bước chân',
    'Bung nắp thùng! Miếng carton & xốp trắng nẩy tưng tưng',
    'Rơi bịch xuống sàn, vụn bìa & mút xốp văng dạt hai bên',
    6
  ),
  (
    'bruised', 'Rối Bầm Dập', '🩹',
    'Mở khóa khi Chết ≥ 10 lần: Đầy vết thương và băng cá nhân, mắt tím ngắt vẫn không chịu lùi bước!',
    'deaths', 10, '#dcd0ff',
    'Giọt mồ hôi văng ra cùng bụi đất lem luốc',
    'Dồn hết sức bình sinh nhảy vọt, mồ hôi bắn tóe',
    'Cú ngã chấn động, sao choáng váng 💫 & bụi lem nhem',
    7
  ),
  (
    'chicken', 'Chú Gà Vui Nhộn', '🐔',
    'Mở khóa khi Chết ≥ 30 lần: Vừa chạy vừa rơi lông! Đầu đội mào đỏ chót, mỏ vàng toe toét.',
    'deaths', 30, '#f6b93b',
    'Lông vũ vàng óng & trắng muốt chao lượn rụng theo bước chạy',
    'Đập cánh "Cục tác!" bay vút, bão lông gà & đốm vàng bung tỏa',
    'Hạ cánh tấu hài bẹp dí, lông vũ & bụi vàng bay tứ tán',
    8
  ),
  (
    'ghost', 'Hồn Ma Vất Vưởng', '👻',
    'Mở khóa khi Chết ≥ 50 lần: Chết quá nhiều đến mức hóa thành bóng ma lơ lửng phát sáng.',
    'deaths', 50, '#7bed9f',
    'Đốm ma trơi xanh ngọc lơ lửng không chạm đất',
    'Luồng linh hồn xanh dạ quang nâng người nhẹ tênh',
    'Sương ma trôi lan êm đềm như không trọng lực',
    9
  ),
  (
    'zombie', 'Zombie Khập Khiễng', '🧟',
    'Mở khóa khi Chết ≥ 75 lần: Bị bẫy chém nát vụn biến thành xác sống lê bước, độc dịch xanh neon độc hại.',
    'deaths', 75, '#00cec9',
    'Bong bóng độc dịch xanh neon sủi bọt & khói axit',
    'Gầm rú bật nảy! Vụ nổ độc dịch axit xanh & vụn xương',
    'Sóng axit xanh neon dạt sàn kèm vòng độc dịch chói lọi',
    10
  ),
  (
    'reaper', 'Thần Chết Mini', '☠️',
    'Mở khóa khi Chết ≥ 100 lần: Áo choàng tử thần và lưỡi hái sắc bén. Đã kết thân với Thần Chết!',
    'deaths', 100, '#a55eea',
    'Tử khí tím dạ quang & đốm lửa địa ngục cuộn trào',
    'Sóng tử khí tím bùng nổ xoáy vút kèm vòng ma pháp đỏ',
    'Địa ngục cuộn trào sang hai bên & tàn lửa linh hồn bốc cháy',
    11
  ),
  (
    'clown', 'Chú Hề Troll', '🤡',
    'Mở khóa khi Chết ≥ 150 lần: Kẻ cười trên mọi cái bẫy! Mũi đỏ phát sáng, tung bóng xiếc và pháo giấy khắp nơi.',
    'deaths', 150, '#ff7675',
    'Bóng xiếc mini rực rỡ & tàn pháo hoa kim tuyến rơi rụng',
    'Tung bóng rạp xiếc "BÙM"! Pháo giấy sao sắc màu bắn tung tóe',
    'Kèn bóp "Bí bo!", vòng sóng sắc màu rực rỡ & bóng nảy tưng bừng',
    12
  ),
  (
    'troll', 'Thánh Troll Bất Tử', '🌈',
    'Mở khóa khi Chết ≥ 200 lần: Huyền thoại bất tử! Cơ thể phát sáng Neon cầu vồng RGB rực rỡ.',
    'deaths', 200, '#ff3838',
    'Dải vệt sáng cầu vồng RGB Neon đổi màu rực rỡ',
    'Pháo hoa cầu vồng Mini Popper bung tỏa sắc màu rực rỡ',
    'Bữa tiệc Party Confetti bung nổ sắc màu khắp sàn',
    13
  ),
  (
    'cyborg', 'Cyborg Cyberpunk', '🤖',
    'Mở khóa khi Chết ≥ 300 lần: Nâng cấp giáp nano tương lai! Mạch điện Neon Cyan và Hồng Cyber cực gắt.',
    'deaths', 300, '#00f2fe',
    'Khối năng lượng Hologram Cyan/Magenta phân rã & tia lửa điện',
    'Phản lực Plasma cực đại! Vòng sóng siêu âm & laser hồng',
    'Sóng xung kích ma trận kỹ thuật số EMP chấn động mặt sàn',
    14
  ),
  (
    'thunder', 'Lôi Thần Sấm Sét', '⚡',
    'Mở khóa khi Chết ≥ 400 lần: Tích tụ điện thế triệu volt! Sét đánh chớp giật chói lòa, sấm gầm rung chuyển.',
    'deaths', 400, '#fff200',
    'Tia sét vàng xanh nổ lách tách & vệt hồ quang điện phát sáng',
    'Sét giáng từ trời! Chùm sét phân nhánh & vòng plasma nổ bùng',
    'Sấm sét rung trời! Sóng điện từ sét nổ tung chạy dọc mặt sàn',
    15
  ),
  (
    'angel', 'Thiên Thần Hóa Kiếp', '🪽',
    'Mở khóa khi Chết ≥ 500 lần: Cảnh giới tối thượng bất tử! Vòng hào quang thánh thiện, lông vũ thần thánh vàng óng.',
    'deaths', 500, '#f9ca24',
    'Dải bụi sao thiên giới vàng kim tuyến & lông vũ thần thánh',
    'Cất cánh thăng hoa! Luồng hào quang vàng kim & bão lông vũ thánh',
    'Giáng trần uy nghi! Vòng thánh địa rực rỡ, sóng bụi sao kim tuyến',
    16
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  unlock_type = EXCLUDED.unlock_type,
  req_value = EXCLUDED.req_value,
  preview_color = EXCLUDED.preview_color,
  effect_move = EXCLUDED.effect_move,
  effect_jump = EXCLUDED.effect_jump,
  effect_land = EXCLUDED.effect_land,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- ------------------------------------------------------------------------------
-- 3. Chuẩn hóa cột equipped_skin_id của bảng players sang UUID có khóa ngoại
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

-- Xóa cột cũ (varchar) và tạo mới thành UUID có khóa ngoại tham chiếu sang public.skins(id)
ALTER TABLE public.players DROP COLUMN IF EXISTS equipped_skin_id CASCADE;
ALTER TABLE public.players ADD COLUMN equipped_skin_id UUID REFERENCES public.skins(id) ON DELETE SET NULL;

-- Gán mặc định skin 'auto' cho tất cả người chơi
UPDATE public.players
SET equipped_skin_id = (SELECT id FROM public.skins WHERE name = 'auto' LIMIT 1);

-- ------------------------------------------------------------------------------
-- 4. Bảng lưu tủ đồ skin người chơi đã mở khóa (player_skins chuẩn quan hệ UUID)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.player_skins CASCADE;

CREATE TABLE public.player_skins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  skin_id UUID NOT NULL REFERENCES public.skins(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_player_skin UNIQUE (player_id, skin_id)
);

CREATE INDEX idx_player_skins_player ON public.player_skins(player_id);

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

-- 6.1. Đồng bộ người chơi hiện tại vào bảng player_skins
INSERT INTO public.player_skins (player_id, skin_id)
SELECT 
  p.id AS player_id,
  s.id AS skin_id
FROM public.players p
CROSS JOIN public.skins s
WHERE 
  s.name = 'auto'
  OR s.unlock_type = 'auto'
  OR s.unlock_type = 'free'
  OR (s.unlock_type = 'level' AND p.level >= s.req_value)
  OR (s.unlock_type = 'deaths' AND p.deaths >= s.req_value)
ON CONFLICT (player_id, skin_id) DO NOTHING;

-- 6.2. Trigger tự động mở khóa skin & tự động trang bị skin khi qua mốc màn mới
CREATE OR REPLACE FUNCTION public.auto_unlock_player_skins()
RETURNS TRIGGER AS $$
DECLARE
  v_auto_skin_id UUID;
  v_new_level_skin_id UUID;
BEGIN
  -- 1. Lấy UUID của skin 'auto'
  SELECT id INTO v_auto_skin_id FROM public.skins WHERE name = 'auto' LIMIT 1;

  -- 2. Tự động mở khóa các skin đạt chuẩn vào bảng player_skins
  INSERT INTO public.player_skins (player_id, skin_id)
  SELECT 
    NEW.id AS player_id,
    s.id AS skin_id
  FROM public.skins s
  WHERE 
    (
      s.name = 'auto'
      OR s.unlock_type = 'auto'
      OR s.unlock_type = 'free'
      OR (s.unlock_type = 'level' AND NEW.level >= s.req_value)
      OR (s.unlock_type = 'deaths' AND NEW.deaths >= s.req_value)
    )
  ON CONFLICT (player_id, skin_id) DO NOTHING;

  -- 3. TỰ ĐỘNG EQUIP SKIN KHI QUA MỐC MÀN MỚI (Ví dụ: từ màn 20 qua 21 tự động trang bị skin màn 21):
  SELECT id INTO v_new_level_skin_id
  FROM public.skins
  WHERE unlock_type = 'level' AND NEW.level >= req_value
  ORDER BY req_value DESC
  LIMIT 1;

  -- A. Nếu chưa có skin hoặc đang chọn 'auto' -> gán theo level hiện tại
  IF NEW.equipped_skin_id IS NULL OR NEW.equipped_skin_id = v_auto_skin_id THEN
    NEW.equipped_skin_id := COALESCE(v_new_level_skin_id, v_auto_skin_id);
  -- B. Nếu level tăng lên và vừa chạm mốc mở khóa skin level mới (ví dụ 20 -> 21) -> tự động trang bị ngay
  ELSIF (TG_OP = 'UPDATE' AND NEW.level > OLD.level) THEN
    IF EXISTS (
      SELECT 1 FROM public.skins 
      WHERE unlock_type = 'level' AND req_value > OLD.level AND req_value <= NEW.level
    ) THEN
      NEW.equipped_skin_id := v_new_level_skin_id;
    END IF;
  -- C. Kiểm tra an toàn: Nếu người chơi đang chọn một skin cụ thể nhưng chưa mở khóa
  -- (ví dụ: can thiệp sửa localStorage / API trực tiếp) -> Tự động đưa về skin hợp lệ
  ELSIF (NEW.equipped_skin_id IS NOT NULL AND NEW.equipped_skin_id <> v_auto_skin_id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.skins s
      WHERE s.id = NEW.equipped_skin_id
        AND (
          s.name = 'auto'
          OR s.unlock_type = 'auto'
          OR s.unlock_type = 'free'
          OR (s.unlock_type = 'level' AND NEW.level >= s.req_value)
          OR (s.unlock_type = 'deaths' AND NEW.deaths >= s.req_value)
        )
    ) THEN
      NEW.equipped_skin_id := COALESCE(v_new_level_skin_id, v_auto_skin_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_unlock_player_skins ON public.players;
CREATE TRIGGER trg_auto_unlock_player_skins
BEFORE INSERT OR UPDATE OF level, deaths, equipped_skin_id ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.auto_unlock_player_skins();

-- ------------------------------------------------------------------------------
-- 7. BẢO VỆ CHỐNG GIAN LẬN TIẾN TRÌNH & CHỐNG TRÙNG TÊN (DATABASE SECURITY)
-- ------------------------------------------------------------------------------

-- 7.1. Chống trùng tên không phân biệt hoa thường (Unique Case-Insensitive Index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_unique_name ON public.players (LOWER(TRIM(name)));

-- 7.2. Trigger kiểm soát tính toàn vẹn (Anti-Cheat Progress Guard)
CREATE OR REPLACE FUNCTION public.validate_player_progress_update()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Chuẩn hóa tên (xóa khoảng trắng thừa)
  NEW.name := TRIM(NEW.name);

  -- 2. Giới hạn level tối đa là 50 màn, tối thiểu màn 1
  IF NEW.level > 50 THEN
    NEW.level := 50;
  ELSIF NEW.level < 1 THEN
    NEW.level := 1;
  END IF;

  -- 3. Số lần chết và thời gian chơi không được âm
  IF NEW.deaths < 0 THEN
    NEW.deaths := 0;
  END IF;
  IF NEW.play_time < 0 THEN
    NEW.play_time := 0;
  END IF;

  -- 4. Chống hack nhảy cóc màn chơi:
  -- Trong 1 lần update, người chơi chỉ được qua tối đa 1 màn (NEW.level <= OLD.level + 1).
  -- Ngoại lệ: Nếu người chơi bấm "Chơi lại từ đầu" thì level quay về 1 (NEW.level = 1).
  IF TG_OP = 'UPDATE' THEN
    IF NEW.level > OLD.level + 1 AND NEW.level <> 1 THEN
      -- Chặn bước nhảy bất thường, đưa về mức tối đa cho phép
      NEW.level := OLD.level + 1;
    END IF;

    -- Không cho phép giảm thời gian chơi (trừ khi chơi lại từ đầu level = 1)
    IF NEW.level > 1 AND NEW.play_time < OLD.play_time THEN
      NEW.play_time := OLD.play_time;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_player_progress ON public.players;
CREATE TRIGGER trg_validate_player_progress
BEFORE INSERT OR UPDATE OF name, level, deaths, play_time ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.validate_player_progress_update();
