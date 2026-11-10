import { createClient } from '@supabase/supabase-js';
import {
  getSelectedSkin,
  setSelectedSkin,
  SKINS,
  setDbSkins,
  getDbSkins,
  resolveSkinSlug,
  resolveSkinUuid,
  type SkinDefinition,
  type SkinType,
} from './skins';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY trong file .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Avatar Presets ──────────────────────────────────────────────────────────

export const AVATAR_LIST = [
  '🎭', '🤡', '💀', '👻', '🤖', '🐱', '🐸', '🦊',
  '🥷', '👾', '🧙‍♂️', '👑', '😎', '🔥', '💩', '😈',
];
export const DEFAULT_AVATAR = '🎭';

// ─── Xử lý ảnh tải lên từ thiết bị (Resize & nén sang Base64) ───────────────

export function processAvatarImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WebP...)'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 128; // 128x128 vừa sắc nét vừa siêu nhẹ (< 15KB)
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Không thể xử lý ảnh trên trình duyệt.'));

        // Cắt vuông tâm ảnh (Center square crop)
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Lỗi khi đọc dữ liệu hình ảnh.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc file từ thiết bị.'));
    reader.readAsDataURL(file);
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Player {
  id?: string;
  name: string;
  avatar?: string;
  level: number;
  deaths: number;
  play_time?: number; // thời gian chơi/hoàn thành tính bằng giây (seconds)
  equipped_skin_id?: string;
  updated_at?: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  level: number;
  deaths: number;
  playTime: number; // tính bằng giây
  hasPlayed: boolean;
  equipped_skin_id?: string;
}

export interface VerifyResult {
  isMatch: boolean;
  isNewUser: boolean;
  message?: string;
  serverData?: { level: number; deaths: number; playTime: number; name: string; avatar?: string };
}

// ─── Format thời gian: Giây -> Giờ / Phút / Giây ─────────────────────────────

export function formatPlayTime(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (sec === 0) return '0 giây';

  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} giây`);

  return parts.join(' ');
}

// ─── Player Identity & Local Persistence ─────────────────────────────────────

export function getPlayerId(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem('puppet_player_id') || '';
}
export function syncUrlWithPlayer(id: string | number): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("p") !== String(id)) {
      url.searchParams.set("p", String(id));
      window.history.replaceState(null, "", url.toString());
    }
  } catch {
    // Ignore URL formatting issues
  }
}

export function setPlayerId(id: string | number): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("puppet_player_id", String(id));
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

export function getPlayerAvatar(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_AVATAR;
  return localStorage.getItem('puppet_player_avatar') || DEFAULT_AVATAR;
}

export function setPlayerAvatar(avatar: string): string {
  const clean = avatar || DEFAULT_AVATAR;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('puppet_player_avatar', clean);
  }
  return clean;
}

export function getLocalProgress(): {
  level: number;
  deaths: number;
  playTime: number;
  name: string;
  avatar: string;
} {
  if (typeof localStorage === 'undefined') {
    return { level: 1, deaths: 0, playTime: 0, name: '', avatar: DEFAULT_AVATAR };
  }
  return {
    level: Math.max(1, parseInt(localStorage.getItem('puppet_last_level') || '1', 10)),
    deaths: Math.max(0, parseInt(localStorage.getItem('puppet_last_deaths') || '0', 10)),
    playTime: Math.max(0, parseInt(localStorage.getItem('puppet_last_play_time') || '0', 10)),
    name: localStorage.getItem('puppet_player_name') || '',
    avatar: localStorage.getItem('puppet_player_avatar') || DEFAULT_AVATAR,
  };
}

export function setLocalProgress(
  level: number,
  deaths: number,
  playTime?: number,
  avatar?: string
): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('puppet_last_level', String(level));
    localStorage.setItem('puppet_last_deaths', String(deaths));
    if (playTime !== undefined) {
      localStorage.setItem('puppet_last_play_time', String(Math.floor(playTime)));
    }
    if (avatar) {
      localStorage.setItem('puppet_player_avatar', avatar);
    }
  }
}

export function clearPlayerSession(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('puppet_player_id');
    localStorage.removeItem('puppet_player_name');
    localStorage.removeItem('puppet_player_avatar');
    localStorage.removeItem('puppet_last_level');
    localStorage.removeItem('puppet_last_deaths');
    localStorage.removeItem('puppet_last_play_time');
    localStorage.removeItem('puppet_active_screen');
  }
}

// ─── Đăng ký hoặc khôi phục người chơi (Auto-gen ID & Avatar) ─────────────────

export async function registerOrFindPlayer(
  name: string,
  chosenAvatar?: string
): Promise<PlayerProfile> {
  const trimmed = (name || '').trim();
  const avatar = chosenAvatar || getPlayerAvatar();
  setPlayerName(trimmed);
  setPlayerAvatar(avatar);

  const localId = getPlayerId();

  // 1. Nếu trên máy đã có ID, cập nhật tên/avatar mới nếu đổi
  if (localId) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', localId)
        .maybeSingle();

      if (data && !error) {
        const updatePayload: Record<string, any> = {};
        if (data.name !== trimmed) updatePayload.name = trimmed;
        if (avatar && data.avatar !== avatar) updatePayload.avatar = avatar;

        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('players').update(updatePayload).eq('id', localId);
        }

        const timeVal = data.play_time || 0;
        const currentAvatar = avatar || data.avatar || DEFAULT_AVATAR;
        if (data.equipped_skin_id) {
          setSelectedSkin(data.equipped_skin_id);
        }
        setLocalProgress(data.level || 1, data.deaths || 0, timeVal, currentAvatar);
        return {
          id: String(data.id),
          name: trimmed,
          avatar: currentAvatar,
          level: data.level || 1,
          deaths: data.deaths || 0,
          playTime: timeVal,
          hasPlayed: true,
          equipped_skin_id: data.equipped_skin_id,
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
      const timeVal = existing.play_time || 0;
      const currentAvatar = existing.avatar || avatar || DEFAULT_AVATAR;
      setPlayerId(existing.id);
      if (existing.equipped_skin_id) {
        setSelectedSkin(existing.equipped_skin_id);
      }
      setLocalProgress(existing.level || 1, existing.deaths || 0, timeVal, currentAvatar);
      return {
        id: String(existing.id),
        name: existing.name,
        avatar: currentAvatar,
        level: existing.level || 1,
        deaths: existing.deaths || 0,
        playTime: timeVal,
        hasPlayed: true,
        equipped_skin_id: existing.equipped_skin_id,
      };
    }
  } catch (e) {
    console.warn('[Supabase] Lỗi tìm theo tên:', e);
  }

  // 3. Người chơi mới: Không gửi id, để Supabase tự sinh (auto-gen)
  const currentSkin = getSelectedSkin();
  const skinUuid = resolveSkinUuid(currentSkin);
  const newPayload = {
    name: trimmed,
    avatar,
    level: 1,
    deaths: 0,
    play_time: 0,
    equipped_skin_id: skinUuid || currentSkin,
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
      const av = data.avatar || avatar;
      setLocalProgress(data.level || 1, data.deaths || 0, 0, av);
      return {
        id: String(data.id),
        name: data.name,
        avatar: av,
        level: data.level || 1,
        deaths: data.deaths || 0,
        playTime: 0,
        hasPlayed: true,
      };
    }
  } catch (e) {
    console.error('[Supabase] Lỗi kết nối khi tạo người chơi:', e);
  }

  // Fallback nếu không có mạng
  setLocalProgress(1, 0, 0, avatar);
  return {
    id: '',
    name: trimmed,
    avatar,
    level: 1,
    deaths: 0,
    playTime: 0,
    hasPlayed: true,
  };
}

// ─── Cập nhật riêng Avatar ───────────────────────────────────────────────────

export async function updatePlayerAvatar(avatar: string): Promise<boolean> {
  const clean = setPlayerAvatar(avatar);
  const id = getPlayerId();
  if (!id) return true;
  try {
    const { error } = await supabase.from('players').update({ avatar: clean }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── Tải danh sách Skins trực tiếp từ Supabase Database ──────────────────────

export async function fetchSkinsFromDb(): Promise<SkinDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('skins')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return getDbSkins();
    }

    const mapped: SkinDefinition[] = data.map((row) => {
      const skinType: SkinType =
        row.unlock_type === 'level'
          ? 'level'
          : row.unlock_type === 'deaths'
            ? 'deaths'
            : row.unlock_type === 'free'
              ? 'free'
              : 'auto';

      return {
        id: String(row.id), // UUID chính thức từ backend Supabase (public.skins.id)
        uuid: String(row.id),
        slug: row.name, // Mã slug kỹ thuật: 'auto', 'wooden', 'ninja', 'box', 'thunder'...
        name: row.display_name || row.name,
        icon: row.icon || '👕',
        desc: row.description || '',
        type: skinType,
        reqValue: Number(row.req_value) || 0,
        previewColor: row.preview_color || '#8a7bff',
        effects: {
          move: row.effect_move || 'Vệt bước chân đặc trưng',
          jump: row.effect_jump || 'Phản lực bật nhảy đặc trưng',
          land: row.effect_land || 'Sóng xung kích tiếp đất đặc trưng',
        },
        sortOrder: Number(row.sort_order) || 0,
      };
    });

    setDbSkins(mapped);
    return mapped;
  } catch (err) {
    console.warn('[Supabase] Không thể tải danh sách skins từ DB, dùng cache:', err);
    return getDbSkins();
  }
}

// ─── Cập nhật riêng Trang phục Skin đang mặc ──────────────────────────────────

export async function updatePlayerSkin(skinId: string, skinUuid?: string): Promise<boolean> {
  setSelectedSkin(skinId);
  const id = getPlayerId();
  if (!id) return true;
  try {
    const uuid = skinUuid || resolveSkinUuid(skinId);
    const valueToTry = uuid || skinId;

    const { error } = await supabase
      .from('players')
      .update({
        equipped_skin_id: valueToTry,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error && uuid && valueToTry === uuid) {
      // Fallback về slug nếu DB schema varchar từ chối UUID
      const slug = resolveSkinSlug(skinId);
      await supabase
        .from('players')
        .update({
          equipped_skin_id: slug,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
    return !error;
  } catch (e) {
    console.warn('[Supabase] Lỗi mạng khi cập nhật skin:', e);
    return false;
  }
}

// ─── Lưu tiến trình người chơi ───────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function savePlayerProgress(
  level: number,
  deaths: number,
  playTime = 0,
  immediate = false
): Promise<void> {
  const name = getPlayerName();
  if (!name) return;
  const avatar = getPlayerAvatar();

  const targetLevel = Math.max(1, level + 1); // 1-based level
  const targetPlayTime = Math.max(0, Math.floor(playTime));
  setLocalProgress(targetLevel, deaths, targetPlayTime, avatar);

  const doSave = async () => {
    const id = getPlayerId();
    const payload = {
      name,
      avatar,
      level: targetLevel,
      deaths,
      play_time: targetPlayTime,
      equipped_skin_id: resolveSkinUuid(getSelectedSkin()) || getSelectedSkin(),
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
  // 1. Kiểm tra nếu có mã người chơi trên URL (deeplink / mở qua trình duyệt khác: ?p=... hoặc ?player=...)
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("p") || params.get("player") || params.get("id");
      if (urlId) {
        const { data, error } = await supabase
          .from("players")
          .select("id, name, avatar, level, deaths, play_time, equipped_skin_id")
          .eq("id", urlId)
          .maybeSingle();

        if (data && !error) {
          const av = data.avatar || DEFAULT_AVATAR;
          setPlayerId(data.id);
          setPlayerName(data.name);
          setPlayerAvatar(av);
          if (data.equipped_skin_id) {
            setSelectedSkin(data.equipped_skin_id);
          }
          setLocalProgress(data.level || 1, data.deaths || 0, data.play_time || 0, av);
          syncUrlWithPlayer(data.id);
          return {
            id: String(data.id),
            name: data.name,
            avatar: av,
            level: data.level || 1,
            deaths: data.deaths || 0,
            playTime: data.play_time || 0,
            hasPlayed: true,
            equipped_skin_id: data.equipped_skin_id,
          };
        }
      }
    } catch (err) {
      console.warn("[Supabase] Lỗi nhận diện player từ URL:", err);
    }
  }

  const local = getLocalProgress();
  const id = getPlayerId();

  const fallback: PlayerProfile = {
    id,
    name: local.name,
    avatar: local.avatar || DEFAULT_AVATAR,
    level: local.level,
    deaths: local.deaths,
    playTime: local.playTime,
    hasPlayed: Boolean(id || local.name),
    equipped_skin_id: getSelectedSkin(),
  };

  if (id) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, avatar, level, deaths, play_time, equipped_skin_id')
        .eq('id', id)
        .maybeSingle();

      if (data && !error) {
        const av = data.avatar || local.avatar || DEFAULT_AVATAR;
        setPlayerAvatar(av);
        if (data.equipped_skin_id) {
          setSelectedSkin(data.equipped_skin_id);
        }
        return {
          id: String(data.id),
          name: data.name || local.name,
          avatar: av,
          level: data.level || 1,
          deaths: data.deaths || 0,
          playTime: data.play_time || local.playTime || 0,
          hasPlayed: true,
          equipped_skin_id: data.equipped_skin_id,
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
        .select('id, name, avatar, level, deaths, play_time, equipped_skin_id')
        .ilike('name', local.name)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setPlayerId(data.id);
        const av = data.avatar || local.avatar || DEFAULT_AVATAR;
        setPlayerAvatar(av);
        if (data.equipped_skin_id) {
          setSelectedSkin(data.equipped_skin_id);
        }
        return {
          id: String(data.id),
          name: data.name,
          avatar: av,
          level: data.level || 1,
          deaths: data.deaths || 0,
          playTime: data.play_time || local.playTime || 0,
          hasPlayed: true,
          equipped_skin_id: data.equipped_skin_id,
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
          message: 'Dữ liệu tài khoản không hợp lệ hoặc không tìm thấy trên hệ thống.',
        };
      }

      setPlayerId(data.id);
      const isLevelMatch = local.level === data.level;
      const isDeathsMatch = local.deaths === data.deaths;

      if (!isLevelMatch || !isDeathsMatch) {
        return {
          isMatch: false,
          isNewUser: false,
          message: 'Dữ liệu trò chơi không đồng bộ hoặc đã bị thay đổi. Vui lòng đồng bộ lại để tiếp tục.',
          serverData: {
            level: data.level,
            deaths: data.deaths,
            playTime: data.play_time || 0,
            name: data.name,
            avatar: data.avatar || DEFAULT_AVATAR,
          },
        };
      }

      return {
        isMatch: true,
        isNewUser: false,
        serverData: {
          level: data.level,
          deaths: data.deaths,
          playTime: data.play_time || 0,
          name: data.name,
          avatar: data.avatar || DEFAULT_AVATAR,
        },
      };
    } catch {
      return {
        isMatch: false,
        isNewUser: false,
        message: 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.',
      };
    }
  }

  // 3. Có localId -> Truy vấn chính xác bản ghi trên Supabase
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, avatar, level, deaths, play_time')
      .eq('id', localId)
      .maybeSingle();

    if (error || !data) {
      return {
        isMatch: false,
        isNewUser: false,
        message: 'Dữ liệu tài khoản không hợp lệ hoặc đã bị thay đổi. Vui lòng thử lại.',
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
        message: 'Dữ liệu trò chơi không đồng bộ hoặc đã bị thay đổi. Vui lòng đồng bộ lại để tiếp tục.',
        serverData: {
          level: data.level,
          deaths: data.deaths,
          playTime: data.play_time || 0,
          name: data.name,
          avatar: data.avatar || DEFAULT_AVATAR,
        },
      };
    }

    return {
      isMatch: true,
      isNewUser: false,
      serverData: {
        level: data.level,
        deaths: data.deaths,
        playTime: data.play_time || 0,
        name: data.name,
        avatar: data.avatar || DEFAULT_AVATAR,
      },
    };
  } catch (err: unknown) {
    return {
      isMatch: false,
      isNewUser: false,
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
    };
  }
}

// ─── Đồng bộ Local theo Server ────────────────────────────────────────────────

export function syncLocalWithServer(serverData: {
  level: number;
  deaths: number;
  playTime?: number;
  name: string;
  avatar?: string;
}): void {
  setPlayerName(serverData.name);
  if (serverData.avatar) setPlayerAvatar(serverData.avatar);
  setLocalProgress(serverData.level, serverData.deaths, serverData.playTime, serverData.avatar);
}

// ─── Bảng xếp hạng ───────────────────────────────────────────────────────────

export async function fetchLeaderboard(): Promise<
  { data: Player[] } | { error: string }
> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, avatar, level, deaths, play_time, updated_at')
      .order('level', { ascending: false })
      .order('deaths', { ascending: true })
      .order('play_time', { ascending: true })
      .limit(100);

    if (error) throw error;
    return { data: (data || []) as Player[] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Không thể tải bảng xếp hạng.';
    console.error('[Supabase] Lỗi tải bảng xếp hạng:', err);
    return { error: msg };
  }
}

// ─── Khôi phục tài khoản bằng ID người chơi ──────────────────────────────────

export async function restoreAccountById(id: string): Promise<PlayerProfile> {
  const cleanId = (id || '').trim();
  if (!cleanId) {
    throw new Error('Vui lòng nhập hoặc dán mã ID người chơi!');
  }

  const { data, error } = await supabase
    .from('players')
    .select('id, name, avatar, level, deaths, play_time, equipped_skin_id')
    .eq('id', cleanId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Không tìm thấy người chơi nào khớp với mã ID này. Vui lòng kiểm tra lại!');
  }

  const av = data.avatar || DEFAULT_AVATAR;
  const timeVal = data.play_time || 0;
  setPlayerId(data.id);
  setPlayerName(data.name);
  setPlayerAvatar(av);
  if (data.equipped_skin_id) {
    setSelectedSkin(data.equipped_skin_id);
  }
  setLocalProgress(data.level || 1, data.deaths || 0, timeVal, av);

  return {
    id: String(data.id),
    name: data.name,
    avatar: av,
    level: data.level || 1,
    deaths: data.deaths || 0,
    playTime: timeVal,
    hasPlayed: true,
    equipped_skin_id: data.equipped_skin_id,
  };
}