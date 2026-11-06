'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  getPlayerName,
  setPlayerName,
  getPlayerAvatar,
  setPlayerAvatar,
  savePlayerProgress,
  registerOrFindPlayer,
  formatPlayTime,
  AVATAR_LIST,
  DEFAULT_AVATAR,
  updatePlayerSkin,
  fetchSkinsFromDb,
} from '@/lib/supabase';
import LeaderboardModal from './LeaderboardModal';
import AvatarDisplay from './AvatarDisplay';
import Toast from './Toast';
import { sound } from '@/lib/sound';
import SoundButton from './SoundButton';
import SkinModal from './SkinModal';
import { enterLandscape } from '@/lib/landscape';
import {
  getSelectedSkin,
  setSelectedSkin,
  resolveActiveSkinId,
  checkMilestoneLevelSkin,
  drawPuppetSkin,
  spawnSkinMoveEffect,
  spawnSkinJumpEffect,
  spawnSkinLandEffect,
  renderSkinParticles,
  type SkinParticle,
  type SkinDefinition,
} from '@/lib/skins';

interface GameCanvasProps {
  initialLevel?: number;
  initialDeaths?: number;
  initialPlayTime?: number;
  playerName?: string;
  onBackToHome?: () => void;
}

// ─── Game engine (vanilla JS) ─────────────────────────────────────────────────

function createGameEngine(
  canvas: HTMLCanvasElement,
  callbacks: {
    onDie: (lv: number, deaths: number, playTime: number) => void;
    onLevelUp: (lv: number, deaths: number, playTime: number) => void;
    onWin: (deaths: number, playTime: number) => void;
    onSkinAutoEquipped?: (skin: SkinDefinition, newLevelNum: number) => void;
  },
  startLevel = 1,
  startDeaths = 0,
  startPlayTime = 0,
  startSkin = 'auto'
) {
  const x = canvas.getContext('2d')!;
  const W = 800, H = 450;
  const FONT = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif';
  let currentSkin = startSkin || 'auto';
  let tick = 0;

  const P = (a: number, b: number, w: number, h: number, o?: object) =>
    ({ k: 'p', x: a, y: b, w, h, vx: 0, vy: 0, ...o } as any);
  const S = (a: number, b: number, w: number, h: number, o?: object) =>
    ({ k: 's', x: a, y: b, w, h, vx: 0, vy: 0, on: 1, ...o } as any);
  const T = (a: number, b: number, f: () => void) => ({ a, b, f, d: 0 });
  const G = (a = 0, w = 800) => P(a, 380, w, 70);
  const SP = (a: number, o?: object) => S(a, 350, 30, 30, o);
  const HP = (a: number, b: number, w = 70) => P(a, b, w, 16, { hide: 1 });
  const FL = (a: number, b: number, w = 90, h = 70, o?: object) => P(a, b, w, h, { fl: 1, ...o });
  const FK = (fx = 740, fy = 320) => ({ x: fx, y: fy, w: 30, h: 60 });
  const DR = (dx = 740) => ({ x: dx, y: 320 });

  let L: any,
    lv = Math.max(0, Math.min((startLevel || 1) - 1, 49)),
    deaths = Math.max(0, startDeaths || 0),
    playTime = Math.max(0, startPlayTime || 0),
    keys: Record<string, number> = {},
    pl: any;
  let fx_: any[] = [],
    skinFx: SkinParticle[] = [],
    jumpTimer = 0,
    landTimer = 0,
    stepTimer = 0,
    st = 'play',
    tm = 0,
    msg = '';
  const trolls = ['Ối!', 'Lại nữa à?', 'Tin tưởng làm gì...', 'Cố lên nào!', 'Rối đứt dây rồi', 'Tưởng dễ à? :)', 'Gần được rồi... là nói dối',
    'Bạn vừa làm gì vậy?', 'Gai: 1 - Bạn: 0', 'Đừng nản, mới chết có mấy lần thôi', 'Nhìn kỹ lại đi nào',
    'Ai bảo tin cái bẫy đó?', 'Thử lại lần nữa nhé :)', 'Tay hay là mạng đây?', 'Chết đẹp đấy!',
    'Game này không cho bạn dễ vậy đâu', 'Bình tĩnh... hít thở...', 'Chắc do lag thôi nhỉ?',
    'Đã bảo là có bẫy mà', 'Nghỉ tay uống nước đi', 'Sắp qua rồi... có thể vậy', 'RIP bạn tôi',
    'Hay là bỏ cuộc nhé? Đùa thôi', 'Gai nhớ bạn lắm đó', 'Mắt để làm cảnh à?', 'Lại một cú ngã nghệ thuật'];

  // prettier-ignore
  const LV: Array<() => any> = [
    // ═════════════════════════════════════════════════════════════════════════
    // CHẶNG 1 (Màn 1 - 10): KHỞI ĐẦU & BẪY CƠ BẢN (Làm quen & Vui nhộn)
    // ═════════════════════════════════════════════════════════════════════════
    /* 1  (Cũ: 1)  */ () => { const f = P(480, 380, 100, 70), s = S(320, 350, 30, 30, { on: 0 }), sEnd = SP(690, { on: 0 }); return { n: 'Màn 1: Dễ ợt mà', h: 'Cứ chạy thẳng thôi...', P: [G(0, 480), f, G(580, 220)], S: [s, sEnd], D: { x: 735, y: 320 }, T: [T(270, 999, () => s.on = 1), T(430, 999, () => f.g = 1), T(620, 999, () => sEnd.on = 1)] }; },
    /* 2  (Cũ: 6)  */ () => { const s = S(150, 350, 30, 30, { on: 0 }), drop = S(80, 0, 30, 30, { dn: 1 }); return { n: 'Màn 2: Cửa giả', h: 'Cửa nào mới là cửa thật?', sx: 400, P: [G(0, 220), FL(220, 380, 80, 70), G(300, 500)], S: [s, drop], D: { x: 8, y: 320 }, F: [{ x: 740, y: 320, w: 30, h: 60 }], T: [T(240, 300, () => s.on = 1), T(120, 180, () => drop.vy = 16)] }; },
    /* 3  (Cũ: 11) */ () => { const a = S(240, 300, 30, 30, { on: 0 }), b = S(340, 250, 30, 30, { on: 0 }), drop = S(440, 0, 32, 32, { dn: 1 }); return { n: 'Màn 3: Bậc thang gai', h: 'Mỗi bậc một bất ngờ', P: [G(), P(200, 330, 100, 50), P(300, 280, 100, 100), FL(400, 230, 100, 150)], S: [a, b, drop], D: { x: 450, y: 170 }, T: [T(150, 230, () => a.on = 1), T(270, 330, () => b.on = 1), T(350, 999, () => drop.vy = 15)] }; },
    /* 4  (Cũ: 12) */ () => { const s1 = SP(380, { on: 0 }), s2 = SP(595, { on: 0 }); return { n: 'Màn 4: Chọn cửa', h: 'Chỉ có một cửa thật', P: [G()], S: [s1, s2], D: DR(640), F: [FK(560), FK(720)], T: [T(320, 999, () => s1.on = 1), T(480, 999, () => s2.on = 1)] }; },
    /* 5  (Cũ: 14) */ () => { const sCeil = S(350, 250, 200, 35, { dn: 1 }), sEnd = SP(660, { on: 0 }); return { n: 'Màn 5: Sàn sụp', h: 'Đừng dừng, đừng nhảy bừa', P: [G(0, 100), ...[1, 2, 3, 4, 5, 6].map(i => FL(i * 100, 380, 100)), G(700, 100)], S: [sCeil, sEnd], D: DR(), T: [T(570, 999, () => sEnd.on = 1)] }; },
    /* 6  (Cũ: 15) */ () => { const s = [240, 370, 510, 650].map(a => SP(a, { on: 0 })), drop = S(440, 0, 32, 32, { dn: 1 }); return { n: 'Màn 6: Gai trồi', h: 'Chúng mọc ngay trước mũi giày', P: [G(0, 400), FL(400, 380, 80, 70), G(480, 320)], S: [...s, drop], D: DR(), T: [...s.map(p => T(p.x - 55, 999, () => p.on = 1)), T(330, 999, () => drop.vy = 16)] }; },
    /* 7  (Cũ: 18) */ () => { const d = DR(500), s1 = SP(300, { on: 0 }), drop = S(180, 0, 30, 30, { dn: 1 }), sDoor = SP(80, { on: 0 }); return { n: 'Màn 7: Cửa chạy trốn', h: 'Lại chạy mất rồi', P: [G()], S: [s1, drop, sDoor], D: d, T: [T(400, 999, () => d.x = 720), T(640, 999, () => { d.x = 40; s1.on = 1; L.h = 'Quay về đi!' }), T(220, 270, () => drop.vy = 16), T(110, 160, () => sDoor.on = 1)] }; },
    /* 8  (Cũ: 34) */ () => { const r = S(800, 350, 30, 30); return { n: 'Màn 8: Nhảy dù', h: 'Hạ cánh cho khéo', sx: 40, sy: 114, P: [P(0, 150, 120, 16), G(0, 420), FL(420, 380, 80, 70), G(500, 300)], S: [SP(250), SP(370), SP(560), SP(660), r], D: DR(750), T: [T(280, 999, () => r.vx = -4)] }; },
    /* 9  (Cũ: 2)  */ () => { const a = S(260, 0, 36, 34, { dn: 1 }), b = S(390, 0, 36, 34, { dn: 1 }), c = S(520, 0, 36, 34, { dn: 1 }), e = SP(670, { on: 0 }); return { n: 'Màn 9: Mưa gai', h: 'Ngẩng đầu lên!', P: [G(0, 360), FL(360, 380, 80, 70), G(440, 360)], S: [a, b, c, e], D: { x: 740, y: 320 }, T: [T(180, 999, () => a.vy = 16), T(310, 999, () => b.vy = 17), T(440, 999, () => c.vy = 19), T(580, 999, () => e.on = 1)] }; },
    /* 10 (Cũ: 47) */ () => { const sDoor = SP(365, { on: 0 }); return { n: 'Màn 10: Rừng cửa giả', h: 'Cửa thật trốn ở giữa', P: [G()], S: [SP(260), sDoor, SP(520), SP(660)], D: DR(400), F: [300, 500, 600, 740].map(a => FK(a)), T: [T(310, 999, () => sDoor.on = 1)] }; },

    // ═════════════════════════════════════════════════════════════════════════
    // CHẶNG 2 (Màn 11 - 20): BẪY CHUYỂN ĐỘNG & THỬ THÁCH PHẢN XẠ
    // ═════════════════════════════════════════════════════════════════════════
    /* 11 (Cũ: 13) */ () => { const c = [0, 1, 2, 3, 4].map(i => S(240 + i * 90, 0, 36, 34, { dn: 1 })), sDoor = SP(680, { on: 0 }); return { n: 'Màn 11: Mưa gai dày', h: 'Đừng chạy bừa', P: [G(0, 320), FL(320, 380, 80, 70), G(400, 110), FL(510, 380, 80, 70), G(590, 210)], S: [...c, sDoor], D: DR(), T: [...c.map((s, i) => T(140 + i * 90, 999, () => s.vy = 16)), T(600, 999, () => sDoor.on = 1)] }; },
    /* 12 (Cũ: 38) */ () => { const s = [280, 460, 640].map(a => SP(a, { on: 0 })), t = S(800, 350, 30, 30); return { n: 'Màn 12: Đạp mìn', h: 'Bước đến đâu mọc đến đó', P: [G(0, 360), FL(360, 380, 80, 70), G(440, 360)], S: [...s, t], D: DR(760), T: [...s.map(p => T(p.x - 60, p.x - 40, () => p.on = 1)), T(380, 999, () => t.vx = -3.5)] }; },
    /* 13 (Cũ: 36) */ () => { const l = P(170, 380, 80, 16, { sy: 200 }), s = S(335, 170, 30, 30, { on: 0 }), drop = S(490, 0, 30, 30, { dn: 1 }), sDoor = S(695, 170, 30, 30, { on: 0 }); return { n: 'Màn 13: Thang máy', h: 'Đi lên, lên nữa', P: [G(0, 150), l, P(300, 200, 100, 16), FL(450, 200, 90, 16), P(590, 200, 210, 16)], S: [s, drop, sDoor], D: { x: 740, y: 140 }, T: [T(140, 999, () => l.vy = -1.2), T(255, 999, () => s.on = 1), T(410, 999, () => drop.vy = 16), T(620, 999, () => sDoor.on = 1)] }; },
    /* 14 (Cũ: 37) */ () => { const p = [150, 260, 370, 480].map(a => P(a, 340, 80, 16)), s = SP(610, { on: 0 }); return { n: 'Màn 14: Chìm', h: 'Chúng đang chìm dần', P: [G(0, 110), ...p, G(590, 210)], S: [s], D: DR(745), T: [...p.map(q => T(q.x - 30, 999, () => q.vy = .9)), T(510, 999, () => s.on = 1)] } },
    /* 15 (Cũ: 7)  */ () => { const a = S(800, 350, 30, 30), b = S(800, 350, 30, 30), c = S(820, 350, 30, 30), drop = S(510, 0, 36, 34, { dn: 1 }), doorSpike = SP(685, { on: 0 }); return { n: 'Màn 15: Bão gai liên hoàn', h: 'Không chỉ có một đợt đâu!', P: [G(0, 300), G(420, 380)], S: [a, b, c, drop, S(610, 350, 30, 30), doorSpike], D: { x: 740, y: 320 }, T: [T(80, 999, () => a.vx = -3.5), T(330, 999, () => b.vx = -4), T(440, 999, () => drop.vy = 18), T(520, 999, () => c.vx = -5), T(630, 999, () => doorSpike.on = 1)] } },
    /* 16 (Cũ: 35) */ () => { const w = [250, 420, 590].map(a => P(a, 270, 20, 110, { hide: 1 })), s = [250, 420, 590].map(a => SP(a + 70, { on: 0 })); return { n: 'Màn 16: Tường ma', h: 'Có thứ gì đó chặn đường', P: [G(), ...w], S: s, D: DR(750), T: [T(210, 999, () => s[0].on = 1), T(370, 999, () => { s[1].on = 1; L.rev = 1; L.h = 'Ủa? Thanh 2 bị nhảy ngược! Bấm Trái để nhảy!'; }), T(520, 999, () => { L.rev = 0; L.h = 'Đã bình thường trở lại!'; }), T(550, 999, () => s[2].on = 1)] } },
    /* 17 (Cũ: 33) */ () => { const a = SP(440, { on: 0 }), b = SP(280, { on: 0 }), c = SP(60, { on: 0 }); return { n: 'Màn 17: Nhà gương', h: 'Cửa thật ở phía bên kia', sx: 700, P: [G()], S: [a, b, c], D: DR(8), F: [FK(520), FK(360), FK(200)], T: [T(500, 560, () => a.on = 1), T(340, 400, () => b.on = 1), T(110, 160, () => c.on = 1)] } },
    /* 18 (Cũ: 31) */ () => { const sFront = SP(705, { on: 0 }), sBack = SP(770, { on: 0 }); return { n: 'Màn 18: Đường hầm sụp', h: 'Đừng nhảy, đừng dừng', P: [G(0, 300), ...[3, 4, 5].map(i => FL(i * 100, 380, 100)), G(600, 200)], S: [S(300, 250, 300, 40, { dn: 1 }), sFront, sBack], D: DR(), T: [T(610, 999, () => { sFront.on = 1; sBack.on = 1; })] }; },
    /* 19 (Cũ: 23) */ () => { const sG = SP(360, { on: 0 }), s = S(545, 290, 30, 30, { on: 0 }), drop = S(580, 0, 32, 32, { dn: 1 }), sTop = S(715, 170, 25, 30, { on: 0 }); return { n: 'Màn 19: Cửa trên trời', h: 'Cửa dưới đất trông an toàn quá', P: [G(), P(500, 320, 80, 14), P(610, 260, 80, 14, { fl: 1 }), P(710, 200, 90, 14)], S: [sG, s, drop, sTop], D: { x: 750, y: 140 }, F: [FK(740)], T: [T(290, 999, () => sG.on = 1), T(450, 999, () => { s.on = 1; drop.vy = 16; }), T(660, 999, () => sTop.on = 1)] }; },
    /* 20 (Cũ: 21) */ () => { const t1 = S(800, 350, 30, 30), t2a = S(800, 350, 30, 30), t2b = S(850, 350, 30, 30), t3 = S(820, 350, 30, 30), sDoor = SP(695, { on: 0 }); return { n: 'Màn 20: Đoàn tàu gai', h: 'Đoàn tàu không có phanh đâu!', P: [G(0, 200), P(280, 380, 70, 70), FL(350, 380, 80, 70), G(520, 280)], S: [t1, t2a, t2b, t3, sDoor], D: DR(), T: [T(60, 999, () => t1.vx = -4.5), T(220, 999, () => { t2a.vx = -4; t2b.vx = -4; }), T(490, 999, () => t3.vx = -6), T(590, 999, () => sDoor.on = 1)] }; },

    // ═════════════════════════════════════════════════════════════════════════
    // CHẶNG 3 (Màn 21 - 30): BẪY KHÔNG GIAN, LEO THÁP & TRÙM GIỮA CHẶNG
    // ═════════════════════════════════════════════════════════════════════════
    /* 21 (Cũ: 3)  */ () => { const hs = [P(200, 330, 70, 16, { hide: 1 }), P(310, 290, 70, 16, { hide: 1 }), FL(420, 320, 70, 16, { hide: 1 }), P(530, 350, 70, 16, { hide: 1 })], drop = S(360, 0, 32, 32, { dn: 1 }), sEnd = SP(680, { on: 0 }); return { n: 'Màn 21: Cầu tàng hình', h: 'Có những thứ thấy được mà không có thật', P: [G(0, 150), G(650, 150), ...hs, P(300, 360, 90, 14, { fake: 1 }), P(450, 370, 90, 14, { fake: 1 })], S: [drop, sEnd], D: { x: 735, y: 320 }, T: [T(290, 999, () => drop.vy = 16), T(590, 999, () => sEnd.on = 1)] }; },
    /* 22 (Cũ: 41) */ () => { const drop = S(330, 0, 32, 32, { dn: 1 }), sDoor = SP(705, { on: 0 }); return { n: 'Màn 22: Sàn kính', h: 'Sàn trông chắc chắn lắm', P: [P(0, 380, 800, 70, { fake: 1 }), G(0, 120), HP(170, 380, 80), HP(300, 380, 80), FL(430, 380, 80, 70, { hide: 1 }), HP(560, 380, 80), G(700, 100)], S: [drop, sDoor], D: DR(750), T: [T(250, 999, () => drop.vy = 16), T(620, 999, () => sDoor.on = 1)] }; },
    /* 23 (Cũ: 20) */ () => { const drop = S(460, 0, 30, 30, { dn: 1 }), sDoor = SP(700, { on: 0 }); return { n: 'Màn 23: Ảo giác', h: 'Đường lên trông rất hấp dẫn', P: [G(0, 150), G(720, 80), P(160, 320, 80, 14, { fake: 1 }), P(270, 260, 80, 14, { fake: 1 }), P(380, 200, 80, 14, { fake: 1 }), P(490, 140, 80, 14, { fake: 1 }), HP(190, 350), HP(300, 330), FL(410, 350, 70, 16, { hide: 1 }), HP(520, 330), HP(630, 350)], S: [drop, sDoor], D: DR(745), T: [T(360, 999, () => drop.vy = 16), T(600, 999, () => sDoor.on = 1)] }; },
    /* 24 (Cũ: 24) */ () => { const s = [220, 340, 460, 580].map(a => SP(a)), e = SP(700, { on: 0 }); return { n: 'Màn 24: Rừng gai', h: 'Mỗi cú nhảy là một canh bạc', P: [G(0, 260), FL(260, 380, 70, 70), G(330, 170), FL(500, 380, 70, 70), G(570, 230)], S: [...s, e], D: DR(750), T: [T(440, 999, () => { L.rev = 1; L.h = 'Gió đổi chiều! Điều khiển đảo ngược!'; }), T(610, 999, () => { L.rev = 0; L.h = 'Đã bình thường!'; }), T(650, 999, () => e.on = 1)] }; },
    /* 25 (Cũ: 43) */ () => { const drop = S(485, 0, 32, 32, { dn: 1 }), sDoor = SP(660, { on: 0 }); return { n: 'Màn 25: Bức tường', h: 'Phải trèo qua mới được', P: [G(0, 190), P(190, 330, 80, 16, { fl: 1 }), P(290, 280, 80, 16, { fl: 1 }), P(390, 230, 80, 16, { fl: 1 }), P(480, 150, 40, 230), FL(530, 380, 80, 70), G(610, 190)], S: [drop, sDoor], D: DR(), T: [T(390, 999, () => drop.vy = 16), T(530, 999, () => sDoor.on = 1)] }; },
    /* 26 (Cũ: 9)  */ () => { const hs = [P(150, 320, 90, 16), P(290, 270, 90, 16, { fl: 1 }), P(430, 220, 90, 16), P(580, 170, 90, 16, { fl: 1 }), P(700, 120, 100, 16)], s = S(465, 190, 30, 30, { on: 0 }), drop = S(440, 0, 30, 30, { dn: 1 }), sTop = S(720, 90, 30, 30, { on: 0 }); return { n: 'Màn 26: Leo tháp', h: 'Đừng nhìn xuống', P: [G(0, 100), ...hs], S: [s, drop, sTop], D: { x: 765, y: 60 }, T: [T(380, 999, () => drop.vy = 16), T(410, 999, () => s.on = 1), T(650, 999, () => sTop.on = 1)] }; },
    /* 27 (Cũ: 19) */ () => { const p = [0, 1, 2, 3, 4].map(i => FL(150 + i * 110, 320 - i * 40, 80, 16)), rocket = S(800, 160, 30, 30), sTop = S(715, 90, 30, 30, { on: 0 }); return { n: 'Màn 27: Tháp rơi', h: 'Leo nhanh lên', P: [G(0, 100), ...p, P(700, 120, 100, 16)], S: [rocket, sTop], D: { x: 745, y: 60 }, T: [T(420, 999, () => rocket.vx = -4.5), T(640, 999, () => sTop.on = 1)] }; },
    /* 28 (Cũ: 8)  */ () => { const c = S(0, -40, 800, 40, { dn: 1, on: 0 }), sDoor = SP(690, { on: 0 }); return { n: 'Màn 28: Trần hạ xuống', h: 'Trần nhà có vẻ đang nặng...', P: [G(0, 340), FL(340, 380, 80, 70), G(420, 380)], S: [c, S(440, 350, 30, 30), S(590, 350, 30, 30), sDoor], D: { x: 740, y: 320 }, T: [T(150, 999, () => { c.on = 1; c.vy = 1.6; L.h = 'Trần đang hạ xuống! CHẠY ĐI!' }), T(610, 999, () => sDoor.on = 1)] }; },
    /* 29 (Cũ: 25) */ () => { const a = S(285, 0, 36, 34, { dn: 1 }), b = S(525, 0, 36, 34, { dn: 1 }), c = S(400, 0, 36, 34, { dn: 1 }); return { n: 'Màn 29: Đảo mây', h: 'Trên đầu cũng có chuyện', P: [G(0, 100), P(150, 340, 70, 16), P(270, 320, 70, 16), FL(390, 300, 70, 16), P(510, 320, 70, 16), P(630, 340, 70, 16), G(730, 70)], S: [a, b, c], D: DR(745), T: [T(230, 999, () => a.vy = 14), T(340, 999, () => c.vy = 15), T(470, 999, () => b.vy = 14), T(480, 999, () => { L.rev = 1; L.h = 'Gió lốc! Đảo ngược điều khiển!'; }), T(610, 999, () => { L.rev = 0; L.h = 'Đã bình thường!'; })] }; },
    /* 30 (Cũ: 5)  */ () => { const t = [160, 290, 420, 550].map(a => FL(a, 380, 90, 70)), d = { x: 735, y: 320 }, hs = [P(610, 300, 60, 14, { hide: 1 }), FL(680, 235, 60, 14, { hide: 1 }), P(745, 170, 55, 14, { hide: 1 })], s = S(690, 350, 30, 30, { on: 0 }), c = S(660, 0, 36, 34, { dn: 1 }); return { n: 'Màn 30: Trùm giữa chặng', h: 'Sàn không bền đâu...', P: [G(0, 120), ...t, G(680, 120), ...hs], S: [s, c], D: d, T: [T(620, 999, () => { d.x = 752; d.y = 110; s.on = 1; c.vy = 16; L.h = 'Cửa chạy mất lên trời!' })] }; },

    // ═════════════════════════════════════════════════════════════════════════
    // CHẶNG 4 (Màn 31 - 40): ĐẢO NGƯỢC ĐIỀU KHIỂN & BẪY TRUY ĐUỔI TỐC ĐỘ
    // ═════════════════════════════════════════════════════════════════════════
    /* 31 (Cũ: 4)  */ () => { const w = S(-70, 0, 60, 450, { on: 0, wl: 1 }), sDoor = SP(680, { on: 0 }); return { n: 'Màn 31: Lộn ngược', h: 'Trái hay phải nhỉ?', P: [G(0, 320), FL(320, 380, 80, 70), G(400, 400)], S: [w, S(450, 350, 30, 30), S(600, 350, 30, 30), sDoor], D: { x: 740, y: 320 }, T: [T(250, 999, () => { L.rev = 1; w.on = 1; w.vx = 2.0; L.h = 'ĐIỀU KHIỂN BỊ ĐẢO NGƯỢC!' }), T(610, 999, () => sDoor.on = 1)] }; },
    /* 32 (Cũ: 17) */ () => { const drop = S(430, 0, 36, 34, { dn: 1 }); return { n: 'Màn 32: Trái phải đổi chỗ', h: 'Hôm nay trái phải thế nào?', P: [G(0, 280), FL(280, 380, 80, 70), G(360, 160), FL(520, 380, 80, 70), G(600, 200)], S: [SP(260), SP(440), SP(600), drop], D: DR(), T: [150, 340, 500, 660].map(a => T(a, 999, () => L.rev ^= 1)).concat([T(360, 999, () => drop.vy = 16)]) }; },
    /* 33 (Cũ: 16) */ () => { const w = S(-80, 0, 60, 450, { wl: 1, on: 1, vx: 1.25 }), drop = S(410, 0, 32, 32, { dn: 1 }); return { n: 'Màn 33: Cầu ma', h: 'Tin vào cái bóng mờ', P: [G(0, 150), G(720, 80), HP(190, 340), HP(300, 300), FL(410, 260, 70, 16, { hide: 1 }), HP(520, 300), HP(630, 340), P(320, 330, 80, 14, { fake: 1 }), P(470, 330, 80, 14, { fake: 1 })], S: [w, drop], D: DR(745), T: [T(320, 999, () => drop.vy = 15)] }; },
    /* 34 (Cũ: 22) */ () => { const c = S(0, -40, 800, 40, { dn: 1, on: 0 }), sDoor = SP(690, { on: 0 }); return { n: 'Màn 34: Trần hạ, hố mở', h: 'Nhìn lên làm gì?', P: [G(0, 290), FL(290, 380, 90, 70), G(380, 420)], S: [c, SP(480), SP(640), sDoor], D: DR(), T: [T(100, 999, () => { c.on = 1; c.vy = 1.5; L.h = 'Trần đang hạ xuống!' }), T(320, 999, () => { L.rev = 1; L.h = 'Trần hạ & Đảo ngược!' }), T(520, 999, () => { L.rev = 0; L.h = 'Hết đảo ngược!' }), T(600, 999, () => sDoor.on = 1)] }; },
    /* 35 (Cũ: 26) */ () => { const t = [150, 260, 370, 480].map(a => FL(a, 380, 90)), s1 = SP(650, { on: 0 }), s2 = SP(770, { on: 0 }), drop = S(370, 0, 32, 32, { dn: 1 }); return { n: 'Màn 35: Sàn sụp, tay chân lộn', h: 'Đừng dừng lại', P: [G(0, 110), ...t, G(600, 200)], S: [s1, s2, drop], D: DR(), T: [T(160, 999, () => { L.rev = 1; L.h = 'Điều khiển đảo ngược!' }), T(280, 999, () => drop.vy = 16), T(570, 999, () => { L.rev = 0; L.h = 'Tạm ổn... chưa chắc' }), T(600, 999, () => { s1.on = 1; s2.on = 1; })] }; },
    /* 36 (Cũ: 27) */ () => { const a = S(360, 350, 30, 30, { on: 0 }), b = S(550, 350, 30, 30, { on: 0 }), drop = S(490, 0, 30, 30, { dn: 1 }), sDoor = SP(710, { on: 0 }); return { n: 'Màn 36: Vực sâu lộn ngược', h: 'Cẩn thận vực sâu thứ 2!', P: [G(0, 150), G(290, 100), FL(480, 380, 100, 70), G(640, 160)], S: [a, b, drop, sDoor], D: DR(750), T: [T(260, 999, () => a.on = 1), T(300, 999, () => { L.rev = 1; L.h = 'VỰC 2 BỊ ĐẢO NGƯỢC! BẤM TRÁI ĐỂ NHẢY!'; }), T(460, 999, () => drop.vy = 16), T(475, 999, () => { L.rev = 0; b.on = 1; L.h = 'ĐÃ BÌNH THƯỜNG TRỞ LẠI!'; }), T(660, 999, () => sDoor.on = 1)] }; },
    /* 37 (Cũ: 42) */ () => { const m = [0, 1, 2, 3, 4, 5].map(i => S(380 + i * 70, -40, 30, 30, { dn: 1 })), sDoor = SP(700, { on: 0 }); return { n: 'Màn 37: Thiên thạch', h: 'Bầu trời đang rơi', P: [G(0, 260), FL(260, 380, 80, 70), G(340, 130), FL(470, 380, 80, 70), G(550, 250)], S: [...m, sDoor], D: DR(), T: m.map((q: any, i: number) => T(100 + i * 85, 999, () => { q.vx = -2; q.vy = 9 })).concat([T(620, 999, () => sDoor.on = 1)]) }; },
    /* 38 (Cũ: 44) */ () => { const w = S(0, 450, 800, 90, { wl: 1, on: 0 }), sTrap = S(560, 110, 30, 30, { on: 0 }); return { n: 'Màn 38: Nước dâng', h: 'Leo lên, nhanh!', P: [G(), P(120, 320, 100, 16), P(260, 260, 100, 16), FL(400, 200, 100, 16), P(540, 140, 100, 16), P(680, 80, 120, 16)], S: [w, sTrap], D: { x: 735, y: 20 }, T: [T(100, 999, () => { w.on = 1; w.vy = -.95; L.h = 'Nước dâng! Leo lên!' }), T(480, 999, () => sTrap.on = 1)] }; },
    /* 39 (Cũ: 32) */ () => { const c = S(0, -40, 800, 40, { dn: 1, on: 0 }), sMid = S(470, 290, 30, 30), sDoor = SP(680, { on: 0 }); return { n: 'Màn 39: Bóng đè', h: 'Trần hạ rồi, tay còn phản bội', P: [G(0, 350), FL(350, 380, 90, 70), G(440, 360)], S: [c, SP(450), sMid, SP(600), sDoor], D: DR(), T: [T(100, 999, () => { c.on = 1; c.vy = 1.35 }), T(280, 999, () => { L.rev = 1; L.h = 'Điều khiển đảo ngược!' }), T(530, 999, () => L.rev = 0), T(620, 999, () => sDoor.on = 1)] }; },
    /* 40 (Cũ: 28) */ () => { const w = S(-70, 0, 60, 450, { wl: 1, vx: 2.4 }), rocket = S(800, 350, 30, 30); return { n: 'Màn 40: Kẻ đuổi bắt', h: 'Chạy đi, đừng ngoảnh lại', sx: 100, P: [G(0, 250), FL(250, 380, 90, 70), G(340, 460)], S: [w, SP(480), SP(620), rocket], D: DR(), T: [T(340, 999, () => { L.rev = 1; L.h = 'TƯỜNG GAI ĐUỔI KÌA! BẤM TRÁI ĐỂ CHẠY TIẾP!'; }), T(460, 999, () => rocket.vx = -4.5)] }; },

    // ═════════════════════════════════════════════════════════════════════════
    // CHẶNG 5 (Màn 41 - 50): THỬ THÁCH CỰC ĐẠI & CHUỖI SIÊU TRÙM PHÁ ĐẢO
    // ═════════════════════════════════════════════════════════════════════════
    /* 41 (Cũ: 46) */ () => { const drop1 = S(320, 0, 32, 32, { dn: 1 }), drop2 = S(530, 0, 32, 32, { dn: 1 }), s1 = SP(690, { on: 0 }), s2 = SP(770, { on: 0 }); return { n: 'Màn 41: Chóng mặt', h: 'Trái? Phải? Ai biết', P: [G(0, 240), FL(240, 380, 80, 70), G(320, 130), FL(450, 380, 80, 70), G(530, 270)], S: [SP(300), SP(500), SP(650), drop1, drop2, s1, s2], D: DR(), T: [110, 210, 310, 410, 510, 610].map(a => T(a, 999, () => L.rev ^= 1)).concat([T(260, 999, () => drop1.vy = 16), T(470, 999, () => drop2.vy = 16), T(630, 999, () => { s1.on = 1; s2.on = 1; })]) }; },
    /* 42 (Cũ: 39) */ () => { const w = S(-70, 0, 60, 450, { wl: 1, on: 0 }), drop = S(415, 0, 32, 32, { dn: 1 }); return { n: 'Màn 42: Cầu ma ngược', h: 'Cầu ma, bản ngược và có kẻ đuổi', P: [G(0, 150), G(720, 80), HP(190, 340), HP(300, 300), FL(410, 340, 70, 16, { hide: 1 }), HP(520, 300), HP(630, 340)], S: [w, drop], D: DR(745), T: [T(120, 999, () => { L.rev = 1; w.on = 1; w.vx = 1.35 }), T(330, 999, () => drop.vy = 16)] }; },
    /* 43 (Cũ: 45) */ () => { const t = [1, 2, 3, 4, 5, 6, 7].map(i => FL(i * 80, 380, 80)), s = [260, 420, 580].map(a => SP(a, { on: 0 })), drop = S(420, 0, 32, 32, { dn: 1 }); return { n: 'Màn 43: Sàn sụp, gai trồi', h: 'Vừa chạy vừa nhảy', P: [G(0, 80), ...t, G(640, 160)], S: [...s, drop], D: DR(750), T: s.map(p => T(p.x - 70, 999, () => p.on = 1)).concat([T(290, 999, () => { L.rev = 1; L.h = 'Đảo ngược trên sàn sụp!'; }), T(360, 999, () => drop.vy = 16), T(540, 999, () => { L.rev = 0; L.h = 'Bình thường trở lại!'; })]) }; },
    /* 44 (Cũ: 48) */ () => { const w = S(-70, 0, 60, 450, { wl: 1, vx: 2.3 }), a = S(420, 0, 36, 34, { dn: 1 }), b = S(560, 0, 36, 34, { dn: 1 }), s1 = SP(695, { on: 0 }), s2 = SP(770, { on: 0 }); return { n: 'Màn 44: Đuổi bắt 2', h: 'Chạy, chạy, vẫn chạy', sx: 80, P: [G(0, 250), FL(250, 380, 90, 70), G(340, 460)], S: [w, a, b, SP(520), SP(640), s1, s2], D: DR(), T: [T(310, 999, () => { L.rev = 1; L.h = 'Bị đuổi & Đảo ngược!'; }), T(340, 999, () => a.vy = 17), T(480, 999, () => b.vy = 17), T(520, 999, () => { L.rev = 0; s1.on = 1; s2.on = 1; })] }; },
    /* 45 (Cũ: 49) */ () => { const sDoor = SP(690, { on: 0 }), drop1 = S(320, 0, 32, 32, { dn: 1 }), drop2 = S(530, 0, 32, 32, { dn: 1 }); return { n: 'Màn 45: Gương vỡ', h: 'Mọi thứ đều ngược', P: [G(0, 200), FL(200, 380, 90, 70), G(290, 110), FL(400, 380, 90, 70), G(490, 310)], S: [SP(560), sDoor, drop1, drop2], D: DR(), T: [T(0, 999, () => L.rev = 1), T(240, 999, () => drop1.vy = 16), T(440, 999, () => drop2.vy = 16), T(600, 999, () => sDoor.on = 1)] }; },
    /* 46 (Cũ: 40) */ () => { const w = S(-75, 0, 60, 450, { wl: 1, on: 1, vx: 1.35 }), t = [140, 250, 360, 470].map(a => FL(a, 380, 90)), c = [[270, 210], [380, 320], [490, 430]].map(([a, b]) => [S(a, 0, 36, 34, { dn: 1 }), b]), s = SP(640, { on: 0 }); return { n: 'Màn 46: Trùm chặng 4', h: 'Sàn sụp, trần rơi', P: [G(0, 100), ...t, G(580, 220)], S: [w, ...c.map((e: any) => e[0]), s], D: DR(765), F: [FK(715)], T: [...c.map(([q, b]: any) => T(b, 999, () => q.vy = 16)), T(260, 999, () => { L.rev = 1; L.h = 'Đảo ngược giữa mưa gai!'; }), T(480, 999, () => { L.rev = 0; L.h = 'Hết đảo ngược!'; }), T(600, 999, () => s.on = 1)] }; },
    /* 47 (Cũ: 29) */ () => { const w = S(-70, 0, 60, 450, { wl: 1, on: 1, vx: 1.3 }), t = [150, 260].map(a => FL(a, 380, 90)), drop = S(460, 0, 30, 30, { dn: 1 }), sTop = S(555, 220, 30, 30, { on: 0 }), sDoor = SP(685, { on: 0 }); return { n: 'Màn 47: Tổng hợp', h: 'Cửa đầu tiên không phải cửa thật', P: [G(0, 110), ...t, HP(370, 300), HP(460, 250), HP(550, 300), G(640, 160)], S: [w, drop, sTop, sDoor], D: DR(765), F: [FK(715)], T: [T(280, 999, () => { L.rev = 1; L.h = 'Đảo ngược nữa rồi!' }), T(390, 999, () => drop.vy = 16), T(490, 999, () => sTop.on = 1), T(590, 999, () => { L.rev = 0; sDoor.on = 1; })] }; },
    /* 48 (Cũ: 10) */ () => { const w = S(-70, 0, 60, 450, { wl: 1, on: 1, vx: 1.35 }), t = [150, 260, 370].map(a => FL(a, 380, 90)), c = S(640, 0, 40, 34, { dn: 1 }), s = S(570, 350, 30, 30, { on: 0 }), rocket = S(800, 200, 30, 30), hs = [P(620, 300, 60, 14, { hide: 1 }), FL(690, 235, 60, 14, { hide: 1 }), P(740, 170, 60, 14, { hide: 1 })]; return { n: 'Màn 48: Đại thử thách', h: 'Mọi trò đều có mặt ở đây', P: [G(0, 110), ...t, G(500, 300), ...hs], S: [w, c, s, rocket], D: { x: 765, y: 110 }, F: [{ x: 740, y: 320, w: 30, h: 60 }], T: [T(190, 999, () => { L.rev = 1; L.h = 'Điều khiển đảo ngược... lại nữa!' }), T(530, 999, () => s.on = 1), T(600, 999, () => c.vy = 18), T(640, 999, () => rocket.vx = -4)] }; },
    /* 49 (Cũ: 30) */ () => { const w = S(-70, 0, 60, 450, { wl: 1, on: 1, vx: 1.45 }), t = [140, 250, 360].map(a => FL(a, 380, 90)), c1 = S(270, 0, 36, 34, { dn: 1 }), c2 = S(480, 0, 36, 34, { dn: 1 }), s = SP(570, { on: 0 }), sTower = S(630, 270, 30, 30, { on: 0 }), hs = [HP(620, 300, 60), FL(685, 235, 60, 14, { hide: 1 }), HP(740, 170, 60)]; return { n: 'Màn 49: Trùm cuối thật sự', h: 'Không còn đường lui', P: [G(0, 110), ...t, G(500, 300), ...hs], S: [w, c1, c2, s, sTower], D: { x: 765, y: 110 }, F: [FK(740)], T: [T(180, 999, () => { L.rev = 1; L.h = 'Đảo ngược, bị đuổi!' }), T(220, 999, () => c1.vy = 16), T(440, 999, () => c2.vy = 16), T(530, 999, () => s.on = 1), T(550, 999, () => { L.rev = 0; sTower.on = 1; })] }; },
    /* 50 (Cũ: 50) */ () => { const w = S(-70, 0, 60, 450, { wl: 1, on: 1, vx: 1.55 }), t = [140, 240, 340, 440].map(a => FL(a, 380, 80)), c1 = S(250, 0, 36, 34, { dn: 1 }), c2 = S(350, 0, 36, 34, { dn: 1 }), c3 = S(450, 0, 36, 34, { dn: 1 }), s = SP(610, { on: 0 }), rocket = S(800, 180, 30, 30), hs = [HP(620, 300, 60), FL(680, 235, 60, 14, { hide: 1 }), HP(740, 170, 60)]; return { n: 'Màn 50: Trùm của các trùm', h: 'Đây là màn cuối. Thật đấy.', P: [G(0, 100), ...t, G(540, 260), ...hs], S: [w, c1, c2, c3, s, rocket], D: { x: 765, y: 110 }, F: [FK(690), FK(740)], T: [T(150, 999, () => { L.rev = 1; L.h = 'Đảo ngược!'; c1.vy = 16; }), T(270, 999, () => c2.vy = 16), T(300, 999, () => { L.rev = 0; L.h = 'Bình thường!'; }), T(390, 999, () => c3.vy = 16), T(440, 999, () => { L.rev = 1; L.h = 'Lại đảo ngược!'; }), T(560, 999, () => s.on = 1), T(650, 999, () => rocket.vx = -4.5)] }; },
  ];

  function load() {
    L = LV[lv](); L.rev = 0; L.D.w = 30; L.D.h = 60;
    pl = { x: L.sx || 50, y: L.sy || 340, w: 16, h: 34, vx: 0, vy: 0, g: 0, f: 1, ph: 0 };
    st = 'play'; fx_ = []; skinFx = []; jumpTimer = 0; landTimer = 0; stepTimer = 0;
  }

  function die() {
    if (st !== 'play') return;
    sound.playDeath();
    st = 'dead'; tm = 50; deaths++;
    skinFx = [];
    msg = trolls[Math.random() * trolls.length | 0];
    callbacks.onDie(lv, deaths, Math.floor(playTime));
    for (let i = 0; i < 18; i++)
      fx_.push({ x: pl.x + 8, y: pl.y + 17, vx: (Math.random() - .5) * 9, vy: -Math.random() * 8, r: 2 + Math.random() * 3 });
  }

  const hit = (a: any, b: any, m = 0) =>
    a.x + m < b.x + b.w && a.x + a.w - m > b.x && a.y + m < b.y + b.h && a.y + a.h - m > b.y;

  function upd() {
    fx_.forEach((f: any) => { f.x += f.vx; f.y += f.vy; f.vy += .5; });
    if (st === 'dead') { if (--tm <= 0) load(); return; }
    if (st !== 'play') return;
    [...L.P, ...L.S].forEach((e: any) => {
      if (e.g) e.vy += .6; e.x += e.vx; e.y += e.vy;
      if (e.sy !== undefined && e.vy < 0 && e.y <= e.sy) { e.y = e.sy; e.vy = 0; }
      if (e.ft > 0 && --e.ft === 0) e.g = 1;
    });
    L.T.forEach((t: any) => { if (!t.d && pl.x + 8 > t.a && pl.x + 8 < t.b) { t.d = 1; t.f(); } });
    const activeSkin = resolveActiveSkinId(currentSkin, lv + 1);

    let m = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
    if (L.rev) m = -m;
    pl.vx = m * 4.2; if (m) pl.f = m; pl.ph += Math.abs(pl.vx) * .08;
    pl.x = Math.max(0, Math.min(W - pl.w, pl.x + pl.vx));
    const sol = L.P.filter((p: any) => !p.fake && p.y < H + 100);
    sol.forEach((p: any) => { if (hit(pl, p)) { if (pl.vx > 0) pl.x = p.x - pl.w; else if (pl.vx < 0) pl.x = p.x + p.w; } });

    // Hiệu ứng hạt khi nhân vật di chuyển
    if (pl.g && Math.abs(pl.vx) > 0.5) {
      stepTimer++;
      if (stepTimer % 3 === 0) {
        spawnSkinMoveEffect(skinFx, pl.x + 8, pl.y + pl.h, pl.f, activeSkin, tick);
      }
    } else {
      stepTimer = 0;
    }

    const wasInAir = pl.g === 0;
    const fallVy = pl.vy;

    pl.vy = Math.min(pl.vy + .6, 14); pl.y += pl.vy; pl.g = 0;
    sol.forEach((p: any) => {
      if (hit(pl, p)) {
        if (pl.vy > 0) { pl.y = p.y - pl.h; pl.g = 1; if (p.fl && !p.ft && !p.g) p.ft = 25; }
        else pl.y = p.y + p.h;
        pl.vy = 0;
      }
    });

    // Hiệu ứng tiếp đất (Landing)
    if (wasInAir && pl.g && fallVy > 2.5) {
      landTimer = 7;
      jumpTimer = 0;
      sound.playLand(fallVy / 8);
      spawnSkinLandEffect(skinFx, pl.x + 8, pl.y + pl.h, activeSkin, Math.min(fallVy / 8, 1.5));
    }

    // Hiệu ứng khi nhảy (Jump)
    if ((keys[' '] || keys.ArrowUp || keys.w || keys.W) && pl.g) {
      pl.vy = -12.5;
      pl.g = 0;
      jumpTimer = 8;
      landTimer = 0;
      sound.playJump();
      spawnSkinJumpEffect(skinFx, pl.x + 8, pl.y + pl.h, activeSkin);
    }

    if (jumpTimer > 0) jumpTimer--;
    if (landTimer > 0) landTimer--;

    L.P.forEach((p: any) => { if (p.hide) p.sh = Math.abs(pl.x + 8 - (p.x + p.w / 2)) < 110 && Math.abs(pl.y - p.y) < 220; });
    L.S.forEach((s: any) => { if (s.on && hit(pl, s, 5)) die(); });
    (L.F || []).forEach((f: any) => { if (hit(pl, f)) die(); });
    if (pl.y > H + 40) die();
    if (hit(pl, L.D)) {
      const oldLevelNum = lv + 1; // Màn vừa hoàn thành (ví dụ: 20)
      lv++;
      const newLevelNum = lv + 1; // Màn mới bắt đầu chơi (ví dụ: 21)

      // Tự động kiểm tra và trang bị ngay skin của mốc màn mới (ví dụ 20 -> 21 trang bị Hỏa Thần)
      const milestoneSkin = checkMilestoneLevelSkin(oldLevelNum, newLevelNum);
      if (milestoneSkin) {
        currentSkin = milestoneSkin.id;
        callbacks.onSkinAutoEquipped?.(milestoneSkin, newLevelNum);
      }

      callbacks.onLevelUp(lv, deaths, Math.floor(playTime));
      if (lv >= LV.length) {
        st = 'win';
        sound.playWin();
        callbacks.onWin(deaths, Math.floor(playTime));
      } else {
        sound.playLevelUp();
        load();
      }
    }
  }

  function door(D: any) {
    x.fillStyle = '#f5c542'; x.beginPath(); x.roundRect(D.x, D.y, D.w, D.h, [15, 15, 0, 0]); x.fill();
    x.fillStyle = '#7a5a00'; x.beginPath(); x.arc(D.x + D.w - 8, D.y + D.h / 2 + 6, 2.5, 0, 7); x.fill();
  }

  function draw() {
    x.clearRect(0, 0, W, H);
    L.P.forEach((p: any) => {
      if (p.hide && !p.sh) return;
      x.globalAlpha = p.hide ? .3 : 1;
      x.fillStyle = p.hide ? '#fff' : '#4b3fb5'; x.fillRect(p.x, p.y, p.w, p.h);
      if (!p.hide) { x.fillStyle = '#8a7bff'; x.fillRect(p.x, p.y, p.w, 5); }
      x.globalAlpha = 1;
    });
    L.S.forEach((s: any) => {
      if (!s.on) return;
      x.fillStyle = '#ff5c7a';
      if (s.wl) { x.fillRect(s.x, s.y, s.w, s.h); return; }
      const n = Math.ceil(s.w / 30), w = s.w / n;
      for (let i = 0; i < n; i++) {
        x.beginPath();
        if (s.dn) { x.moveTo(s.x + i * w, s.y); x.lineTo(s.x + (i + 1) * w, s.y); x.lineTo(s.x + (i + .5) * w, s.y + s.h); }
        else { x.moveTo(s.x + i * w, s.y + s.h); x.lineTo(s.x + (i + 1) * w, s.y + s.h); x.lineTo(s.x + (i + .5) * w, s.y); }
        x.fill();
      }
    });
    (L.F || []).forEach(door); door(L.D);
    renderSkinParticles(x, skinFx);
    if (st === 'play') puppet();
    x.fillStyle = '#ff5c7a';
    fx_.forEach((f: any) => { x.beginPath(); x.arc(f.x, f.y, f.r, 0, 7); x.fill(); });
    x.fillStyle = '#e8e4f5'; x.font = `700 17px ${FONT}`; x.textAlign = 'left'; x.fillText(L.n, 16, 28);
    x.textAlign = 'right'; x.font = `400 15px ${FONT}`;
    x.fillText(`⏱ ${formatPlayTime(Math.floor(playTime))}  ·  Số lần chết: ${deaths}`, W - 16, 28);
    x.textAlign = 'center'; x.globalAlpha = .65; x.font = `400 15px ${FONT}`; x.fillText(L.h, W / 2, 60); x.globalAlpha = 1;
    if (st === 'dead') { x.font = `700 32px ${FONT}`; x.fillText(msg, W / 2, H / 2); }
    if (st === 'win') {
      x.fillStyle = 'rgba(10,8,20,.88)'; x.fillRect(0, 0, W, H); x.fillStyle = '#f5c542';
      x.font = `700 30px ${FONT}`; x.fillText(`Bạn đã vượt qua cả ${LV.length} màn!`, W / 2, 175);
      x.fillStyle = '#e8e4f5'; x.font = `400 18px ${FONT}`;
      x.fillText('Tổng số lần chết: ' + deaths, W / 2, 215);
      x.fillText('Thời gian hoàn thành: ' + formatPlayTime(Math.floor(playTime)), W / 2, 252);
      x.font = `400 16px ${FONT}`;
      x.fillText('Nhấn Enter hoặc chạm màn hình để chơi lại từ đầu', W / 2, 290);
    }
  }

  function puppet() {
    const cx = pl.x + 8, y = pl.y, s = Math.sin(pl.ph) * (pl.g ? 6 : 3), o = pl.g ? 0 : -4;
    const activeSkin = resolveActiveSkinId(currentSkin, lv + 1);
    let scaleX = 1;
    let scaleY = 1;
    if (landTimer > 0) {
      const factor = landTimer / 7;
      scaleX = 1 + 0.22 * factor;
      scaleY = 1 - 0.22 * factor;
    } else if (jumpTimer > 0) {
      const factor = jumpTimer / 8;
      scaleX = 1 - 0.12 * factor;
      scaleY = 1 + 0.18 * factor;
    }
    drawPuppetSkin(x, cx, y, s, o, pl.f, activeSkin, tick, scaleX, scaleY);
  }

  load();
  let last = 0, acc = 0, rafId = 0;
  let lastTime = performance.now();

  function loop(t: number) {
    tick++;
    const dt = Math.min((t - lastTime) / 1000, 0.1);
    lastTime = t;
    if (st === 'play') {
      playTime += dt;
    }

    acc += Math.min(t - last, 100); last = t;
    while (acc >= 16.67) { upd(); acc -= 16.67; }
    draw();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  return {
    get lv() { return lv; },
    get deaths() { return deaths; },
    get playTime() { return Math.floor(playTime); },
    get st() { return st; },
    get skin() { return currentSkin; },
    setSkin(newSkin: string) { currentSkin = newSkin; },
    pressKey(k: string) {
      if (k === 'r' || k === 'R') {
        die();
        return;
      }
      keys[k] = 1;
    },
    releaseKey(k: string) { delete keys[k]; },
    clearKeys() { keys = {}; },
    die() { die(); },
    restart() { lv = 0; deaths = 0; playTime = 0; load(); },
    restartFrom(level: number, savedDeaths: number, savedPlayTime = 0) {
      lv = Math.max(0, Math.min(level - 1, LV.length - 1));
      deaths = savedDeaths;
      playTime = savedPlayTime;
      load();
    },
    destroy() { cancelAnimationFrame(rafId); },
  };
}

// ─── React Component ──────────────────────────────────────────────────────────

export default function GameCanvas({
  initialLevel = 1,
  initialDeaths = 0,
  initialPlayTime = 0,
  playerName: initialPlayerName = '',
  onBackToHome,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReturnType<typeof createGameEngine> | null>(null);

  const [playerName, setPlayerNameState] = useState(initialPlayerName || getPlayerName());
  const [playerAvatar, setPlayerAvatarState] = useState(getPlayerAvatar());
  const [selectedAvatar, setSelectedAvatar] = useState(playerAvatar);
  const [syncStatus, setSyncStatus] = useState<{ text: string; type: string }>({
    text: 'Đã sẵn sàng',
    type: 'success',
  });
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [currentSkin, setCurrentSkin] = useState('auto');
  const [showSkinModal, setShowSkinModal] = useState(false);
  const [skinToast, setSkinToast] = useState<{
    title: string;
    message: string;
    icon?: string;
  } | null>(null);

  useEffect(() => {
    if (!skinToast) return;
    const timer = setTimeout(() => setSkinToast(null), 4000);
    return () => clearTimeout(timer);
  }, [skinToast]);

  useEffect(() => {
    setCurrentSkin(getSelectedSkin());
    fetchSkinsFromDb();
  }, []);

  const handleSelectSkin = (skinId: string) => {
    setSelectedSkin(skinId);
    setCurrentSkin(skinId);
    engineRef.current?.setSkin(skinId);
    updatePlayerSkin(skinId);
  };

  const updateSync = useCallback((text: string, type: string) => {
    setSyncStatus({ text, type });
  }, []);

  const handleSave = useCallback(
    async (lv: number, deaths: number, playTime: number, immediate = false) => {
      const currentName = getPlayerName();
      if (!currentName) return;
      updateSync('Đang lưu...', 'saving');
      try {
        await savePlayerProgress(lv, deaths, playTime, immediate);
        updateSync('Đã đồng bộ ✓', 'success');
      } catch {
        updateSync('Lỗi lưu', 'error');
      }
    },
    [updateSync]
  );

  // Mobile pad controls: quản lý điều hướng mượt mà, hỗ trợ vuốt ngón tay liên tục giữa Trái/Phải
  const grpRef = useRef<HTMLDivElement>(null);
  const btnLeftRef = useRef<HTMLButtonElement>(null);
  const btnRightRef = useRef<HTMLButtonElement>(null);
  const activeDirRef = useRef<'ArrowLeft' | 'ArrowRight' | null>(null);
  const [activeDir, setActiveDir] = useState<'ArrowLeft' | 'ArrowRight' | null>(null);
  const [isJumping, setIsJumping] = useState(false);

  const setDirection = useCallback((dir: 'ArrowLeft' | 'ArrowRight' | null) => {
    if (activeDirRef.current === dir) return;
    const prev = activeDirRef.current;
    if (prev) {
      engineRef.current?.releaseKey(prev);
    }
    if (dir) {
      engineRef.current?.pressKey(dir);
    }
    activeDirRef.current = dir;
    setActiveDir(dir);
  }, []);

  const handlePadTouch = useCallback((clientX: number, clientY: number) => {
    // 1. Kiểm tra trực tiếp phần tử dưới tọa độ chạm (hoạt động chính xác trên cả màn hình xoay 90° lẫn không xoay)
    if (typeof document !== 'undefined') {
      const el = document.elementFromPoint(clientX, clientY);
      const dir = el?.closest('button[data-dir]')?.getAttribute('data-dir');
      if (dir === 'ArrowLeft' || dir === 'ArrowRight') {
        setDirection(dir);
        return;
      }
    }

    // 2. Nếu chạm ở khoảng giữa 2 nút hoặc hơi chệch ra ngoài: tính khoảng cách tới tâm 2 nút
    const leftEl = btnLeftRef.current;
    const rightEl = btnRightRef.current;
    if (!leftEl || !rightEl) return;

    const rL = leftEl.getBoundingClientRect();
    const rR = rightEl.getBoundingClientRect();

    const cLx = (rL.left + rL.right) / 2;
    const cLy = (rL.top + rL.bottom) / 2;
    const cRx = (rR.left + rR.right) / 2;
    const cRy = (rR.top + rR.bottom) / 2;

    const distL = (clientX - cLx) ** 2 + (clientY - cLy) ** 2;
    const distR = (clientX - cRx) ** 2 + (clientY - cRy) ** 2;

    const centerDist = Math.hypot(cRx - cLx, cRy - cLy);
    const maxRadius = Math.max(centerDist * 1.8, 85);

    if (distL > maxRadius ** 2 && distR > maxRadius ** 2) {
      setDirection(null);
      return;
    }

    if (distL < distR) {
      setDirection('ArrowLeft');
    } else {
      setDirection('ArrowRight');
    }
  }, [setDirection]);

  // Khởi chạy game engine tại đúng initialLevel, initialDeaths và initialPlayTime
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createGameEngine(
      canvas,
      {
        onDie: (lv, deaths, playTime) => handleSave(lv, deaths, playTime, false),
        onLevelUp: (lv, deaths, playTime) => handleSave(lv, deaths, playTime, true),
        onWin: (deaths, playTime) => handleSave(49, deaths, playTime, true),
        onSkinAutoEquipped: (newSkin, newLevelNum) => {
          setSelectedSkin(newSkin.id);
          setCurrentSkin(newSkin.id);
          updatePlayerSkin(newSkin.id, newSkin.uuid);
          setSkinToast({
            icon: newSkin.icon || '👕',
            title: 'Trang Phục Tự Động Kích Hoạt!',
            message: `Màn ${newLevelNum}: Đã tự động trang bị ${newSkin.icon} ${newSkin.name}!`,
          });
        },
      },
      initialLevel,
      initialDeaths,
      initialPlayTime,
      getSelectedSkin()
    );
    engineRef.current = engine;

    const currentName = getPlayerName();
    if (currentName) {
      setPlayerNameState(currentName);
    }

    // Keyboard events
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      engine.pressKey(e.key);
      if (e.key === 'Enter' && engine.st === 'win') {
        engine.restart();
        handleSave(0, 0, 0, true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => engine.releaseKey(e.key);
    const onBlur = () => {
      engine.clearKeys();
      setDirection(null);
      setIsJumping(false);
    };

    // Lưu tiến trình thời gian thực khi F5 hoặc đóng tab
    const onBeforeUnload = () => {
      if (engine && getPlayerName()) {
        savePlayerProgress(engine.lv, engine.deaths, engine.playTime, true);
      }
    };

    // Ngăn chặn menu ngữ cảnh (Copy, Tra cứu...) khi nhấn giữ lâu trên mobile
    const preventContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    // Ngăn chặn bôi đen văn bản khi chơi game
    const preventSelectStart = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    // Khóa cử chỉ zoom và cuộn màn hình khi đang chơi game trên mobile
    const preventPinchZoom = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    let lastTap = 0;
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      const now = Date.now();
      if (now - lastTap < 320) {
        e.preventDefault();
      }
      lastTap = now;
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    const preventTouchMove = (e: TouchEvent) => {
      // Chỉ chặn cuộn nếu không phải bên trong modal cuộn
      const target = e.target as HTMLElement | null;
      if (target && target.closest('.modal-card, .skin-grid-container, .lb-table-container, .modal-overlay')) {
        return;
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeunload', onBeforeUnload);

    window.addEventListener('contextmenu', preventContextMenu);
    window.addEventListener('selectstart', preventSelectStart);

    window.addEventListener('touchstart', preventPinchZoom, { passive: false });
    window.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
    window.addEventListener('touchmove', preventTouchMove, { passive: false });
    window.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('gesturestart', preventGesture as any);
    document.addEventListener('gesturechange', preventGesture as any);
    document.addEventListener('gestureend', preventGesture as any);

    return () => {
      engine.destroy();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);

      window.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('selectstart', preventSelectStart);

      window.removeEventListener('touchstart', preventPinchZoom);
      window.removeEventListener('touchend', preventDoubleTapZoom);
      window.removeEventListener('touchmove', preventTouchMove);
      window.removeEventListener('wheel', onWheel);
      document.removeEventListener('gesturestart', preventGesture as any);
      document.removeEventListener('gesturechange', preventGesture as any);
      document.removeEventListener('gestureend', preventGesture as any);
    };
  }, [handleSave, initialLevel, initialDeaths, initialPlayTime, setDirection]);

  // Chơi lại từ đầu: đưa tiến trình về màn 1, 0 lần chết, 0 giây và lưu lại
  const handleRestartAll = () => {
    setShowRestartConfirm(false);
    engineRef.current?.restart();
    handleSave(0, 0, 0, true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setErrorToast('Vui lòng nhập tên!');
      return;
    }
    const res = await registerOrFindPlayer(trimmed, selectedAvatar);
    setPlayerName(res.name);
    setPlayerNameState(res.name);
    setPlayerAvatar(res.avatar);
    setPlayerAvatarState(res.avatar);
    setShowNameModal(false);
    handleSave(
      engineRef.current?.lv ?? 0,
      engineRef.current?.deaths ?? 0,
      engineRef.current?.playTime ?? 0,
      true
    );
  };

  const syncColor: Record<string, string> = {
    success: '#51cf66',
    saving: '#fcc419',
    warning: '#adb5bd',
    error: '#ff6b6b',
  };

  return (
    <div className="game-wrapper">
      {/* Top bar */}
      <div className="top-bar">
        <div className="top-left">
          {onBackToHome && (
            <button
              className="btn-back-home"
              onClick={onBackToHome}
              title="Quay lại Trang Chủ"
            >
              🏠 Trang Chủ
            </button>
          )}

          <div className="player-info">
            <button
              className="player-tag"
              onClick={() => {
                setNameInput(playerName);
                setSelectedAvatar(playerAvatar);
                setShowNameModal(true);
              }}
              title="Nhấn để đổi tên & avatar"
            >
              <AvatarDisplay avatar={playerAvatar} size={22} />
              <span>{playerName || 'Chưa đặt tên'}</span>
              <span>✎</span>
            </button>
            <span className="status-tag" style={{ color: syncColor[syncStatus.type] || '#adb5bd' }}>
              {syncStatus.text}
            </span>
          </div>
        </div>

        <div className="top-right">
          <SoundButton className="desktop-sound-btn" size="sm" />
          <button
            className="btn-action btn-skin-toggle"
            onClick={() => setShowSkinModal(true)}
            title="Tủ đồ trang phục (Skins)"
          >
            👕 Skin
          </button>
          <button className="btn-action" onClick={() => setShowRestartConfirm(true)}>
            🔁 Chơi lại từ đầu
          </button>
          <button className="btn-action" onClick={() => setShowLeaderboard(true)}>
            🏆 Bảng Xếp Hạng
          </button>
        </div>
      </div>

      {showRestartConfirm && (
        <Toast
          type="warning"
          title="Xác nhận chơi lại từ đầu?"
          message="Toàn bộ tiến trình hiện tại (màn chơi, số lần chết, thời gian) sẽ bị xóa và bạn bắt đầu lại từ Màn 1."
          closeLabel="Hủy"
          confirmLabel="🔁 Chơi lại"
          onConfirm={handleRestartAll}
          onClose={() => setShowRestartConfirm(false)}
        />
      )}

      {errorToast && (
        <Toast
          type="error"
          title="Có lỗi xảy ra"
          message={errorToast}
          onClose={() => setErrorToast(null)}
        />
      )}

      {skinToast && (
        <Toast
          type="success"
          icon={skinToast.icon || '👕'}
          title={skinToast.title}
          message={skinToast.message}
          closeLabel="Tuyệt vời!"
          onClose={() => setSkinToast(null)}
        />
      )}

      {/* Canvas */}
      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          id="c"
          width={800}
          height={450}
          className="game-canvas"
          onPointerDown={() => {
            void enterLandscape();
            if (engineRef.current?.st === 'win') {
              engineRef.current.restart();
              handleSave(0, 0, 0, true);
            }
          }}
        />
      </div>

      <p className="hint">
        ← → hoặc A D: di chuyển · Space, W hoặc ↑: nhảy · R: chơi lại màn
        <span className="hint-browser-tip"> · 💡 Nếu lỗi hiển thị, hãy chọn <em>&quot;Mở bằng trình duyệt&quot;</em></span>
      </p>

      {/* Gợi ý cho mobile khi mở qua WebView */}
      <div className="mobile-browser-notice">
        💡 Nếu bị lỗi giao diện hoặc lệch phím, hãy nhấn <strong>⋮</strong> và chọn <strong>&quot;Mở bằng trình duyệt&quot;</strong> (Chrome/Safari) nhé!
      </div>

      {/* Mobile pad */}
      <div id="pad" onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <div
          ref={grpRef}
          className="grp"
          draggable={false}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onPointerDown={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch { }
            sound.unlockAudio();
            void enterLandscape();
            handlePadTouch(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (activeDirRef.current || e.buttons > 0) {
              e.preventDefault();
              handlePadTouch(e.clientX, e.clientY);
            }
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch { }
            setDirection(null);
          }}
          onPointerCancel={() => setDirection(null)}
          onLostPointerCapture={() => setDirection(null)}
        >
          <button
            ref={btnLeftRef}
            type="button"
            data-dir="ArrowLeft"
            className={activeDir === 'ArrowLeft' ? 'on' : ''}
            draggable={false}
            tabIndex={-1}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onPointerDown={(e) => {
              e.preventDefault();
              sound.unlockAudio();
              setDirection('ArrowLeft');
            }}
            aria-label="Sang trái"
          >
            <span className="pad-arrow pad-arrow-left" aria-hidden="true" />
          </button>
          <button
            ref={btnRightRef}
            type="button"
            data-dir="ArrowRight"
            className={activeDir === 'ArrowRight' ? 'on' : ''}
            draggable={false}
            tabIndex={-1}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onPointerDown={(e) => {
              e.preventDefault();
              sound.unlockAudio();
              setDirection('ArrowRight');
            }}
            aria-label="Sang phải"
          >
            <span className="pad-arrow pad-arrow-right" aria-hidden="true" />
          </button>
        </div>

        <div className="pad-center-group">
          <button
            id="rs"
            type="button"
            aria-label="Chơi lại màn"
            draggable={false}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => {
              engineRef.current?.die();
            }}
          >
            <span className="pad-restart" aria-hidden="true" />
          </button>
          <SoundButton className="mobile-sound-btn" size="sm" />
        </div>

        <button
          type="button"
          className={`jump ${isJumping ? 'on' : ''}`}
          aria-label="Nhảy"
          draggable={false}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onPointerDown={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch { }
            sound.unlockAudio();
            void enterLandscape();
            setIsJumping(true);
            engineRef.current?.pressKey('ArrowUp');
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch { }
            setIsJumping(false);
            engineRef.current?.releaseKey('ArrowUp');
          }}
          onPointerCancel={() => {
            setIsJumping(false);
            engineRef.current?.releaseKey('ArrowUp');
          }}
          onLostPointerCapture={() => {
            setIsJumping(false);
            engineRef.current?.releaseKey('ArrowUp');
          }}
        >
          <span className="pad-jump-label">Nhảy</span>
        </button>
      </div>

      {/* Modal sửa tên & Avatar */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Hồ Sơ Người Chơi</h3>
            <p className="modal-desc">Đổi hình đại diện và tên hiển thị trong game:</p>

            {/* Avatar Preview & Upload */}
            <div className="avatar-picker-label">Hình đại diện (Avatar):</div>
            <div className="avatar-preview-box">
              <div className="avatar-preview-circle">
                <AvatarDisplay avatar={selectedAvatar} size={56} />
              </div>
            </div>

            <div className="avatar-picker-label" style={{ marginTop: '8px' }}>
              Hoặc chọn biểu tượng có sẵn:
            </div>
            <div className="avatar-grid">
              {AVATAR_LIST.map((av) => (
                <button
                  key={av}
                  type="button"
                  className={`avatar-option ${selectedAvatar === av ? 'active' : ''}`}
                  onClick={() => setSelectedAvatar(av)}
                >
                  {av}
                </button>
              ))}
            </div>

            <div className="avatar-picker-label">Tên người chơi:</div>
            <input
              className="modal-input"
              placeholder="Ví dụ: Rối Tí Nị..."
              maxLength={20}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              autoFocus
            />
            <div className="modal-buttons">
              <button className="btn-secondary" onClick={() => setShowNameModal(false)}>
                Hủy
              </button>
              <button className="btn-action" onClick={handleSaveName}>
                Lưu hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bảng Xếp Hạng */}
      {showLeaderboard && (
        <LeaderboardModal
          currentPlayerName={playerName}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* Modal Tủ Đồ Trang Phục (Skins) */}
      {showSkinModal && (
        <SkinModal
          currentLevel={(engineRef.current?.lv ?? initialLevel - 1) + 1}
          totalDeaths={engineRef.current?.deaths ?? initialDeaths}
          selectedSkinId={currentSkin}
          onSelectSkin={handleSelectSkin}
          onClose={() => setShowSkinModal(false)}
        />
      )}
    </div>
  );
}
