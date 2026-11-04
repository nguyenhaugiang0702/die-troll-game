-- ==============================================================
-- SCRIPT CẤU HÌNH BẢNG SUPABASE CHO GAME "CON RỐI BỊ TROLL"
-- ==============================================================
-- Hướng dẫn:
-- 1. Vào Supabase Dashboard -> chọn Project của bạn.
-- 2. Bấm vào icon "SQL Editor" (ở menu bên trái).
-- 3. Bấm "New Query", dán đoạn code dưới đây vào rồi bấm nút "RUN".
-- ==============================================================

-- 1. Xóa bảng players cũ (nếu muốn tạo lại từ đầu)
-- drop table if exists public.players cascade;

-- 2. Tạo bảng lưu thông tin người chơi (kèm cột play_time và avatar)
create table if not exists public.players (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  avatar text default '🎭',
  level integer default 1,
  deaths integer default 0,
  play_time integer default 0, -- Thời gian chơi/hoàn thành tính bằng giây (seconds)
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- NẾU BẢNG ĐÃ TỒN TẠI, chạy 2 dòng sau để bổ sung cột mới:
alter table public.players add column if not exists play_time integer default 0;
alter table public.players add column if not exists avatar text default '🎭';

-- 3. Cấu hình bảo mật RLS cho phép Client đọc/ghi dữ liệu
alter table public.players enable row level security;

drop policy if exists "allow_anon_all" on public.players;
create policy "allow_anon_all"
  on public.players
  for all
  to anon, authenticated
  using (true)
  with check (true);
