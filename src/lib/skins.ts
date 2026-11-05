// ─── Hệ Thống Skin & Hiệu Ứng Nhân Vật Con Rối (Die Again) ──────────────────────

export type SkinType = 'auto' | 'level' | 'deaths';

export interface SkinEffects {
  move: string;
  jump: string;
  land: string;
}

export interface SkinDefinition {
  id: string;
  name: string;
  icon: string;
  desc: string;
  type: SkinType;
  reqValue?: number; // Màn yêu cầu (nếu type = 'level') hoặc Số lần chết yêu cầu (nếu type = 'deaths')
  previewColor: string;
  effects: SkinEffects;
}

export const SKINS: SkinDefinition[] = [
  {
    id: 'auto',
    name: 'Tự Động Theo Màn',
    icon: '⚡',
    desc: 'Tự động đổi diện mạo và hiệu ứng mới sau mỗi 10 màn chơi (Màn 1, 11, 21, 31, 41)!',
    type: 'auto',
    previewColor: '#8a7bff',
    effects: {
      move: 'Tự đổi vệt bước chân theo từng chặng màn chơi',
      jump: 'Phản lực bật nhảy biến hóa tương ứng theo màn',
      land: 'Sóng xung kích tiếp đất đổi mới sau mỗi 10 màn',
    },
  },
  // ─── Skin Mở Khóa Theo Màn (Mỗi 10 màn 1 skin) ─────────────────────────────
  {
    id: 'wooden',
    name: 'Rối Gỗ Cổ Điển',
    icon: '🪵',
    desc: 'Màn 1 - 10: Chú rối gỗ đơn sơ nhưng kiên cường, sinh ra để vượt qua cạm bẫy.',
    type: 'level',
    reqValue: 1,
    previewColor: '#f3e9d2',
    effects: {
      move: 'Bụi dăm gỗ cổ điển vương lại sau gót chân',
      jump: 'Cụm bụi đất & dăm gỗ bung nhẹ đẩy tung lên cao',
      land: 'Sóng bụi gỗ dăm bào lan tỏa sang hai bên mặt sàn',
    },
  },
  {
    id: 'ninja',
    name: 'Ninja Bóng Đêm',
    icon: '🥷',
    desc: 'Màn 11 - 20: Tung khăn đỏ phấp phới trong gió, thoắt ẩn thoắt hiện né gai nhọn.',
    type: 'level',
    reqValue: 11,
    previewColor: '#2b283a',
    effects: {
      move: 'Bóng mờ tàn khói đen & vệt lụa đỏ thoắt ẩn thoắt hiện',
      jump: 'Bom khói "Poof!" kèm tia ám khí đỏ đẩy vọt lên trời',
      land: 'Khói bóng tối độn thổ tản nhanh sang hai bên',
    },
  },
  {
    id: 'flame',
    name: 'Hỏa Thần Rực Lửa',
    icon: '🔥',
    desc: 'Màn 21 - 30: Sinh ra từ biển dung nham, đầu bốc lửa hừng hực không sợ bẫy.',
    type: 'level',
    reqValue: 21,
    previewColor: '#ff6348',
    effects: {
      move: 'Vệt tàn lửa than hồng & đốm lửa bập bùng bốc lên',
      jump: 'Phản lực lửa bốc cháy dữ dội đẩy tung người lên',
      land: 'Sóng nhiệt rực lửa & tia lửa tóe rực rỡ mặt đất',
    },
  },
  {
    id: 'frost',
    name: 'Thạch Anh Băng Giá',
    icon: '❄️',
    desc: 'Màn 31 - 40: Cơ thể kết tinh từ băng vĩnh cửu, lạnh lùng vượt qua mọi cú lừa.',
    type: 'level',
    reqValue: 31,
    previewColor: '#70a1ff',
    effects: {
      move: 'Sương giá băng tuyết & vụn băng pha lê lấp lánh',
      jump: 'Băng vỡ tung (Ice Shatter) với ánh pha lê xanh ngọc',
      land: 'Vòng gai băng nứt toác & làn sương lạnh tỏa trên sàn',
    },
  },
  {
    id: 'golden',
    name: 'Vua Hoàng Kim',
    icon: '👑',
    desc: 'Màn 41 - 50: Đầu đội vương miện đính hồng ngọc, bộ giáp hoàng gia của người sắp phá đảo.',
    type: 'level',
    reqValue: 41,
    previewColor: '#f5c542',
    effects: {
      move: 'Bụi vàng kim tuyến 24k & những ngôi sao lấp lánh',
      jump: 'Chùm pháo sao hoàng kim bung nở rực rỡ dưới chân',
      land: 'Hào quang vương giả bừng sáng với bụi vàng & hồng ngọc',
    },
  },
  // ─── Skin Mở Khóa Theo Số Lần Chết ─────────────────────────────────────────
  {
    id: 'bruised',
    name: 'Rối Bầm Dập',
    icon: '🩹',
    desc: 'Mở khóa khi Chết ≥ 10 lần: Đầy vết thương và băng cá nhân, mắt tím ngắt vẫn không chịu lùi bước!',
    type: 'deaths',
    reqValue: 10,
    previewColor: '#dcd0ff',
    effects: {
      move: 'Giọt mồ hôi văng ra cùng bụi đất lem luốc',
      jump: 'Dồn hết sức bình sinh nhảy vọt, mồ hôi bắn tóe',
      land: 'Cú ngã chấn động, sao choáng váng 💫 & bụi lem nhem',
    },
  },
  {
    id: 'ghost',
    name: 'Hồn Ma Vất Vưởng',
    icon: '👻',
    desc: 'Mở khóa khi Chết ≥ 50 lần: Chết quá nhiều đến mức hóa thành bóng ma lơ lửng phát sáng.',
    type: 'deaths',
    reqValue: 50,
    previewColor: '#7bed9f',
    effects: {
      move: 'Đốm ma trơi xanh ngọc lơ lửng không chạm đất',
      jump: 'Luồng linh hồn xanh dạ quang nâng người nhẹ tênh',
      land: 'Sương ma trôi lan êm đềm như không trọng lực',
    },
  },
  {
    id: 'reaper',
    name: 'Thần Chết Mini',
    icon: '☠️',
    desc: 'Mở khóa khi Chết ≥ 100 lần: Áo choàng tử thần và lưỡi hái sắc bén. Đã kết thân với Thần Chết!',
    type: 'deaths',
    reqValue: 100,
    previewColor: '#1e1830',
    effects: {
      move: 'Hắc khí tím thẫm & tàn tro ác mộng cuộn sau lưng',
      jump: 'Vệt chém bóng tối xoáy tử khí đen tím đẩy vút lên',
      land: 'Khói địa ngục cuộn trào sang hai bên với ánh đỏ tử thần',
    },
  },
  {
    id: 'troll',
    name: 'Thánh Troll Bất Tử',
    icon: '🌈',
    desc: 'Mở khóa khi Chết ≥ 200 lần: Huyền thoại bất tử! Cơ thể phát sáng Neon cầu vồng RGB rực rỡ.',
    type: 'deaths',
    reqValue: 200,
    previewColor: '#ff3838',
    effects: {
      move: 'Dải vệt sáng cầu vồng RGB Neon đổi màu rực rỡ',
      jump: 'Pháo hoa cầu vồng Mini Popper bung tỏa sắc màu rực rỡ',
      land: 'Bữa tiệc Party Confetti bung nổ sắc màu khắp sàn',
    },
  },
];

// Lấy skin đang lưu
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

// Kiểm tra một skin đã được mở khóa chưa
export function isSkinUnlocked(skin: SkinDefinition, currentLevel: number, totalDeaths: number): boolean {
  if (skin.type === 'auto') return true;
  if (skin.type === 'level') {
    return (currentLevel || 1) >= (skin.reqValue || 1);
  }
  if (skin.type === 'deaths') {
    return (totalDeaths || 0) >= (skin.reqValue || 0);
  }
  return false;
}

// Xác định skin thực tế hiển thị khi chơi (nếu chọn 'auto' thì tự đổi theo màn)
export function resolveActiveSkinId(selectedSkinId: string, levelNumber: number): string {
  if (selectedSkinId && selectedSkinId !== 'auto') {
    return selectedSkinId;
  }
  // Mặc định tự động theo màn
  const lv = Math.max(1, levelNumber || 1);
  if (lv <= 10) return 'wooden';
  if (lv <= 20) return 'ninja';
  if (lv <= 30) return 'flame';
  if (lv <= 40) return 'frost';
  return 'golden';
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
  shape: 'circle' | 'square' | 'star' | 'ring' | 'smoke' | 'shard' | 'drop';
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
    // Khói bóng tối
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY - 2,
      vx: -facing * (0.4 + Math.random() * 0.5),
      vy: -0.2 - Math.random() * 0.4,
      life: 16,
      maxLife: 16,
      size: 3.2 + Math.random() * 2.2,
      color: 'rgba(38, 34, 52, 0.75)',
      shape: 'smoke',
      gravity: -0.02,
      alpha: 0.65,
    });
    // Vệt lụa đỏ
    if (tick % 3 === 0) {
      particles.push({
        x: footX - facing * 4,
        y: footY - 6,
        vx: -facing * (0.8 + Math.random() * 0.4),
        vy: -0.3,
        life: 12,
        maxLife: 12,
        size: 2.2,
        color: '#ff4757',
        shape: 'shard',
        rotation: Math.random() * Math.PI,
        vRot: 0.1,
        gravity: 0.04,
        alpha: 0.85,
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
    // Hắc khí tím & đốm đỏ tử thần
    particles.push({
      x: footX + (Math.random() - 0.5) * 4,
      y: footY - 2,
      vx: -facing * (0.4 + Math.random() * 0.5),
      vy: -0.5 - Math.random() * 0.4,
      life: 18,
      maxLife: 18,
      size: 3.5 + Math.random() * 2.2,
      color: '#2c1b4d',
      shape: 'smoke',
      gravity: -0.04,
      alpha: 0.8,
    });
    if (tick % 2 === 0) {
      particles.push({
        x: footX - facing * 4,
        y: footY - 1,
        vx: -facing * 0.3,
        vy: -0.3,
        life: 12,
        maxLife: 12,
        size: 1.8,
        color: '#ff3838',
        shape: 'circle',
        gravity: -0.02,
        alpha: 0.9,
      });
    }
  } else if (skinId === 'troll') {
    // Vệt cầu vồng RGB Neon
    const hue = Math.floor((tick * 10) % 360);
    particles.push({
      x: footX + (Math.random() - 0.5) * 6,
      y: footY,
      vx: -facing * (0.5 + Math.random() * 0.7),
      vy: -0.5 - Math.random() * 0.6,
      life: 18,
      maxLife: 18,
      size: 2.8 + Math.random() * 2,
      color: `hsl(${hue}, 100%, 65%)`,
      shape: Math.random() > 0.5 ? 'star' : 'square',
      rotation: Math.random() * Math.PI,
      vRot: 0.12,
      gravity: 0.05,
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
    // Bom khói đen "Poof!"
    for (let i = 0; i < 9; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: footY - 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 2.8,
        life: 18,
        maxLife: 18,
        size: 4 + Math.random() * 3,
        color: 'rgba(35, 30, 48, 0.85)',
        shape: 'smoke',
        gravity: -0.02,
        alpha: 0.8,
      });
    }
    // 2 tia ám khí đỏ vụt xuống
    [-1.8, 1.8].forEach((vx) => {
      particles.push({
        x,
        y: footY - 4,
        vx,
        vy: 2.2,
        life: 14,
        maxLife: 14,
        size: 2.8,
        color: '#ff4757',
        shape: 'shard',
        rotation: Math.PI / 4,
        gravity: 0.05,
        alpha: 0.9,
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
    // Vệt chém tử khí đen tím
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: footY,
        vx: (Math.random() - 0.5) * 3.5,
        vy: 1.0 + Math.random() * 2.5,
        life: 18,
        maxLife: 18,
        size: 3.8 + Math.random() * 2.5,
        color: '#2c1b4d',
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
      life: 14,
      maxLife: 14,
      size: 4,
      color: '#ff3838',
      shape: 'ring',
      stroke: true,
      alpha: 0.8,
    });
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
    // Khói bóng tối tản nhanh sang hai bên
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
        color: 'rgba(35, 30, 48, 0.8)',
        shape: 'smoke',
        gravity: -0.02,
        alpha: 0.8,
      });
    }
    // Vệt đỏ sắc lướt ngang sàn
    [-1, 1].forEach((side) => {
      particles.push({
        x,
        y: footY - 1,
        vx: side * 3.5 * countMult,
        vy: -0.2,
        life: 12,
        maxLife: 12,
        size: 2.6,
        color: '#ff4757',
        shape: 'shard',
        rotation: 0,
        gravity: 0.02,
        alpha: 0.9,
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
    // Khói địa ngục cuộn trào sang hai bên
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
        color: '#2c1b4d',
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
      life: 16,
      maxLife: 16,
      size: 7 * countMult,
      color: '#ff3838',
      shape: 'ring',
      stroke: true,
      alpha: 0.8,
    });
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
    bodyColor = '#2b283a';
    eyeColor = '#ffffff';
    lineWidth = 3.5;
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
    bodyColor = '#1e1830';
    eyeColor = '#ff3838';
    lineWidth = 3.5;
    x.shadowBlur = 8;
    x.shadowColor = '#ff3838';
  } else if (skinId === 'troll') {
    const hue = Math.floor((tick * 4) % 360);
    bodyColor = `hsl(${hue}, 100%, 65%)`;
    eyeColor = '#ffffff';
    x.shadowBlur = 10;
    x.shadowColor = bodyColor;
  }

  x.strokeStyle = bodyColor;
  x.fillStyle = bodyColor;
  x.lineWidth = lineWidth;
  x.lineCap = 'round';

  // Áo choàng sau lưng (cho Golden & Reaper)
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
    // Lưỡi hái sau lưng
    x.strokeStyle = '#574b90';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(cx - f * 8, y + 30);
    x.lineTo(cx + f * 5, y + 4);
    x.stroke();
    // Lưỡi cong
    x.fillStyle = '#dcdde1';
    x.beginPath();
    x.arc(cx + f * 4, y + 5, 8, -Math.PI / 2, 0, f < 0);
    x.stroke();
    x.strokeStyle = bodyColor;
    x.fillStyle = bodyColor;
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

  // Tay
  x.moveTo(cx, y + 16);
  x.lineTo(cx + s + o, y + 22 + o);
  x.moveTo(cx, y + 16);
  x.lineTo(cx - s - o, y + 22 + o);

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

    // Băng trán ninja
    x.strokeStyle = '#747d8c';
    x.lineWidth = 2;
    x.beginPath();
    x.arc(cx, y + 6, 7, -Math.PI * 0.8, -Math.PI * 0.2);
    x.stroke();
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
    // Mũ trùm đầu (Hoodie) đen tử thần
    x.fillStyle = '#110d1c';
    x.beginPath();
    x.arc(cx - f * 2, y + 6, 8, 0, 7);
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
    // 2 mắt đỏ phát sáng
    x.beginPath();
    x.arc(cx + f * 3, y + 6, 1.6, 0, 7);
    x.arc(cx + f * 1, y + 6, 1.4, 0, 7);
    x.fill();
  } else if (skinId === 'troll') {
    // Kính râm đen cực ngầu
    x.fillStyle = '#000000';
    x.fillRect(cx + f * 1 - 2, y + 4, 7, 3.5);
    x.fillStyle = '#ffffff';
    x.fillRect(cx + f * 1 - 1, y + 4.5, 2, 1);
  } else {
    // Mắt tròn thông thường
    x.beginPath();
    x.arc(cx + f * 3, y + 6, 1.8, 0, 7);
    x.fill();
  }

  x.restore();
}
