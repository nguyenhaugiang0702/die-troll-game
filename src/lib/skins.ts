// ─── Hệ Thống Skin & Hiệu Ứng Nhân Vật Con Rối (Die Again) ──────────────────────

export type SkinType = 'auto' | 'free' | 'level' | 'deaths';

export interface SkinEffects {
  move: string;
  jump: string;
  land: string;
}

export interface SkinDefinition {
  id: string; // Khóa chính UUID từ Database Supabase (public.skins.id)
  slug: string; // Mã định danh kỹ thuật để render engine Canvas: 'auto', 'wooden', 'ninja', 'box'...
  uuid?: string; // Khóa UUID từ Database Supabase
  name: string; // Tên hiển thị (display_name từ DB)
  icon: string;
  desc: string;
  type: SkinType;
  reqValue?: number; // Màn yêu cầu hoặc Số lần chết yêu cầu
  previewColor: string;
  effects: SkinEffects;
  sortOrder?: number;
}

// Danh mục Skins: Khởi tạo rỗng, 100% dữ liệu được tải động từ Database Supabase
export const SKINS: SkinDefinition[] = [];

// Bộ nhớ đệm danh mục Skins trong client
let dbSkinsCache: SkinDefinition[] = [];
let memorySkinMap: Record<string, string> = {};

// Khởi tạo cache từ localStorage nếu có sẵn từ phiên trước
function initLocalSkinsCache(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const rawSkins = localStorage.getItem('puppet_db_skins');
    if (rawSkins) {
      const parsed = JSON.parse(rawSkins);
      if (Array.isArray(parsed) && parsed.length > 0) {
        dbSkinsCache = parsed;
        if (SKINS.length === 0) {
          SKINS.push(...parsed);
        }
      }
    }
    const rawMap = localStorage.getItem('puppet_skin_map');
    if (rawMap) {
      memorySkinMap = JSON.parse(rawMap);
    }
  } catch {
    // ignore
  }
}

initLocalSkinsCache();

// Cập nhật danh sách Skins từ Database vào bộ nhớ
export function setDbSkins(skins: SkinDefinition[]): void {
  dbSkinsCache = skins;
  SKINS.splice(0, SKINS.length, ...skins);

  // Xây dựng bản đồ ánh xạ hai chiều: UUID <-> Slug
  for (const s of skins) {
    const slug = s.slug || s.id;
    if (s.id) memorySkinMap[s.id] = slug;
    if (s.uuid) {
      memorySkinMap[s.uuid] = slug;
      memorySkinMap[`uuid_of_${slug}`] = s.uuid;
    }
    if (s.slug) {
      memorySkinMap[s.slug] = slug;
    }
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('puppet_db_skins', JSON.stringify(skins));
      localStorage.setItem('puppet_skin_map', JSON.stringify(memorySkinMap));
    } catch {
      // ignore
    }
  }
}

// Lấy danh sách Skins hiện tại (từ DB cache)
export function getDbSkins(): SkinDefinition[] {
  if (dbSkinsCache.length > 0) return dbSkinsCache;
  if (SKINS.length > 0) return SKINS;
  initLocalSkinsCache();
  return dbSkinsCache.length > 0 ? dbSkinsCache : SKINS;
}

// Lấy skin đang lưu trong localStorage
export function getSelectedSkin(): string {
  if (typeof localStorage === 'undefined') return 'auto';
  return localStorage.getItem('puppet_selected_skin') || 'auto';
}

// Lưu skin được chọn
export function setSelectedSkin(skinId: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('puppet_selected_skin', skinId);
  }
}

// Tìm skin theo bất kỳ mã nào (id UUID, uuid, hoặc slug)
export function findSkinByIdentifier(
  skinsList: SkinDefinition[] = getDbSkins(),
  idOrUuidOrSlug: string
): SkinDefinition | undefined {
  if (!idOrUuidOrSlug) return undefined;
  const list = skinsList && skinsList.length > 0 ? skinsList : getDbSkins();
  return list.find(
    (s) =>
      s.id === idOrUuidOrSlug ||
      (s.uuid && s.uuid === idOrUuidOrSlug) ||
      (s.slug && s.slug === idOrUuidOrSlug)
  );
}

// Chuyển UUID về skin slug (để engine Canvas luôn vẽ đúng)
export function resolveSkinSlug(
  idOrUuid: string,
  skinsList: SkinDefinition[] = getDbSkins()
): string {
  if (!idOrUuid || idOrUuid === 'auto') return 'auto';
  const found = findSkinByIdentifier(skinsList, idOrUuid);
  if (found) return found.slug || found.id;

  if (memorySkinMap[idOrUuid]) return memorySkinMap[idOrUuid];

  return idOrUuid;
}

// Lấy UUID tương ứng của skin (để gửi lên database Supabase)
export function resolveSkinUuid(
  idOrUuidOrSlug: string,
  skinsList: SkinDefinition[] = getDbSkins()
): string | undefined {
  if (!idOrUuidOrSlug) return undefined;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(idOrUuidOrSlug)) return idOrUuidOrSlug;

  const found = findSkinByIdentifier(skinsList, idOrUuidOrSlug);
  if (found?.uuid) return found.uuid;
  if (found?.id && uuidRegex.test(found.id)) return found.id;

  if (memorySkinMap[`uuid_of_${idOrUuidOrSlug}`]) {
    return memorySkinMap[`uuid_of_${idOrUuidOrSlug}`];
  }

  return undefined;
}

// Kiểm tra một skin đã được mở khóa chưa
export function isSkinUnlocked(skin: SkinDefinition, currentLevel: number, totalDeaths: number): boolean {
  if (skin.type === 'auto' || skin.type === 'free') return true;
  if (skin.type === 'level') {
    return (currentLevel || 1) >= (skin.reqValue || 1);
  }
  if (skin.type === 'deaths') {
    return (totalDeaths || 0) >= (skin.reqValue || 0);
  }
  return false;
}

// Xác định skin thực tế hiển thị khi chơi dựa trên dữ liệu DB (nếu là 'auto' thì tự đổi theo màn từ DB)
export function resolveActiveSkinId(
  selectedSkinId: string,
  levelNumber: number,
  skinsList: SkinDefinition[] = getDbSkins()
): string {
  const list = skinsList && skinsList.length > 0 ? skinsList : getDbSkins();
  const found = findSkinByIdentifier(list, selectedSkinId);
  const slug = found ? (found.slug || found.id) : resolveSkinSlug(selectedSkinId, list);

  if (slug && slug !== 'auto') {
    return slug;
  }

  // Tự động theo màn dựa trên danh sách skin từ DB
  const lv = Math.max(1, levelNumber || 1);
  const levelSkins = list
    .filter((s) => s.type === 'level' && typeof s.reqValue === 'number')
    .sort((a, b) => (b.reqValue || 0) - (a.reqValue || 0));

  for (const s of levelSkins) {
    if (lv >= (s.reqValue || 1)) {
      return s.slug || s.id;
    }
  }

  // Fallback an toàn nếu chưa tải kịp DB
  if (lv <= 10) return 'wooden';
  if (lv <= 20) return 'ninja';
  if (lv <= 30) return 'flame';
  if (lv <= 40) return 'frost';
  return 'golden';
}

// Tự động tìm skin phù hợp với mốc màn chơi (level)
export function getSkinForLevel(
  levelNumber: number,
  skinsList: SkinDefinition[] = getDbSkins()
): SkinDefinition | undefined {
  const list = skinsList && skinsList.length > 0 ? skinsList : getDbSkins();
  const exact = list.find((s) => s.type === 'level' && s.reqValue === levelNumber);
  if (exact) return exact;

  const levelSkins = list
    .filter((s) => s.type === 'level' && typeof s.reqValue === 'number')
    .sort((a, b) => (b.reqValue || 0) - (a.reqValue || 0));

  return levelSkins.find((s) => levelNumber >= (s.reqValue || 1));
}

// Kiểm tra xem khi tăng từ oldLevel lên newLevel có chạm mốc mở khóa skin level mới không (ví dụ: màn 20 qua 21)
export function checkMilestoneLevelSkin(
  oldLevel: number,
  newLevel: number,
  skinsList: SkinDefinition[] = getDbSkins()
): SkinDefinition | undefined {
  if (newLevel <= oldLevel) return undefined;
  const list = skinsList && skinsList.length > 0 ? skinsList : getDbSkins();
  return list.find(
    (s) =>
      s.type === 'level' &&
      typeof s.reqValue === 'number' &&
      s.reqValue > oldLevel &&
      s.reqValue <= newLevel
  );
}

// ─── Hệ Thống Hạt Hiệu Ứng (Skin Particle System) ──────────────────────────────

export interface SkinParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: 'circle' | 'square' | 'star' | 'ring' | 'smoke' | 'shard' | 'drop' | 'lightning';
  rotation?: number;
  vRot?: number;
  alpha?: number;
  gravity?: number;
  stroke?: boolean;
}

// 1. Hiệu ứng Di Chuyển (Move / Run)
export function spawnSkinMoveEffect(
  particles: SkinParticle[],
  x: number,
  y: number,
  facing: number,
  skinId: string,
  tick = 0
): void {
  const footX = x - facing * 5;
  const footY = y;

  if (skinId === 'wooden') {
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY,
      vx: -facing * (0.6 + Math.random() * 0.8),
      vy: -0.3 - Math.random() * 0.5,
      life: 14,
      maxLife: 14,
      size: 1.8 + Math.random() * 1.6,
      color: Math.random() > 0.5 ? '#d7c4a3' : '#bfa588',
      shape: 'circle',
      gravity: 0.08,
      alpha: 0.7,
    });
  } else if (skinId === 'ninja') {
    // Khói ánh trăng bạc & bóng đêm huyền ảo (nổi bật trên nền tối)
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY - 2,
      vx: -facing * (0.4 + Math.random() * 0.5),
      vy: -0.2 - Math.random() * 0.4,
      life: 16,
      maxLife: 16,
      size: 3.2 + Math.random() * 2.2,
      color: Math.random() > 0.4 ? 'rgba(188, 198, 220, 0.75)' : 'rgba(132, 120, 168, 0.8)',
      shape: 'smoke',
      gravity: -0.02,
      alpha: 0.75,
    });
    // Vệt lụa đỏ huyết kiếm phấp phới
    if (tick % 2 === 0) {
      particles.push({
        x: footX - facing * 4,
        y: footY - 5,
        vx: -facing * (0.8 + Math.random() * 0.5),
        vy: -0.3,
        life: 13,
        maxLife: 13,
        size: 2.4,
        color: '#ff4757',
        shape: 'shard',
        rotation: Math.random() * Math.PI,
        vRot: 0.12,
        gravity: 0.04,
        alpha: 0.9,
      });
    }
  } else if (skinId === 'flame') {
    // Tàn lửa than hồng bay bốc lên
    particles.push({
      x: footX + (Math.random() - 0.5) * 6,
      y: footY,
      vx: -facing * (0.3 + Math.random() * 0.6),
      vy: -0.8 - Math.random() * 1.2,
      life: 16,
      maxLife: 16,
      size: 2.2 + Math.random() * 2,
      color: Math.random() > 0.35 ? '#ffa502' : '#ff4757',
      shape: 'circle',
      gravity: -0.06,
      alpha: 0.9,
    });
    // Đốm lửa vàng li ti
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY - 2,
      vx: -facing * (0.2 + Math.random() * 0.4),
      vy: -1.3,
      life: 11,
      maxLife: 11,
      size: 1.4,
      color: '#ffd32a',
      shape: 'circle',
      gravity: -0.08,
      alpha: 0.95,
    });
  } else if (skinId === 'frost') {
    // Tinh thể tuyết & vụn băng pha lê
    particles.push({
      x: footX + (Math.random() - 0.5) * 5,
      y: footY,
      vx: -facing * (0.3 + Math.random() * 0.5),
      vy: -0.4 - Math.random() * 0.5,
      life: 16,
      maxLife: 16,
      size: 2.5 + Math.random() * 2,
      color: Math.random() > 0.5 ? '#ffffff' : '#70a1ff',
      shape: 'star',
      rotation: Math.random() * Math.PI,
      vRot: 0.06,
      gravity: 0.04,
      alpha: 0.85,
    });
  } else if (skinId === 'golden') {
    // Bụi vàng kim tuyến lấp lánh & ngôi sao
    particles.push({
      x: footX + (Math.random() - 0.5) * 6,
      y: footY,
      vx: -facing * (0.3 + Math.random() * 0.5),
      vy: -0.5 - Math.random() * 0.6,
      life: 18,
      maxLife: 18,
      size: 2.8 + Math.random() * 2.2,
      color: Math.random() > 0.4 ? '#ffd32a' : '#ffffff',
      shape: 'star',
      rotation: Math.random() * Math.PI,
      vRot: 0.09,
      gravity: 0.03,
      alpha: 0.95,
    });
  } else if (skinId === 'bruised') {
    // Giọt mồ hôi văng ra
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY - 4,
      vx: -facing * (0.5 + Math.random() * 0.6),
      vy: -0.6 - Math.random() * 0.5,
      life: 15,
      maxLife: 15,
      size: 2.2 + Math.random() * 1.4,
      color: '#74b9ff',
      shape: 'drop',
      gravity: 0.16,
      alpha: 0.85,
    });
  } else if (skinId === 'ghost') {
    // Khí ma quái bồng bềnh lơ lửng
    particles.push({
      x: footX + (Math.random() - 0.5) * 6,
      y: footY - 3,
      vx: Math.sin(tick * 0.2) * 0.5 - facing * 0.3,
      vy: -0.7 - Math.random() * 0.4,
      life: 20,
      maxLife: 20,
      size: 3.2 + Math.random() * 2.2,
      color: '#7bed9f',
      shape: 'smoke',
      gravity: -0.05,
      alpha: 0.75,
    });
  } else if (skinId === 'reaper') {
    // Tử khí tím dạ quang & đốm lửa địa ngục (tương phản mạnh trên nền tối)
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY - 2,
      vx: -facing * (0.4 + Math.random() * 0.5),
      vy: -0.5 - Math.random() * 0.4,
      life: 18,
      maxLife: 18,
      size: 3.5 + Math.random() * 2.2,
      color: Math.random() > 0.35 ? 'rgba(165, 94, 234, 0.85)' : 'rgba(136, 84, 208, 0.8)',
      shape: 'smoke',
      gravity: -0.04,
      alpha: 0.85,
    });
    // Tàn lửa linh hồn đỏ rực
    if (tick % 2 === 0) {
      particles.push({
        x: footX - facing * 4 + (Math.random() - 0.5) * 4,
        y: footY - 2,
        vx: -facing * 0.4 + (Math.random() - 0.5) * 0.4,
        vy: -0.5 - Math.random() * 0.5,
        life: 14,
        maxLife: 14,
        size: 2.0,
        color: '#ff3838',
        shape: 'circle',
        gravity: -0.05,
        alpha: 0.95,
      });
    }
  } else if (skinId === 'box') {
    // Vụn bìa carton, băng dính & xốp trắng lả tả
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY,
      vx: -facing * (0.5 + Math.random() * 0.6),
      vy: -0.4 - Math.random() * 0.5,
      life: 14,
      maxLife: 14,
      size: 2.2 + Math.random() * 1.5,
      color: Math.random() > 0.4 ? '#e1b12c' : '#f5cd79',
      shape: 'shard',
      rotation: Math.random() * Math.PI,
      vRot: 0.1,
      gravity: 0.08,
      alpha: 0.85,
    });
    if (tick % 2 === 0) {
      particles.push({
        x: footX + (Math.random() - 0.5) * 4,
        y: footY - 1,
        vx: -facing * 0.3,
        vy: -0.5,
        life: 12,
        maxLife: 12,
        size: 1.6,
        color: '#ffffff',
        shape: 'circle',
        gravity: 0.04,
        alpha: 0.9,
      });
    }
  } else if (skinId === 'chicken') {
    // Lông gà vàng óng & trắng muốt chao lượn rụng theo bước chạy
    const isGold = Math.random() > 0.5;
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY - 3,
      vx: -facing * (0.4 + Math.random() * 0.5),
      vy: -0.3 - Math.random() * 0.4,
      life: 18,
      maxLife: 18,
      size: 2.4 + Math.random() * 1.2,
      color: isGold ? '#f6b93b' : '#ffffff',
      shape: 'drop',
      rotation: Math.random() * Math.PI,
      vRot: isGold ? 0.08 : -0.07,
      gravity: 0.02,
      alpha: 0.95,
    });
    if (tick % 3 === 0) {
      particles.push({
        x: footX - facing * 3,
        y: footY,
        vx: -facing * 0.6,
        vy: -0.2,
        life: 10,
        maxLife: 10,
        size: 1.8,
        color: '#ff4757',
        shape: 'shard',
        gravity: 0.08,
        alpha: 0.9,
      });
    }
  } else if (skinId === 'zombie') {
    // Bong bóng độc dịch xanh neon sủi bọt & khói axit
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY - 2,
      vx: -facing * (0.3 + Math.random() * 0.4),
      vy: -0.6 - Math.random() * 0.5,
      life: 18,
      maxLife: 18,
      size: 2.5 + Math.random() * 1.8,
      color: Math.random() > 0.4 ? '#55efc4' : '#00cec9',
      shape: 'circle',
      gravity: -0.04,
      alpha: 0.9,
    });
    if (tick % 2 === 0) {
      particles.push({
        x: footX + (Math.random() - 0.5) * 6,
        y: footY,
        vx: -facing * 0.2,
        vy: 0.4,
        life: 14,
        maxLife: 14,
        size: 2.0,
        color: '#00b894',
        shape: 'drop',
        gravity: 0.12,
        alpha: 0.85,
      });
    }
  } else if (skinId === 'clown') {
    // Bóng xiếc mini rực rỡ & tàn pháo kim tuyến rơi rụng
    const clownColors = ['#ff7675', '#ffd32a', '#00cec9', '#a29bfe', '#ff9f43'];
    particles.push({
      x: footX + (Math.random() - 0.5) * 6,
      y: footY - 2,
      vx: -facing * (0.4 + Math.random() * 0.6),
      vy: -0.4 - Math.random() * 0.5,
      life: 16,
      maxLife: 16,
      size: 2.6 + Math.random() * 1.5,
      color: clownColors[Math.floor(Math.random() * clownColors.length)],
      shape: 'circle',
      gravity: 0.06,
      alpha: 0.95,
    });
    if (tick % 2 === 0) {
      particles.push({
        x: footX - facing * 4,
        y: footY - 4,
        vx: -facing * 0.5,
        vy: -0.5,
        life: 12,
        maxLife: 12,
        size: 2.0,
        color: '#ffeaa7',
        shape: 'star',
        rotation: tick * 0.1,
        alpha: 0.9,
      });
    }
  } else if (skinId === 'cyborg') {
    // Khối năng lượng Hologram Cyan/Magenta phân rã & tia lửa điện
    const isCyan = tick % 2 === 0;
    particles.push({
      x: footX + (Math.random() - 0.5) * 6,
      y: footY - 2,
      vx: -facing * (0.5 + Math.random() * 0.6),
      vy: -0.5 - Math.random() * 0.5,
      life: 16,
      maxLife: 16,
      size: 2.6 + Math.random() * 1.8,
      color: isCyan ? '#00f2fe' : '#ff007f',
      shape: 'square',
      rotation: Math.random() * Math.PI,
      vRot: 0.12,
      gravity: -0.02,
      alpha: 0.95,
    });
    // Tia chập điện hồ quang
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY - 1,
      vx: -facing * 0.3 + (Math.random() - 0.5) * 0.4,
      vy: -0.3,
      life: 10,
      maxLife: 10,
      size: 3.2,
      color: '#00f2fe',
      shape: 'lightning',
      rotation: Math.random() * Math.PI,
      alpha: 1,
    });
  } else if (skinId === 'thunder') {
    // Tia sét vàng xanh nổ lách tách & vệt hồ quang điện phát sáng
    particles.push({
      x: footX + (Math.random() - 0.5) * 6,
      y: footY - 2,
      vx: -facing * (0.6 + Math.random() * 0.8),
      vy: -0.4 - Math.random() * 0.6,
      life: 14,
      maxLife: 14,
      size: 4.5 + Math.random() * 2.2,
      color: Math.random() > 0.4 ? '#fff200' : '#00d2d3',
      shape: 'lightning',
      rotation: (Math.random() - 0.5) * 1.5,
      stroke: true,
      alpha: 1,
    });
    // Đốm plasma điện tích
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY,
      vx: -facing * 0.4,
      vy: -0.8 - Math.random() * 0.6,
      life: 12,
      maxLife: 12,
      size: 2.8,
      color: '#ffffff',
      shape: 'star',
      gravity: -0.06,
      alpha: 0.95,
    });
  } else if (skinId === 'angel') {
    // Dải bụi sao thiên giới vàng kim tuyến & lông vũ thần thánh
    particles.push({
      x: footX + (Math.random() - 0.5) * 6,
      y: footY - 2,
      vx: -facing * (0.3 + Math.random() * 0.5),
      vy: -0.5 - Math.random() * 0.5,
      life: 20,
      maxLife: 20,
      size: 3.2 + Math.random() * 1.8,
      color: '#f9ca24',
      shape: 'star',
      rotation: Math.random() * Math.PI,
      vRot: 0.08,
      gravity: 0.02,
      alpha: 0.95,
    });
    // Lông vũ thiên thần trắng muốt chao lượn
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY - 4,
      vx: -facing * 0.3 + Math.sin(tick * 0.2) * 0.4,
      vy: -0.3,
      life: 22,
      maxLife: 22,
      size: 2.8,
      color: '#ffffff',
      shape: 'drop',
      rotation: Math.sin(tick * 0.15) * 0.6,
      vRot: 0.05,
      gravity: 0.015,
      alpha: 0.95,
    });
  }
}

// 2. Hiệu ứng Khi Nhảy (Jump)
export function spawnSkinJumpEffect(
  particles: SkinParticle[],
  x: number,
  y: number,
  skinId: string
): void {
  const footY = y;

  if (skinId === 'wooden') {
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: footY,
        vx: (Math.random() - 0.5) * 3.5,
        vy: 0.5 + Math.random() * 2.2,
        life: 15,
        maxLife: 15,
        size: 2 + Math.random() * 2,
        color: Math.random() > 0.5 ? '#e5d7bd' : '#bfa588',
        shape: 'circle',
        gravity: 0.1,
        alpha: 0.8,
      });
    }
  } else if (skinId === 'ninja') {
    // Bom khói ánh trăng "Poof!" bạc & tím khói bốc lên rõ nét
    for (let i = 0; i < 9; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: footY - 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 2.8,
        life: 18,
        maxLife: 18,
        size: 4 + Math.random() * 3,
        color: i % 2 === 0 ? 'rgba(200, 214, 229, 0.85)' : 'rgba(140, 125, 180, 0.85)',
        shape: 'smoke',
        gravity: -0.02,
        alpha: 0.85,
      });
    }
    // Tia ám khí & phi tiêu lụa đỏ rực vụt xuống
    [-2, 0, 2].forEach((vx) => {
      particles.push({
        x: x + vx * 2,
        y: footY - 4,
        vx,
        vy: 2.4,
        life: 14,
        maxLife: 14,
        size: 2.8,
        color: '#ff4757',
        shape: 'shard',
        rotation: Math.PI / 4,
        gravity: 0.05,
        alpha: 0.95,
      });
    });
  } else if (skinId === 'flame') {
    // Phản lực lửa bốc cháy dữ dội đẩy tung người lên
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: footY,
        vx: (Math.random() - 0.5) * 3,
        vy: 1.5 + Math.random() * 3.2,
        life: 16,
        maxLife: 16,
        size: 2.5 + Math.random() * 2.8,
        color: i % 2 === 0 ? '#ff4757' : '#ffa502',
        shape: 'circle',
        gravity: 0.05,
        alpha: 0.95,
      });
    }
    // Vòng lửa bừng sáng
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0.5,
      life: 14,
      maxLife: 14,
      size: 4,
      color: '#ffa502',
      shape: 'ring',
      stroke: true,
      alpha: 0.8,
    });
  } else if (skinId === 'frost') {
    // Băng vỡ tung (Ice Shatter)
    for (let i = 0; i < 10; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: footY,
        vx: (Math.random() - 0.5) * 4.5,
        vy: 1.0 + Math.random() * 2.5,
        life: 16,
        maxLife: 16,
        size: 2.5 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? '#ffffff' : '#70a1ff',
        shape: 'shard',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
        gravity: 0.12,
        alpha: 0.9,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 14,
      maxLife: 14,
      size: 3,
      color: '#70a1ff',
      shape: 'ring',
      stroke: true,
      alpha: 0.75,
    });
  } else if (skinId === 'golden') {
    // Chùm pháo sao hoàng kim bung nở
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI / 12) * i + Math.PI * 0.25;
      const speed = 2.2 + Math.random() * 2;
      particles.push({
        x,
        y: footY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 18,
        maxLife: 18,
        size: 3.5 + Math.random() * 2.5,
        color: Math.random() > 0.3 ? '#ffd32a' : '#ffffff',
        shape: 'star',
        rotation: Math.random() * Math.PI,
        vRot: 0.1,
        gravity: 0.08,
        alpha: 0.95,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 15,
      maxLife: 15,
      size: 5,
      color: '#f5c542',
      shape: 'ring',
      stroke: true,
      alpha: 0.85,
    });
  } else if (skinId === 'bruised') {
    // Dồn sức nhảy: mồ hôi bắn tóe
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: footY - 8,
        vx: (Math.random() - 0.5) * 4.2,
        vy: (Math.random() - 0.5) * 3,
        life: 16,
        maxLife: 16,
        size: 2.4 + Math.random() * 1.6,
        color: '#74b9ff',
        shape: 'drop',
        gravity: 0.18,
        alpha: 0.9,
      });
    }
  } else if (skinId === 'ghost') {
    // Linh hồn xanh ngọc bay vút lên
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: footY,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -0.8 - Math.random() * 2,
        life: 20,
        maxLife: 20,
        size: 3.5 + Math.random() * 2.5,
        color: '#7bed9f',
        shape: 'smoke',
        gravity: -0.06,
        alpha: 0.8,
      });
    }
  } else if (skinId === 'reaper') {
    // Cụm tử khí tím dạ quang bùng nổ khi bật nhảy
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: footY,
        vx: (Math.random() - 0.5) * 3.5,
        vy: 1.0 + Math.random() * 2.5,
        life: 18,
        maxLife: 18,
        size: 3.8 + Math.random() * 2.5,
        color: i % 2 === 0 ? 'rgba(165, 94, 234, 0.85)' : 'rgba(190, 46, 221, 0.85)',
        shape: 'smoke',
        gravity: -0.02,
        alpha: 0.85,
      });
    }
    // Vòng ma pháp địa ngục đỏ rực
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 15,
      maxLife: 15,
      size: 4.5,
      color: '#ff3838',
      shape: 'ring',
      stroke: true,
      alpha: 0.95,
    });
    // Tàn lửa linh hồn đỏ bốc cháy
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: footY,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -0.5 - Math.random() * 1.5,
        life: 14,
        maxLife: 14,
        size: 2,
        color: '#ff4757',
        shape: 'circle',
        gravity: -0.03,
        alpha: 0.9,
      });
    }
  } else if (skinId === 'troll') {
    // Pháo hoa cầu vồng rực rỡ
    const colors = ['#ff3838', '#ff9f1a', '#ffd32a', '#2ed573', '#1e90ff', '#a55eea'];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const speed = 2.2 + Math.random() * 2.8;
      particles.push({
        x,
        y: footY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 0.5,
        life: 20,
        maxLife: 20,
        size: 3 + Math.random() * 2.5,
        color: colors[i % colors.length],
        shape: i % 2 === 0 ? 'star' : 'square',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.25,
        gravity: 0.1,
        alpha: 0.95,
      });
    }
  } else if (skinId === 'box') {
    // Bung nắp thùng carton! Miếng bìa carton & xốp trắng nẩy tưng tưng
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: footY,
        vx: (Math.random() - 0.5) * 4,
        vy: 1.2 + Math.random() * 2.4,
        life: 16,
        maxLife: 16,
        size: 2.8 + Math.random() * 2,
        color: i % 2 === 0 ? '#e1b12c' : '#f5cd79',
        shape: 'shard',
        rotation: Math.random() * Math.PI,
        gravity: 0.08,
        alpha: 0.9,
      });
    }
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: footY,
        vx: (Math.random() - 0.5) * 3,
        vy: 1.0 + Math.random() * 2.0,
        life: 14,
        maxLife: 14,
        size: 2,
        color: '#ffffff',
        shape: 'circle',
        gravity: 0.05,
        alpha: 0.95,
      });
    }
  } else if (skinId === 'chicken') {
    // Đập cánh "Cục tác!" bay vút, bão lông gà & đốm vàng bung tỏa
    for (let i = 0; i < 12; i++) {
      const isGold = i % 2 === 0;
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: footY,
        vx: (Math.random() - 0.5) * 3.8,
        vy: 0.8 + Math.random() * 2.5,
        life: 20,
        maxLife: 20,
        size: 3.0 + Math.random() * 1.5,
        color: isGold ? '#f6b93b' : '#ffffff',
        shape: 'drop',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.15,
        gravity: 0.02,
        alpha: 0.95,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 14,
      maxLife: 14,
      size: 4,
      color: '#f6b93b',
      shape: 'ring',
      stroke: true,
      alpha: 0.85,
    });
  } else if (skinId === 'zombie') {
    // Gầm rú bật nảy! Vụ nổ độc dịch axit xanh & vụn xương
    for (let i = 0; i < 10; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: footY,
        vx: (Math.random() - 0.5) * 3.5,
        vy: 1.0 + Math.random() * 2.5,
        life: 18,
        maxLife: 18,
        size: 3.5 + Math.random() * 2.5,
        color: i % 2 === 0 ? '#55efc4' : '#00cec9',
        shape: 'smoke',
        gravity: -0.03,
        alpha: 0.85,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 15,
      maxLife: 15,
      size: 4.8,
      color: '#00cec9',
      shape: 'ring',
      stroke: true,
      alpha: 0.95,
    });
  } else if (skinId === 'clown') {
    // Tung bóng rạp xiếc "BÙM"! Pháo giấy sao sắc màu bắn tung tóe
    const clownColors = ['#ff7675', '#ffd32a', '#00cec9', '#a29bfe', '#ff9f43', '#ffffff'];
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14;
      const speed = 2.0 + Math.random() * 2.5;
      particles.push({
        x,
        y: footY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 0.4,
        life: 18,
        maxLife: 18,
        size: 3.0 + Math.random() * 1.8,
        color: clownColors[i % clownColors.length],
        shape: i % 2 === 0 ? 'circle' : 'star',
        rotation: Math.random() * Math.PI,
        vRot: 0.15,
        gravity: 0.08,
        alpha: 0.95,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 14,
      maxLife: 14,
      size: 5,
      color: '#ff7675',
      shape: 'ring',
      stroke: true,
      alpha: 0.9,
    });
  } else if (skinId === 'cyborg') {
    // Phản lực Plasma cực đại! Vòng sóng siêu âm & laser hồng
    for (let i = 0; i < 14; i++) {
      const isCyan = i % 2 === 0;
      particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: footY,
        vx: (Math.random() - 0.5) * 4,
        vy: 2.0 + Math.random() * 2.8,
        life: 18,
        maxLife: 18,
        size: 3.2 + Math.random() * 2,
        color: isCyan ? '#00f2fe' : '#ff007f',
        shape: 'square',
        rotation: Math.random() * Math.PI,
        vRot: 0.15,
        gravity: -0.02,
        alpha: 0.95,
      });
    }
    // 2 vòng sóng xung kích kép Sonic
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 16,
      maxLife: 16,
      size: 4.5,
      color: '#00f2fe',
      shape: 'ring',
      stroke: true,
      alpha: 1,
    });
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 18,
      maxLife: 18,
      size: 6.5,
      color: '#ff007f',
      shape: 'ring',
      stroke: true,
      alpha: 0.9,
    });
    // Tia chập điện
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: footY,
        vx: (Math.random() - 0.5) * 3,
        vy: -0.5 - Math.random() * 1.5,
        life: 12,
        maxLife: 12,
        size: 4.0,
        color: '#00f2fe',
        shape: 'lightning',
        rotation: Math.random() * Math.PI,
        alpha: 1,
      });
    }
  } else if (skinId === 'thunder') {
    // Sét giáng từ trời! Chùm sét phân nhánh & vòng plasma nổ bùng
    for (let i = 0; i < 12; i++) {
      const isYellow = i % 2 === 0;
      particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: footY,
        vx: (Math.random() - 0.5) * 4.5,
        vy: 1.5 + Math.random() * 3.0,
        life: 16,
        maxLife: 16,
        size: 5.0 + Math.random() * 3.0,
        color: isYellow ? '#fff200' : '#00d2d3',
        shape: 'lightning',
        rotation: (Math.random() - 0.5) * Math.PI,
        stroke: true,
        alpha: 1,
      });
    }
    // Vòng ma trận điện tích Plasma cực lớn
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 18,
      maxLife: 18,
      size: 6.5,
      color: '#fff200',
      shape: 'ring',
      stroke: true,
      alpha: 1,
    });
    // Hạt sao điện tích chói lòa
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: footY,
        vx: (Math.random() - 0.5) * 3.5,
        vy: -0.8 - Math.random() * 2.0,
        life: 14,
        maxLife: 14,
        size: 3.2,
        color: '#ffffff',
        shape: 'star',
        gravity: -0.05,
        alpha: 1,
      });
    }
  } else if (skinId === 'angel') {
    // Cất cánh thăng hoa! Luồng hào quang vàng kim & bão lông vũ thánh
    for (let i = 0; i < 16; i++) {
      const isGold = i % 2 === 0;
      particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: footY,
        vx: (Math.random() - 0.5) * 4.0,
        vy: 1.0 + Math.random() * 3.2,
        life: 22,
        maxLife: 22,
        size: 3.5 + Math.random() * 2.5,
        color: isGold ? '#f9ca24' : '#fff3cd',
        shape: 'star',
        rotation: Math.random() * Math.PI,
        vRot: 0.1,
        gravity: -0.02,
        alpha: 0.95,
      });
    }
    // Lông vũ thiên thần trắng muốt bung nở
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: footY,
        vx: (Math.random() - 0.5) * 3.0,
        vy: -0.5 - Math.random() * 1.5,
        life: 24,
        maxLife: 24,
        size: 3.2,
        color: '#ffffff',
        shape: 'drop',
        rotation: Math.random() * Math.PI,
        vRot: 0.06,
        gravity: 0.015,
        alpha: 1,
      });
    }
    // Vòng thánh địa hoàng kim rực rỡ
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 20,
      maxLife: 20,
      size: 7.0,
      color: '#f9ca24',
      shape: 'ring',
      stroke: true,
      alpha: 1,
    });
  }
}

// 3. Hiệu ứng Khi Tiếp Đất (Landing)
export function spawnSkinLandEffect(
  particles: SkinParticle[],
  x: number,
  y: number,
  skinId: string,
  intensity = 1
): void {
  const footY = y;
  const countMult = Math.max(0.8, Math.min(intensity, 1.6));

  if (skinId === 'wooden') {
    const total = Math.floor(8 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 4,
        y: footY,
        vx: side * (1.8 + Math.random() * 2.8) * countMult,
        vy: -0.4 - Math.random() * 1.0,
        life: 16,
        maxLife: 16,
        size: 2.2 + Math.random() * 2.2,
        color: Math.random() > 0.5 ? '#f3e9d2' : '#bfa588',
        shape: 'circle',
        gravity: 0.1,
        alpha: 0.75,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 14,
      maxLife: 14,
      size: 6 * countMult,
      color: '#d7c4a3',
      shape: 'ring',
      stroke: true,
      alpha: 0.6,
    });
  } else if (skinId === 'ninja') {
    // Khói ánh trăng bạc & tím dạ hành tản nhanh sang hai bên
    const total = Math.floor(10 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 5,
        y: footY - 1,
        vx: side * (2.2 + Math.random() * 3.2) * countMult,
        vy: -0.3 - Math.random() * 0.8,
        life: 18,
        maxLife: 18,
        size: 4 + Math.random() * 3,
        color: i % 2 === 0 ? 'rgba(195, 207, 225, 0.82)' : 'rgba(135, 120, 175, 0.8)',
        shape: 'smoke',
        gravity: -0.02,
        alpha: 0.85,
      });
    }
    // Vệt đỏ sắc lướt ngang sàn
    [-1, 1].forEach((side) => {
      particles.push({
        x,
        y: footY - 1,
        vx: side * 3.8 * countMult,
        vy: -0.2,
        life: 13,
        maxLife: 13,
        size: 2.8,
        color: '#ff4757',
        shape: 'shard',
        rotation: 0,
        gravity: 0.02,
        alpha: 0.95,
      });
    });
  } else if (skinId === 'flame') {
    // Sóng nhiệt rực lửa & tia lửa tóe rực rỡ mặt đất
    const total = Math.floor(12 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 4,
        y: footY,
        vx: side * (2.0 + Math.random() * 3.5) * countMult,
        vy: -0.6 - Math.random() * 1.5,
        life: 18,
        maxLife: 18,
        size: 2.8 + Math.random() * 2.8,
        color: i % 2 === 0 ? '#ff4757' : '#ffa502',
        shape: 'circle',
        gravity: 0.05,
        alpha: 0.95,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 15,
      maxLife: 15,
      size: 7 * countMult,
      color: '#ff4757',
      shape: 'ring',
      stroke: true,
      alpha: 0.85,
    });
  } else if (skinId === 'frost') {
    // Vòng gai băng nứt toác & sương lạnh
    const total = Math.floor(10 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 4,
        y: footY,
        vx: side * (2.2 + Math.random() * 3.2) * countMult,
        vy: -0.4 - Math.random() * 1.2,
        life: 18,
        maxLife: 18,
        size: 3 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? '#ffffff' : '#70a1ff',
        shape: 'shard',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
        gravity: 0.08,
        alpha: 0.9,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 16,
      maxLife: 16,
      size: 7 * countMult,
      color: '#70a1ff',
      shape: 'ring',
      stroke: true,
      alpha: 0.8,
    });
  } else if (skinId === 'golden') {
    // Hào quang vương giả bừng sáng
    const total = Math.floor(12 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 4,
        y: footY,
        vx: side * (2.2 + Math.random() * 3.5) * countMult,
        vy: -0.6 - Math.random() * 1.4,
        life: 20,
        maxLife: 20,
        size: 3.5 + Math.random() * 2.5,
        color: Math.random() > 0.3 ? '#ffd32a' : '#ff4757',
        shape: 'star',
        rotation: Math.random() * Math.PI,
        vRot: 0.1,
        gravity: 0.06,
        alpha: 0.95,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 18,
      maxLife: 18,
      size: 8 * countMult,
      color: '#f5c542',
      shape: 'ring',
      stroke: true,
      alpha: 0.9,
    });
  } else if (skinId === 'bruised') {
    // Cú ngã chấn động mạnh & sao choáng váng 💫
    const total = Math.floor(8 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 4,
        y: footY,
        vx: side * (1.8 + Math.random() * 2.5) * countMult,
        vy: -0.8 - Math.random() * 1.5,
        life: 18,
        maxLife: 18,
        size: 3.0 + Math.random() * 2.0,
        color: '#74b9ff',
        shape: 'drop',
        gravity: 0.2,
        alpha: 0.9,
      });
    }
    // 3 ngôi sao choáng váng bay bập bồng
    [-2, 0, 2].forEach((vx, idx) => {
      particles.push({
        x: x + vx * 3,
        y: footY - 12,
        vx: vx * 0.6,
        vy: -1.2 - idx * 0.3,
        life: 22,
        maxLife: 22,
        size: 3.8,
        color: '#ffd32a',
        shape: 'star',
        rotation: 0,
        vRot: 0.15,
        gravity: 0.05,
        alpha: 0.95,
      });
    });
  } else if (skinId === 'ghost') {
    // Sương ma trôi lan êm đềm như không trọng lực
    const total = Math.floor(10 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 6,
        y: footY - 2,
        vx: side * (1.6 + Math.random() * 2.4) * countMult,
        vy: -0.2 - Math.random() * 0.4,
        life: 22,
        maxLife: 22,
        size: 4 + Math.random() * 3,
        color: '#7bed9f',
        shape: 'smoke',
        gravity: -0.03,
        alpha: 0.75,
      });
    }
  } else if (skinId === 'reaper') {
    // Tử khí tím địa ngục cuộn trào sang hai bên
    const total = Math.floor(10 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 5,
        y: footY - 1,
        vx: side * (2.2 + Math.random() * 3.2) * countMult,
        vy: -0.4 - Math.random() * 0.8,
        life: 20,
        maxLife: 20,
        size: 4.2 + Math.random() * 3,
        color: i % 2 === 0 ? 'rgba(165, 94, 234, 0.85)' : 'rgba(142, 68, 173, 0.8)',
        shape: 'smoke',
        gravity: -0.03,
        alpha: 0.85,
      });
    }
    // Vòng ma pháp địa ngục đỏ rực lan tỏa mạnh
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 18,
      maxLife: 18,
      size: 7.5 * countMult,
      color: '#ff3838',
      shape: 'ring',
      stroke: true,
      alpha: 0.95,
    });
    // Tàn lửa linh hồn bốc lên từ mặt đất
    for (let i = 0; i < 4; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * (3 + Math.random() * 8),
        y: footY,
        vx: side * (0.5 + Math.random() * 1.2),
        vy: -0.8 - Math.random() * 1.2,
        life: 16,
        maxLife: 16,
        size: 2.2,
        color: '#ff3838',
        shape: 'circle',
        gravity: -0.05,
        alpha: 0.9,
      });
    }
  } else if (skinId === 'troll') {
    // Bữa tiệc Party Confetti bung nổ sắc màu khắp sàn
    const colors = ['#ff3838', '#ff9f1a', '#ffd32a', '#2ed573', '#1e90ff', '#a55eea'];
    const total = Math.floor(16 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 4,
        y: footY,
        vx: side * (2.4 + Math.random() * 3.8) * countMult,
        vy: -0.8 - Math.random() * 2.0,
        life: 22,
        maxLife: 22,
        size: 3.2 + Math.random() * 2.6,
        color: colors[i % colors.length],
        shape: i % 2 === 0 ? 'square' : 'star',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.3,
        gravity: 0.12,
        alpha: 0.95,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 16,
      maxLife: 16,
      size: 8 * countMult,
      color: '#ffd32a',
      shape: 'ring',
      stroke: true,
      alpha: 0.9,
    });
  } else if (skinId === 'box') {
    // Rơi bịch xuống sàn, vụn bìa & mút xốp văng dạt hai bên
    const total = Math.floor(10 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 4,
        y: footY - 1,
        vx: side * (2.0 + Math.random() * 3.0) * countMult,
        vy: -0.4 - Math.random() * 0.8,
        life: 16,
        maxLife: 16,
        size: 3.0 + Math.random() * 2.0,
        color: i % 2 === 0 ? '#e1b12c' : '#f5cd79',
        shape: 'shard',
        rotation: Math.random() * Math.PI,
        gravity: 0.08,
        alpha: 0.9,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 14,
      maxLife: 14,
      size: 6.0 * countMult,
      color: '#e1b12c',
      shape: 'ring',
      stroke: true,
      alpha: 0.85,
    });
  } else if (skinId === 'chicken') {
    // Hạ cánh tấu hài bẹp dí, lông vũ & bụi vàng bay tứ tán
    const total = Math.floor(12 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const isGold = i % 2 === 0;
      particles.push({
        x: x + side * 4,
        y: footY - 1,
        vx: side * (2.2 + Math.random() * 3.2) * countMult,
        vy: -0.3 - Math.random() * 0.7,
        life: 20,
        maxLife: 20,
        size: 3.0 + Math.random() * 1.5,
        color: isGold ? '#f6b93b' : '#ffffff',
        shape: 'drop',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
        gravity: 0.02,
        alpha: 0.95,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 15,
      maxLife: 15,
      size: 6.5 * countMult,
      color: '#f6b93b',
      shape: 'ring',
      stroke: true,
      alpha: 0.9,
    });
  } else if (skinId === 'zombie') {
    // Sóng axit xanh neon dạt sàn kèm vòng độc dịch chói lọi
    const total = Math.floor(12 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 5,
        y: footY - 1,
        vx: side * (2.4 + Math.random() * 3.4) * countMult,
        vy: -0.3 - Math.random() * 0.6,
        life: 20,
        maxLife: 20,
        size: 3.8 + Math.random() * 2.5,
        color: i % 2 === 0 ? '#55efc4' : '#00cec9',
        shape: 'smoke',
        gravity: -0.02,
        alpha: 0.85,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 16,
      maxLife: 16,
      size: 7.0 * countMult,
      color: '#00cec9',
      shape: 'ring',
      stroke: true,
      alpha: 0.95,
    });
  } else if (skinId === 'clown') {
    // Kèn bóp "Bí bo!", vòng sóng sắc màu rực rỡ & bóng nảy tưng bừng
    const clownColors = ['#ff7675', '#ffd32a', '#00cec9', '#a29bfe', '#ff9f43', '#ffffff'];
    const total = Math.floor(16 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 4,
        y: footY,
        vx: side * (2.4 + Math.random() * 3.5) * countMult,
        vy: -0.7 - Math.random() * 1.8,
        life: 20,
        maxLife: 20,
        size: 3.2 + Math.random() * 2.2,
        color: clownColors[i % clownColors.length],
        shape: i % 2 === 0 ? 'circle' : 'star',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.3,
        gravity: 0.1,
        alpha: 0.95,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 16,
      maxLife: 16,
      size: 7.5 * countMult,
      color: '#ff7675',
      shape: 'ring',
      stroke: true,
      alpha: 0.9,
    });
  } else if (skinId === 'cyborg') {
    // Sóng xung kích ma trận kỹ thuật số EMP chấn động mặt sàn
    const total = Math.floor(16 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const isCyan = i % 2 === 0;
      particles.push({
        x: x + side * 5,
        y: footY,
        vx: side * (2.8 + Math.random() * 4.0) * countMult,
        vy: -0.6 - Math.random() * 1.5,
        life: 20,
        maxLife: 20,
        size: 3.5 + Math.random() * 2.2,
        color: isCyan ? '#00f2fe' : '#ff007f',
        shape: 'square',
        rotation: Math.random() * Math.PI,
        vRot: 0.2,
        gravity: 0.05,
        alpha: 0.95,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 18,
      maxLife: 18,
      size: 8.5 * countMult,
      color: '#00f2fe',
      shape: 'ring',
      stroke: true,
      alpha: 1,
    });
    // Hồ quang chập điện
    for (let i = 0; i < 4; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * (4 + Math.random() * 10),
        y: footY - 1,
        vx: side * 1.5,
        vy: -0.4,
        life: 14,
        maxLife: 14,
        size: 4.0,
        color: '#ff007f',
        shape: 'lightning',
        rotation: Math.random() * Math.PI,
        alpha: 1,
      });
    }
  } else if (skinId === 'thunder') {
    // Sấm sét rung trời! Sóng điện từ sét nổ tung chạy dọc mặt sàn
    const total = Math.floor(16 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const isYellow = i % 2 === 0;
      particles.push({
        x: x + side * 5,
        y: footY - 1,
        vx: side * (3.0 + Math.random() * 4.5) * countMult,
        vy: -0.5 - Math.random() * 1.2,
        life: 18,
        maxLife: 18,
        size: 5.5 + Math.random() * 3.0,
        color: isYellow ? '#fff200' : '#00d2d3',
        shape: 'lightning',
        rotation: (Math.random() - 0.5) * Math.PI,
        stroke: true,
        alpha: 1,
      });
    }
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 20,
      maxLife: 20,
      size: 9.0 * countMult,
      color: '#fff200',
      shape: 'ring',
      stroke: true,
      alpha: 1,
    });
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * (5 + Math.random() * 12),
        y: footY,
        vx: side * 1.2,
        vy: -0.8 - Math.random() * 1.5,
        life: 16,
        maxLife: 16,
        size: 3.5,
        color: '#ffffff',
        shape: 'star',
        gravity: -0.04,
        alpha: 1,
      });
    }
  } else if (skinId === 'angel') {
    // Giáng trần uy nghi! Vòng thánh địa rực rỡ, sóng bụi sao kim tuyến
    const total = Math.floor(18 * countMult);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 5,
        y: footY - 1,
        vx: side * (2.8 + Math.random() * 4.2) * countMult,
        vy: -0.6 - Math.random() * 1.6,
        life: 24,
        maxLife: 24,
        size: 3.8 + Math.random() * 2.8,
        color: i % 2 === 0 ? '#f9ca24' : '#fff3cd',
        shape: 'star',
        rotation: Math.random() * Math.PI,
        vRot: 0.12,
        gravity: 0.04,
        alpha: 1,
      });
    }
    // Lông vũ thiên thần dạt rộng
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      particles.push({
        x: x + side * 4,
        y: footY - 2,
        vx: side * (1.8 + Math.random() * 2.5) * countMult,
        vy: -0.4 - Math.random() * 0.8,
        life: 26,
        maxLife: 26,
        size: 3.4,
        color: '#ffffff',
        shape: 'drop',
        rotation: Math.random() * Math.PI,
        vRot: 0.08,
        gravity: 0.015,
        alpha: 1,
      });
    }
    // Vòng hào quang thánh thiện hoàng kim kép
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 22,
      maxLife: 22,
      size: 9.5 * countMult,
      color: '#f9ca24',
      shape: 'ring',
      stroke: true,
      alpha: 1,
    });
    particles.push({
      x,
      y: footY,
      vx: 0,
      vy: 0,
      life: 20,
      maxLife: 20,
      size: 6.5 * countMult,
      color: '#ffffff',
      shape: 'ring',
      stroke: true,
      alpha: 0.85,
    });
  }
}

// Hàm vẽ ngôi sao 4 cánh lấp lánh (Sparkle Star)
function drawSparkleStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rot = 0): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 4. Hàm cập nhật & vẽ tất cả các hạt Skin Particle
export function renderSkinParticles(
  ctx: CanvasRenderingContext2D,
  particles: SkinParticle[]
): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life--;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    // Cập nhật vị trí & vận tốc
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity ?? 0.1;
    if (p.vRot) {
      p.rotation = (p.rotation || 0) + p.vRot;
    }

    const progress = p.life / p.maxLife;
    const alpha = (p.alpha ?? 1) * Math.min(1, progress * 1.2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (p.shape === 'star') {
      ctx.fillStyle = p.color;
      drawSparkleStar(ctx, p.x, p.y, p.size * (0.5 + progress * 0.5), p.rotation || 0);
    } else if (p.shape === 'square') {
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation || 0);
      const half = p.size / 2;
      ctx.fillRect(-half, -half, p.size, p.size);
    } else if (p.shape === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.8;
      const currentRadius = p.size * (1 + (1 - progress) * 3);
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.shape === 'smoke') {
      ctx.fillStyle = p.color;
      const smokeRadius = p.size * (0.8 + (1 - progress) * 1.2);
      ctx.beginPath();
      ctx.arc(p.x, p.y, smokeRadius, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'shard') {
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation || 0);
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.6, 0);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size * 0.6, 0);
      ctx.closePath();
      ctx.fill();
    } else if (p.shape === 'drop') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI);
      ctx.lineTo(p.x, p.y - p.size * 1.5);
      ctx.closePath();
      ctx.fill();
    } else if (p.shape === 'lightning') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.stroke ? 2.5 : 1.8;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation || 0);
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.4, -p.size * 0.3);
      ctx.lineTo(-p.size * 0.3, 0);
      ctx.lineTo(p.size * 0.5, p.size * 0.4);
      ctx.lineTo(0, p.size);
      ctx.stroke();
    } else {
      // Default: circle
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + progress * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ─── Hàm Vẽ Nhân Vật Con Rối Theo Skin ────────────────────────────────────────

export function drawPuppetSkin(
  x: CanvasRenderingContext2D,
  cx: number,
  y: number,
  s: number,
  o: number,
  f: number, // hướng nhìn: -1 (trái) hoặc 1 (phải)
  skinId: string,
  tick = 0,
  scaleX = 1,
  scaleY = 1
): void {
  x.save();

  // Biến dạng co giãn (Squash & Stretch) quanh gốc chân
  if (scaleX !== 1 || scaleY !== 1) {
    x.translate(cx, y + 34);
    x.scale(scaleX, scaleY);
    x.translate(-cx, -(y + 34));
  }

  // 1. Vẽ dây rối
  let stringColor = '#8a7bff55';
  let stringWidth = 1;

  if (skinId === 'ninja') {
    stringColor = 'rgba(100, 100, 140, 0.45)';
  } else if (skinId === 'flame') {
    stringColor = '#ffa50288';
  } else if (skinId === 'frost') {
    stringColor = '#70a1ff77';
  } else if (skinId === 'golden') {
    stringColor = '#f5c54299';
    stringWidth = 1.2;
  } else if (skinId === 'ghost') {
    stringColor = 'rgba(123, 237, 159, 0.4)';
  } else if (skinId === 'reaper') {
    stringColor = 'rgba(138, 86, 172, 0.55)';
  } else if (skinId === 'troll') {
    const hue = Math.floor((tick * 3) % 360);
    stringColor = `hsla(${hue}, 100%, 65%, 0.75)`;
    stringWidth = 1.5;
  } else if (skinId === 'box') {
    stringColor = 'rgba(225, 177, 44, 0.55)';
  } else if (skinId === 'chicken') {
    stringColor = 'rgba(246, 185, 59, 0.65)';
  } else if (skinId === 'zombie') {
    stringColor = 'rgba(0, 206, 201, 0.6)';
  } else if (skinId === 'clown') {
    stringColor = 'rgba(255, 118, 117, 0.65)';
  } else if (skinId === 'cyborg') {
    stringColor = 'rgba(0, 242, 254, 0.8)';
    stringWidth = 1.3;
  } else if (skinId === 'thunder') {
    stringColor = 'rgba(255, 242, 0, 0.85)';
    stringWidth = 1.4;
  } else if (skinId === 'angel') {
    stringColor = 'rgba(249, 202, 36, 0.85)';
    stringWidth = 1.5;
  }

  x.strokeStyle = stringColor;
  x.lineWidth = stringWidth;
  [[-6, 0], [0, -8], [6, 0]].forEach(([a, b]) => {
    x.beginPath();
    x.moveTo(cx + a, y + (b ? 4 : 14));
    x.lineTo(cx + a * 2, 0);
    x.stroke();
  });

  // 2. Thiết lập màu sắc & hiệu ứng thân thể
  let bodyColor = '#f3e9d2';
  let eyeColor = '#201b33';
  let lineWidth = 3;

  if (skinId === 'ninja') {
    bodyColor = '#4a446a';
    eyeColor = '#ffffff';
    lineWidth = 3.5;
    x.shadowBlur = 8;
    x.shadowColor = 'rgba(255, 71, 87, 0.75)';
  } else if (skinId === 'flame') {
    bodyColor = '#ff6348';
    eyeColor = '#ffeaa7';
    x.shadowBlur = 8;
    x.shadowColor = '#ff4757';
  } else if (skinId === 'frost') {
    bodyColor = '#70a1ff';
    eyeColor = '#ffffff';
    x.shadowBlur = 6;
    x.shadowColor = '#70a1ff';
  } else if (skinId === 'golden') {
    bodyColor = '#f5c542';
    eyeColor = '#1e272e';
    lineWidth = 3.5;
    x.shadowBlur = 7;
    x.shadowColor = '#f5c542';
  } else if (skinId === 'bruised') {
    bodyColor = '#dcd0ff';
    eyeColor = '#201b33';
  } else if (skinId === 'ghost') {
    bodyColor = '#7bed9f';
    eyeColor = '#ffffff';
    x.globalAlpha = 0.7 + Math.sin(tick * 0.1) * 0.2;
    x.shadowBlur = 10;
    x.shadowColor = '#2ed573';
  } else if (skinId === 'reaper') {
    bodyColor = '#3a2b58';
    eyeColor = '#ff3838';
    lineWidth = 3.5;
    x.shadowBlur = 10;
    x.shadowColor = '#ff3838';
  } else if (skinId === 'troll') {
    const hue = Math.floor((tick * 4) % 360);
    bodyColor = `hsl(${hue}, 100%, 65%)`;
    eyeColor = '#ffffff';
    x.shadowBlur = 10;
    x.shadowColor = bodyColor;
  } else if (skinId === 'box') {
    bodyColor = '#e1b12c';
    eyeColor = '#201b33';
    lineWidth = 3;
    x.shadowBlur = 6;
    x.shadowColor = '#e1b12c';
  } else if (skinId === 'chicken') {
    bodyColor = '#ffffff';
    eyeColor = '#201b33';
    lineWidth = 3;
    x.shadowBlur = 8;
    x.shadowColor = '#f6b93b';
  } else if (skinId === 'zombie') {
    bodyColor = '#55efc4';
    eyeColor = '#ffeaa7';
    lineWidth = 3.5;
    x.shadowBlur = 10;
    x.shadowColor = '#00cec9';
  } else if (skinId === 'clown') {
    bodyColor = '#ffffff';
    eyeColor = '#201b33';
    lineWidth = 3;
    x.shadowBlur = 8;
    x.shadowColor = '#ff7675';
  } else if (skinId === 'cyborg') {
    bodyColor = '#dfe6e9';
    eyeColor = '#00f2fe';
    lineWidth = 3.5;
    x.shadowBlur = 11;
    x.shadowColor = '#00f2fe';
  } else if (skinId === 'thunder') {
    bodyColor = '#fff200';
    eyeColor = '#ffffff';
    lineWidth = 3.5;
    x.shadowBlur = 14 + Math.sin(tick * 0.3) * 3;
    x.shadowColor = '#fed330';
  } else if (skinId === 'angel') {
    bodyColor = '#ffffff';
    eyeColor = '#f9ca24';
    lineWidth = 3.5;
    x.shadowBlur = 16;
    x.shadowColor = '#f6e58d';
  }

  x.strokeStyle = bodyColor;
  x.fillStyle = bodyColor;
  x.lineWidth = lineWidth;
  x.lineCap = 'round';

  // Áo choàng sau lưng (cho Golden & Reaper & Angel)
  if (skinId === 'golden') {
    x.strokeStyle = '#8854d0';
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(cx - f * 2, y + 15);
    x.lineTo(cx - f * 8, y + 28);
    x.stroke();
    x.strokeStyle = bodyColor;
    x.lineWidth = lineWidth;
  } else if (skinId === 'reaper') {
    // Cán Lưỡi hái sau lưng (tím huyền bí & ánh vàng)
    x.strokeStyle = '#a55eea';
    x.lineWidth = 2.2;
    x.beginPath();
    x.moveTo(cx - f * 8, y + 30);
    x.lineTo(cx + f * 5, y + 4);
    x.stroke();
    // Lưỡi liềm bạc sáng bóng sắc bén
    x.strokeStyle = '#ffffff';
    x.lineWidth = 2;
    x.fillStyle = '#f1f2f6';
    x.beginPath();
    x.arc(cx + f * 4, y + 5, 8, -Math.PI / 2, 0, f < 0);
    x.stroke();
    // Ánh đỏ đẫm huyết nguyệt ở chóp lưỡi hái
    x.fillStyle = '#ff3838';
    x.beginPath();
    x.arc(cx + f * 4, y - 3, 2, 0, 7);
    x.fill();

    x.strokeStyle = bodyColor;
    x.fillStyle = bodyColor;
    x.lineWidth = lineWidth;
  } else if (skinId === 'angel') {
    // Đôi cánh thiên thần thánh thiện sau lưng đập nhẹ nhàng
    const flap = Math.sin(tick * 0.2) * 4;
    x.fillStyle = '#ffffff';
    x.strokeStyle = '#f9ca24';
    x.lineWidth = 1.8;
    // Cánh sau
    x.beginPath();
    x.moveTo(cx - f * 2, y + 16);
    x.quadraticCurveTo(cx - f * 14, y + 6 + flap, cx - f * 16, y + 18 + flap);
    x.quadraticCurveTo(cx - f * 10, y + 22, cx - f * 2, y + 22);
    x.fill();
    x.stroke();
    // Cánh trước
    x.beginPath();
    x.moveTo(cx - f * 2, y + 17);
    x.quadraticCurveTo(cx - f * 11, y + 9 + flap, cx - f * 13, y + 23 + flap);
    x.quadraticCurveTo(cx - f * 6, y + 25, cx - f * 2, y + 22);
    x.fill();
    x.stroke();
    x.strokeStyle = bodyColor;
    x.lineWidth = lineWidth;
  }

  // Đầu
  x.beginPath();
  x.arc(cx, y + 7, 7, 0, 7);
  x.fill();

  // Thân
  x.beginPath();
  x.moveTo(cx, y + 14);
  x.lineTo(cx, y + 24);

  // Chiếc thùng carton bao bọc thân thể (nếu là skin box)
  if (skinId === 'box') {
    x.fillStyle = '#d29b55';
    x.fillRect(cx - 8, y + 11, 16, 14);
    x.strokeStyle = '#b7791f';
    x.lineWidth = 1.6;
    x.strokeRect(cx - 8, y + 11, 16, 14);
    // Băng keo dán thùng
    x.fillStyle = '#f5cd79';
    x.fillRect(cx - 8, y + 16, 16, 3.5);
    // Viền mép nắp thùng
    x.strokeStyle = '#965917';
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(cx - 8, y + 14);
    x.lineTo(cx + 8, y + 14);
    x.stroke();
    x.strokeStyle = bodyColor;
    x.lineWidth = lineWidth;
  }

  // Cánh gà nhỏ trên thân (nếu là chicken)
  if (skinId === 'chicken') {
    x.strokeStyle = '#f6b93b';
    x.lineWidth = 2.2;
    const wingFlap = Math.sin(tick * 0.3) * 4;
    x.beginPath();
    x.moveTo(cx - f * 2, y + 16);
    x.quadraticCurveTo(cx - f * 8, y + 18 + wingFlap, cx - f * 4, y + 24);
    x.stroke();
    x.strokeStyle = bodyColor;
    x.lineWidth = lineWidth;
  }

  // Lõi lò phản ứng Cyberpunk trên ngực (nếu là cyborg)
  if (skinId === 'cyborg') {
    x.fillStyle = '#ff007f';
    x.beginPath();
    x.arc(cx, y + 19, 2.2, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#00f2fe';
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(cx, y + 15);
    x.lineTo(cx, y + 17);
    x.moveTo(cx, y + 21);
    x.lineTo(cx, y + 24);
    x.stroke();
    x.strokeStyle = bodyColor;
    x.lineWidth = lineWidth;
  }

  // Vệt điện trường sấm sét trên ngực (nếu là thunder)
  if (skinId === 'thunder') {
    x.strokeStyle = '#00d2d3';
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(cx, y + 16);
    x.lineTo(cx + Math.sin(tick * 0.5) * 5, y + 20);
    x.lineTo(cx, y + 24);
    x.stroke();
    x.strokeStyle = bodyColor;
    x.lineWidth = lineWidth;
  }

  // Dải lụa thiên thần vắt chéo ngực (nếu là angel)
  if (skinId === 'angel') {
    x.strokeStyle = '#f9ca24';
    x.lineWidth = 1.8;
    x.beginPath();
    x.moveTo(cx - 3, y + 15);
    x.lineTo(cx + 3, y + 23);
    x.stroke();
    x.strokeStyle = bodyColor;
    x.lineWidth = lineWidth;
  }

  // Tay (Zombie duỗi thẳng về phía trước, các skin khác tay vung)
  if (skinId === 'zombie') {
    const reach = Math.sin(tick * 0.15) * 2;
    x.beginPath();
    x.moveTo(cx, y + 16);
    x.lineTo(cx + f * 11, y + 15 + reach);
    x.moveTo(cx, y + 18);
    x.lineTo(cx + f * 9, y + 19 - reach);
    x.stroke();
  } else {
    x.beginPath();
    x.moveTo(cx, y + 16);
    x.lineTo(cx + s + o, y + 22 + o);
    x.moveTo(cx, y + 16);
    x.lineTo(cx - s - o, y + 22 + o);
    x.stroke();
  }

  // Chân (Hồn ma bay lơ lửng bồng bềnh, các skin khác chân đung đưa)
  if (skinId === 'ghost') {
    const floatTail = Math.sin(tick * 0.15) * 4;
    x.moveTo(cx, y + 24);
    x.quadraticCurveTo(cx + floatTail, y + 30, cx - floatTail, y + 34);
    x.stroke();
  } else {
    x.moveTo(cx, y + 24);
    x.lineTo(cx + s, y + 34);
    x.moveTo(cx, y + 24);
    x.lineTo(cx - s, y + 34);
    x.stroke();
  }

  // 3. Phụ kiện đặc trưng trên đầu / mặt
  if (skinId === 'ninja') {
    // Khăn quàng cổ bay trong gió
    x.strokeStyle = '#ff4757';
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(cx, y + 14);
    const flutter = Math.sin(tick * 0.2) * 3;
    x.quadraticCurveTo(cx - f * 6, y + 15 + flutter, cx - f * 11, y + 16 - flutter);
    x.stroke();

    // Băng trán ninja ánh kim loại sáng
    x.strokeStyle = '#dfe4ea';
    x.lineWidth = 2.2;
    x.beginPath();
    x.arc(cx, y + 6, 7, -Math.PI * 0.8, -Math.PI * 0.2);
    x.stroke();
    // Biểu tượng trán kim loại sáng
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(cx, y + 2, 1.2, 0, 7);
    x.fill();
  } else if (skinId === 'flame') {
    // 3 ngọn lửa nhấp nháy trên đầu
    const f1 = Math.abs(Math.sin(tick * 0.25)) * 4;
    const f2 = Math.abs(Math.cos(tick * 0.2)) * 3;
    x.fillStyle = '#ffa502';
    x.beginPath();
    x.arc(cx, y + 1 - f1, 2.5, 0, 7);
    x.fill();
    x.fillStyle = '#ffd32a';
    x.beginPath();
    x.arc(cx - 3, y + 2 - f2, 1.8, 0, 7);
    x.fill();
    x.fillStyle = '#ff4757';
    x.beginPath();
    x.arc(cx + 3, y + 2 - f2, 1.8, 0, 7);
    x.fill();
  } else if (skinId === 'frost') {
    // 2 sừng băng pha lê nhọn
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.moveTo(cx - 4, y + 2);
    x.lineTo(cx - 6, y - 4);
    x.lineTo(cx - 2, y + 2);
    x.fill();
    x.beginPath();
    x.moveTo(cx + 2, y + 2);
    x.lineTo(cx + 6, y - 4);
    x.lineTo(cx + 4, y + 2);
    x.fill();
  } else if (skinId === 'golden') {
    // Vương miện 3 đỉnh vàng đính ngọc Ruby
    x.fillStyle = '#ffd32a';
    x.beginPath();
    x.moveTo(cx - 5, y + 2);
    x.lineTo(cx - 6, y - 3);
    x.lineTo(cx - 2, y);
    x.lineTo(cx, y - 5);
    x.lineTo(cx + 2, y);
    x.lineTo(cx + 6, y - 3);
    x.lineTo(cx + 5, y + 2);
    x.closePath();
    x.fill();
    // Viên hồng ngọc
    x.fillStyle = '#ff4757';
    x.beginPath();
    x.arc(cx, y, 1.5, 0, 7);
    x.fill();
  } else if (skinId === 'bruised') {
    // Băng gạc quấn chéo trán
    x.strokeStyle = '#ffffff';
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(cx - 6, y + 3);
    x.lineTo(cx + 6, y + 8);
    x.stroke();
    // Băng cá nhân nhỏ trên má
    x.strokeStyle = '#ff7675';
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(cx - f * 2 - 2, y + 9);
    x.lineTo(cx - f * 2 + 2, y + 9);
    x.moveTo(cx - f * 2, y + 7);
    x.lineTo(cx - f * 2, y + 11);
    x.stroke();
  } else if (skinId === 'reaper') {
    // Mũ trùm đầu (Hoodie) tím thẫm tử thần
    x.fillStyle = '#221638';
    x.beginPath();
    x.arc(cx - f * 2, y + 6, 8, 0, 7);
    x.fill();
  } else if (skinId === 'box') {
    // Nắp thùng carton trên đầu & khe nhìn
    x.fillStyle = '#d29b55';
    x.fillRect(cx - 7, y + 1, 14, 8);
    x.strokeStyle = '#b7791f';
    x.lineWidth = 1.4;
    x.strokeRect(cx - 7, y + 1, 14, 8);
    // Băng dính nắp trên
    x.fillStyle = '#f5cd79';
    x.fillRect(cx - 7, y + 3, 14, 2);
    // Khe hé nhìn ra
    x.fillStyle = '#171224';
    x.fillRect(cx + f * 1 - 2, y + 4.5, 6, 3);
  } else if (skinId === 'chicken') {
    // Mào gà đỏ 3 múi nhấp nhô
    x.fillStyle = '#ff4757';
    x.beginPath();
    x.arc(cx - 2, y, 2.4, 0, Math.PI * 2);
    x.arc(cx + 1, y - 2, 2.8, 0, Math.PI * 2);
    x.arc(cx + 4, y, 2.0, 0, Math.PI * 2);
    x.fill();
    // Mỏ gà cam nhọn
    x.fillStyle = '#ff793f';
    x.beginPath();
    x.moveTo(cx + f * 6, y + 5);
    x.lineTo(cx + f * 11, y + 7.5);
    x.lineTo(cx + f * 6, y + 9.5);
    x.closePath();
    x.fill();
    // Yếm đỏ dưới cằm
    x.fillStyle = '#ff4757';
    x.beginPath();
    x.arc(cx + f * 4, y + 11, 2.0, 0, Math.PI * 2);
    x.fill();
  } else if (skinId === 'zombie') {
    // Vết khâu sẹo chỉ đen trên trán
    x.strokeStyle = '#2d3436';
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(cx - 3, y + 2);
    x.lineTo(cx + 3, y + 6);
    x.stroke();
    x.beginPath();
    x.moveTo(cx - 1, y + 2);
    x.lineTo(cx - 2, y + 4);
    x.moveTo(cx + 1, y + 4);
    x.lineTo(cx, y + 6);
    x.stroke();
    // Độc dịch xanh chảy ở cằm
    x.fillStyle = '#00cec9';
    x.beginPath();
    x.arc(cx + f * 3, y + 12, 1.6, 0, Math.PI * 2);
    x.fill();
  } else if (skinId === 'clown') {
    // Tóc xù cam 2 bên
    x.fillStyle = '#ff793f';
    x.beginPath();
    x.arc(cx - 7, y + 6, 2.8, 0, Math.PI * 2);
    x.arc(cx - 6, y + 2, 2.4, 0, Math.PI * 2);
    x.arc(cx - 7, y + 10, 2.2, 0, Math.PI * 2);
    x.fill();
    // Cổ áo xếp ly rạp xiếc (Ruffle collar)
    x.strokeStyle = '#00d2d3';
    x.lineWidth = 2.5;
    x.beginPath();
    x.arc(cx, y + 14, 5.5, 0, Math.PI);
    x.stroke();
    // Mũi tròn đỏ chú hề to tướng phát sáng
    x.shadowBlur = 8;
    x.shadowColor = '#ff3838';
    x.fillStyle = '#ff3838';
    x.beginPath();
    x.arc(cx + f * 4.5, y + 7, 3.0, 0, Math.PI * 2);
    x.fill();
    // Miệng cười đỏ ngoác
    x.strokeStyle = '#ff3838';
    x.lineWidth = 1.5;
    x.beginPath();
    x.arc(cx + f * 2, y + 9.5, 3.2, 0.1 * Math.PI, 0.8 * Math.PI);
    x.stroke();
  } else if (skinId === 'cyborg') {
    // Mặt nạ kim loại nửa mặt
    x.fillStyle = '#747d8c';
    x.beginPath();
    x.arc(cx + f * 2, y + 6, 6, -Math.PI / 2, Math.PI / 2, f < 0);
    x.fill();
    // Thanh quét Lazer Neon hồng rực
    x.strokeStyle = '#ff007f';
    x.lineWidth = 2.4;
    x.shadowBlur = 8;
    x.shadowColor = '#ff007f';
    x.beginPath();
    x.moveTo(cx - 2, y + 6);
    x.lineTo(cx + f * 7, y + 6);
    x.stroke();
    // Ăng-ten phát tín hiệu trên đầu
    x.strokeStyle = '#dfe6e9';
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(cx - f * 2, y + 1);
    x.lineTo(cx - f * 3, y - 5);
    x.stroke();
    x.fillStyle = tick % 10 < 5 ? '#ff007f' : '#00f2fe';
    x.beginPath();
    x.arc(cx - f * 3, y - 5, 1.8, 0, Math.PI * 2);
    x.fill();
  } else if (skinId === 'thunder') {
    // Vương miện sấm sét chớp giật nhọn hoắt
    x.strokeStyle = '#fff200';
    x.lineWidth = 2.2;
    x.shadowBlur = 12;
    x.shadowColor = '#fff200';
    x.beginPath();
    x.moveTo(cx - 3, y + 1);
    x.lineTo(cx - 5, y - 4);
    x.lineTo(cx - 3, y - 2);
    x.lineTo(cx - 4, y - 8);
    x.moveTo(cx + 3, y + 1);
    x.lineTo(cx + 5, y - 4);
    x.lineTo(cx + 3, y - 2);
    x.lineTo(cx + 4, y - 8);
    x.stroke();
    // Tia sét hồ quang phóng qua thái dương
    if (Math.random() > 0.4) {
      x.strokeStyle = '#00d2d3';
      x.lineWidth = 1.4;
      x.beginPath();
      x.moveTo(cx - f * 6, y + 6);
      x.lineTo(cx - f * 9, y + 9);
      x.stroke();
    }
  } else if (skinId === 'angel') {
    // Vòng hào quang (Halo) thiên thần vàng kim lơ lửng trên đầu
    x.strokeStyle = '#f9ca24';
    x.lineWidth = 2.2;
    x.shadowBlur = 12;
    x.shadowColor = '#f9ca24';
    x.beginPath();
    x.ellipse(cx, y - 3, 6.5, 2.2, 0, 0, Math.PI * 2);
    x.stroke();
    // Đốm sao sáng trên trán
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(cx, y + 3, 1.2, 0, Math.PI * 2);
    x.fill();
  }

  // 4. Mắt
  x.fillStyle = eyeColor;
  if (skinId === 'bruised') {
    // Mắt chéo đau đớn (X)
    x.strokeStyle = '#201b33';
    x.lineWidth = 1.5;
    const ex = cx + f * 3, ey = y + 6;
    x.beginPath();
    x.moveTo(ex - 2, ey - 2);
    x.lineTo(ex + 2, ey + 2);
    x.moveTo(ex + 2, ey - 2);
    x.lineTo(ex - 2, ey + 2);
    x.stroke();
  } else if (skinId === 'reaper') {
    // 2 mắt đỏ phát sáng rực lửa
    x.shadowBlur = 6;
    x.shadowColor = '#ff3838';
    x.fillStyle = '#ff3838';
    x.beginPath();
    x.arc(cx + f * 3, y + 6, 1.8, 0, 7);
    x.arc(cx + f * 1, y + 6, 1.5, 0, 7);
    x.fill();
  } else if (skinId === 'troll') {
    // Kính râm đen cực ngầu
    x.fillStyle = '#000000';
    x.fillRect(cx + f * 1 - 2, y + 4, 7, 3.5);
    x.fillStyle = '#ffffff';
    x.fillRect(cx + f * 1 - 1, y + 4.5, 2, 1);
  } else if (skinId === 'box') {
    // 2 mắt nhìn lén qua khe thùng
    x.fillStyle = '#ffffff';
    x.fillRect(cx + f * 1 - 1, y + 5, 4.5, 2.5);
    x.fillStyle = '#201b33';
    x.beginPath();
    x.arc(cx + f * 2, y + 6.2, 1.2, 0, 7);
    x.fill();
  } else if (skinId === 'chicken') {
    // Mắt tròn gà ngơ ngác
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(cx + f * 2.5, y + 6, 2.4, 0, 7);
    x.fill();
    x.fillStyle = '#201b33';
    x.beginPath();
    x.arc(cx + f * 3.2, y + 6, 1.3, 0, 7);
    x.fill();
  } else if (skinId === 'zombie') {
    // 1 mắt vàng phát sáng neon, 1 mắt tối sụp
    x.shadowBlur = 6;
    x.shadowColor = '#ffeaa7';
    x.fillStyle = '#ffeaa7';
    x.beginPath();
    x.arc(cx + f * 3, y + 5.5, 2.0, 0, 7);
    x.fill();
    x.fillStyle = '#201b33';
    x.beginPath();
    x.arc(cx + f * 0.5, y + 6.5, 1.2, 0, 7);
    x.fill();
  } else if (skinId === 'clown') {
    // Mắt hề vui nhộn
    x.fillStyle = '#201b33';
    x.beginPath();
    x.arc(cx + f * 2, y + 5.2, 1.6, 0, 7);
    x.fill();
  } else if (skinId === 'cyborg') {
    // Mắt đã có thanh quét Laser hồng rực che phủ
  } else if (skinId === 'thunder') {
    // Mắt điện phát sáng trắng xanh triệu volt
    x.shadowBlur = 8;
    x.shadowColor = '#00d2d3';
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(cx + f * 3, y + 6, 2.0, 0, 7);
    x.arc(cx + f * 0.8, y + 6, 1.6, 0, 7);
    x.fill();
  } else if (skinId === 'angel') {
    // Mắt thiên thần vàng óng thánh thiện
    x.shadowBlur = 6;
    x.shadowColor = '#f9ca24';
    x.fillStyle = '#f9ca24';
    x.beginPath();
    x.arc(cx + f * 3, y + 6, 1.8, 0, 7);
    x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(cx + f * 3, y + 6, 0.8, 0, 7);
    x.fill();
  } else {
    // Mắt tròn thông thường
    x.beginPath();
    x.arc(cx + f * 3, y + 6, 1.8, 0, 7);
    x.fill();
  }

  x.restore();
}
