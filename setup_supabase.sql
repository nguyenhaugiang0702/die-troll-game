-- ==============================================================
-- SCRIPT CẤU HÌNH BẢNG SUPABASE CHO GAME "CON RỐI BỊ TROLL"
-- ==============================================================
-- Hướng dẫn:
-- 1. Vào Supabase Dashboard -> chọn Project của bạn.
-- 2. Bấm vào icon "SQL Editor" (ở menu bên trái).
-- 3. Bấm "New Query", dán toàn bộ đoạn code dưới đây vào rồi bấm nút "RUN".
-- ==============================================================

-- 1. Xóa bảng players cũ (nếu có) để tạo lại chuẩn xác định dạng
drop table if exists public.players cascade;

-- 2. Tạo bảng lưu thông tin người chơi (id là text để lưu chuỗi nhận diện máy)
create table public.players (
  id text primary key,
  name text not null,
  level integer default 1,
  deaths integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Cấu hình bảo mật RLS cho phép Client đọc/ghi dữ liệu
alter table public.players enable row level security;

drop policy if exists "allow_anon_all" on public.players;
create policy "allow_anon_all"
  on public.players
  for all
  to anon, authenticated
  using (true)
  with check (true);
