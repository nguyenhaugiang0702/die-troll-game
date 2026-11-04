import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY trong file .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Player {
  id?: string;
  name: string;
  level: number;
  deaths: number;
  updated_at?: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  level: number;
  deaths: number;
  hasPlayed: boolean;
}

export interface VerifyResult {
  isMatch: boolean;
  isNewUser: boolean;
  message?: string;
  localData?: { level: number; deaths: number; name: string };
  serverData?: { level: number; deaths: number; name: string };
}

// ─── Player Identity & Local Persistence ─────────────────────────────────────

export function getPlayerId(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem('puppet_player_id') || '';
}

export function setPlayerId(id: string | number): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('puppet_player_id', String(id));
  }
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

export function getLocalProgress(): { level: number; deaths: number; name: string } {
  if (typeof localStorage === 'undefined') return { level: 1, deaths: 0, name: '' };
  return {
    level: Math.max(1, parseInt(localStorage.getItem('puppet_last_level') || '1', 10)),
    deaths: Math.max(0, parseInt(localStorage.getItem('puppet_last_deaths') || '0', 10)),
    name: localStorage.getItem('puppet_player_name') || '',
  };
}

export function setLocalProgress(level: number, deaths: number): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('puppet_last_level', String(level));
    localStorage.setItem('puppet_last_deaths', String(deaths));
  }
}

export function clearPlayerSession(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('puppet_player_id');
    localStorage.removeItem('puppet_player_name');
    localStorage.removeItem('puppet_last_level');
    localStorage.removeItem('puppet_last_deaths');
  }
}

// ─── Đăng ký hoặc khôi phục người chơi (Auto-gen ID) ──────────────────────────

export async function registerOrFindPlayer(name: string): Promise<PlayerProfile> {
  const trimmed = (name || '').trim();
  setPlayerName(trimmed);

  const localId = getPlayerId();

  // 1. Nếu trên máy đã có ID, cập nhật tên mới nếu đổi
  if (localId) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', localId)
        .maybeSingle();

      if (data && !error) {
        if (data.name !== trimmed) {
          await supabase.from('players').update({ name: trimmed }).eq('id', localId);
        }
        setLocalProgress(data.level || 1, data.deaths || 0);
        return {
          id: String(data.id),
          name: trimmed,
          level: data.level || 1,
          deaths: data.deaths || 0,
          hasPlayed: true,
        };
      }
    } catch (e) {
      console.warn('[Supabase] Không thể tìm player theo local ID:', e);
    }
  }

  // 2. Nếu chưa có ID trên máy này, kiểm tra xem tên đã có sẵn trong bảng players chưa
  try {
    const { data: existing, error } = await supabase
      .from('players')
      .select('*')
      .ilike('name', trimmed)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && !error) {
      setPlayerId(existing.id);
      setLocalProgress(existing.level || 1, existing.deaths || 0);
      return {
        id: String(existing.id),
        name: existing.name,
        level: existing.level || 1,
        deaths: existing.deaths || 0,
        hasPlayed: true,
      };
    }
  } catch (e) {
    console.warn('[Supabase] Lỗi tìm theo tên:', e);
  }

  // 3. Người chơi mới: Không gửi id, để Supabase tự sinh (auto-gen)
  const newPayload = {
    name: trimmed,
    level: 1,
    deaths: 0,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('players')
      .insert(newPayload)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Lỗi tạo người chơi mới:', error.message);
    } else if (data) {
      setPlayerId(data.id);
      setLocalProgress(data.level || 1, data.deaths || 0);
      return {
        id: String(data.id),
        name: data.name,
        level: data.level || 1,
        deaths: data.deaths || 0,
        hasPlayed: true,
      };
    }
  } catch (e) {
    console.error('[Supabase] Lỗi kết nối khi tạo người chơi:', e);
  }

  // Fallback nếu không có mạng
  setLocalProgress(1, 0);
  return {
    id: '',
    name: trimmed,
    level: 1,
    deaths: 0,
    hasPlayed: true,
  };
}

// ─── Lưu tiến trình người chơi ───────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function savePlayerProgress(
  level: number,
  deaths: number,
  immediate = false
): Promise<void> {
  const name = getPlayerName();
  if (!name) return;

  const targetLevel = Math.max(1, level + 1); // 1-based level
  setLocalProgress(targetLevel, deaths);

  const doSave = async () => {
    const id = getPlayerId();
    const payload = {
      name,
      level: targetLevel,
      deaths,
      updated_at: new Date().toISOString(),
    };

    try {
      if (id) {
        // Cập nhật người chơi theo id auto-gen đã lưu
        const { error } = await supabase
          .from('players')
          .update(payload)
          .eq('id', id);

        if (error) {
          console.error('[Supabase] Lỗi khi cập nhật tiến trình:', error.message);
        }
      } else {
        // Nếu chưa có id, insert để Supabase auto-gen id
        const { data, error } = await supabase
          .from('players')
          .insert(payload)
          .select()
          .single();

        if (data?.id) {
          setPlayerId(data.id);
        }
        if (error) {
          console.error('[Supabase] Lỗi insert tiến trình mới:', error.message);
        }
      }
    } catch (e) {
      console.error('[Supabase] Lỗi mạng khi lưu:', e);
    }
  };

  if (immediate) {
    if (saveTimer) clearTimeout(saveTimer);
    await doSave();
  } else {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 1200);
  }
}

// ─── Tải tiến trình người chơi ───────────────────────────────────────────────

export async function loadPlayerProgress(): Promise<PlayerProfile> {
  const local = getLocalProgress();
  const id = getPlayerId();

  const fallback: PlayerProfile = {
    id,
    name: local.name,
    level: local.level,
    deaths: local.deaths,
    hasPlayed: Boolean(id || local.name),
  };

  if (id) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, level, deaths')
        .eq('id', id)
        .maybeSingle();

      if (data && !error) {
        // Không tự động ghi đè local ở đây để cho phép phát hiện sai lệch khi user can thiệp local
        return {
          id: String(data.id),
          name: data.name || local.name,
          level: data.level || 1,
          deaths: data.deaths || 0,
          hasPlayed: true,
        };
      }
    } catch (e) {
      console.warn('[Supabase] Không thể tải theo ID:', e);
    }
  }

  if (local.name) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, level, deaths')
        .ilike('name', local.name)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setPlayerId(data.id);
        return {
          id: String(data.id),
          name: data.name,
          level: data.level || 1,
          deaths: data.deaths || 0,
          hasPlayed: true,
        };
      }
    } catch (e) {
      console.warn('[Supabase] Không thể tải theo tên:', e);
    }
  }

  return fallback;
}

// ─── Kiểm tra đối soát Local vs Server ────────────────────────────────────────

export async function verifyLocalWithServer(): Promise<VerifyResult> {
  const localId = getPlayerId();
  const local = getLocalProgress();

  // 1. Người chơi mới (chưa có ID và chưa có tên)
  if (!localId && !local.name) {
    return { isMatch: true, isNewUser: true };
  }

  // 2. Nếu có tên nhưng chưa có ID trên máy này
  if (!localId && local.name) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .ilike('name', local.name)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return {
          isMatch: false,
          isNewUser: false,
          message: 'Không tìm thấy người chơi này trên máy chủ!',
          localData: local,
        };
      }

      setPlayerId(data.id);
      const isLevelMatch = local.level === data.level;
      const isDeathsMatch = local.deaths === data.deaths;

      if (!isLevelMatch || !isDeathsMatch) {
        return {
          isMatch: false,
          isNewUser: false,
          message: 'Tiến trình trên máy không khớp với dữ liệu trên máy chủ.',
          localData: local,
          serverData: { level: data.level, deaths: data.deaths, name: data.name },
        };
      }

      return {
        isMatch: true,
        isNewUser: false,
        serverData: { level: data.level, deaths: data.deaths, name: data.name },
      };
    } catch {
      return {
        isMatch: false,
        isNewUser: false,
        message: 'Lỗi mạng: Không thể kết nối với máy chủ để kiểm tra dữ liệu.',
        localData: local,
      };
    }
  }

  // 3. Có localId -> Truy vấn chính xác bản ghi trên Supabase
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, level, deaths')
      .eq('id', localId)
      .maybeSingle();

    if (error) {
      return {
        isMatch: false,
        isNewUser: false,
        message: `ID người chơi không hợp lệ (${error.message}). Có thể dữ liệu lưu trữ đã bị sửa đổi.`,
        localData: local,
      };
    }

    if (!data) {
      return {
        isMatch: false,
        isNewUser: false,
        message: 'Không tìm thấy người chơi trên máy chủ. ID trên máy có thể đã bị sửa.',
        localData: local,
      };
    }

    // So sánh dữ liệu Local vs Server
    const isLevelMatch = local.level === data.level;
    const isDeathsMatch = local.deaths === data.deaths;
    const isNameMatch = local.name.trim().toLowerCase() === (data.name || '').trim().toLowerCase();

    if (!isLevelMatch || !isDeathsMatch || !isNameMatch) {
      return {
        isMatch: false,
        isNewUser: false,
        message: 'Dữ liệu lưu trên máy (Local) không khớp với dữ liệu trên máy chủ (Server)!',
        localData: local,
        serverData: {
          level: data.level,
          deaths: data.deaths,
          name: data.name,
        },
      };
    }

    return {
      isMatch: true,
      isNewUser: false,
      serverData: {
        level: data.level,
        deaths: data.deaths,
        name: data.name,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
    return {
      isMatch: false,
      isNewUser: false,
      message: `Không thể kết nối đến máy chủ: ${msg}`,
      localData: local,
    };
  }
}

// ─── Đồng bộ Local theo Server ────────────────────────────────────────────────

export function syncLocalWithServer(serverData: { level: number; deaths: number; name: string }): void {
  setPlayerName(serverData.name);
  setLocalProgress(serverData.level, serverData.deaths);
}

// ─── Bảng xếp hạng ───────────────────────────────────────────────────────────

export async function fetchLeaderboard(): Promise<
  { data: Player[] } | { error: string }
> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, level, deaths, updated_at')
      .order('level', { ascending: false })
      .order('deaths', { ascending: true })
      .order('updated_at', { ascending: true })
      .limit(30);

    if (error) throw error;
    return { data: (data || []) as Player[] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Không thể tải bảng xếp hạng.';
    console.error('[Supabase] Lỗi tải bảng xếp hạng:', err);
    return { error: msg };
  }
}
