import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY trong file .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  level: number;
  deaths: number;
  updated_at?: string;
}

// ─── Player identity ─────────────────────────────────────────────────────────

export function getPlayerId(): string {
  if (typeof localStorage === 'undefined') return '';
  let id = localStorage.getItem('puppet_player_id');
  if (!id) {
    id = 'player_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem('puppet_player_id', id);
  }
  return id;
}

export function getPlayerName(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem('puppet_player_name') || '';
}

export function setPlayerName(name: string): string {
  const trimmed = (name || '').trim();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('puppet_player_name', trimmed);
  }
  return trimmed;
}

// ─── Save progress ────────────────────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function savePlayerProgress(
  level: number,
  deaths: number,
  immediate = false
): Promise<void> {
  const name = getPlayerName();
  if (!name) return;

  const payload: Player = {
    id: getPlayerId(),
    name,
    level: level + 1, // 1-based
    deaths,
    updated_at: new Date().toISOString(),
  };

  // Persist locally as fallback
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('puppet_last_level', String(payload.level));
    localStorage.setItem('puppet_last_deaths', String(payload.deaths));
  }

  const doSave = async () => {
    try {
      const { error } = await supabase
        .from('players')
        .upsert(payload, { onConflict: 'id' });
      if (error) console.error('[Supabase] Lỗi khi lưu:', error.message);
    } catch (e) {
      console.error('[Supabase] Lỗi mạng:', e);
    }
  };

  if (immediate) {
    if (saveTimer) clearTimeout(saveTimer);
    await doSave();
  } else {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 1500);
  }
}

// ─── Load progress ────────────────────────────────────────────────────────────

export async function loadPlayerProgress(): Promise<{ level: number; deaths: number }> {
  const fallback = {
    level: parseInt(
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('puppet_last_level') || '1'
        : '1',
      10
    ),
    deaths: parseInt(
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('puppet_last_deaths') || '0'
        : '0',
      10
    ),
  };

  try {
    const { data, error } = await supabase
      .from('players')
      .select('level, deaths, name')
      .eq('id', getPlayerId())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('[Supabase] Lỗi tải tiến trình:', error.message);
      return fallback;
    }
    if (data) {
      if (data.name && !getPlayerName()) setPlayerName(data.name);
      return { level: data.level || 1, deaths: data.deaths || 0 };
    }
  } catch (e) {
    console.warn('[Supabase] Không thể lấy tiến trình:', e);
  }

  return fallback;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function fetchLeaderboard(): Promise<
  { data: Player[] } | { error: string }
> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('name, level, deaths, updated_at')
      .order('level', { ascending: false })
      .order('deaths', { ascending: true })
      .order('updated_at', { ascending: true })
      .limit(20);

    if (error) throw error;
    return { data: data as Player[] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Không thể tải bảng xếp hạng.';
    console.error('[Supabase] Lỗi tải bảng xếp hạng:', err);
    return { error: msg };
  }
}

