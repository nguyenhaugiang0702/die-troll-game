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
} from '@/lib/supabase';
import LeaderboardModal from './LeaderboardModal';
import AvatarDisplay from './AvatarDisplay';
import Toast from './Toast';
import { sound } from '@/lib/sound';
import SoundButton from './SoundButton';

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
  },
  startLevel = 1,
  startDeaths = 0,
  startPlayTime = 0
) {
  const x = canvas.getContext('2d')!;
  const W = 800, H = 450;
  const FONT = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif';

  const P = (a: number, b: number, w: number, h: number, o?: object) =>
    ({ k: 'p', x: a, y: b, w, h, vx: 0, vy: 0, ...o } as any);
  const S = (a: number, b: number, w: number, h: number, o?: object) =>
    ({ k: 's', x: a, y: b, w, h, vx: 0, vy: 0, on: 1, ...o } as any);
  const T = (a: number, b: number, f: () => void) => ({ a, b, f, d: 0 });
  const G = (a = 0, w = 800) => P(a, 380, w, 70);
  const SP = (a: number, o?: object) => S(a, 350, 30, 30, o);
  const HP = (a: number, b: number, w = 70) => P(a, b, w, 16, { hide: 1 });
  const FL = (a: number, b: number, w = 90, h = 70) => P(a, b, w, h, { fl: 1 });
  const FK = (fx = 740, fy = 320) => ({ x: fx, y: fy, w: 30, h: 60 });
  const DR = (dx = 740) => ({ x: dx, y: 320 });

  let L: any,
    lv = Math.max(0, Math.min((startLevel || 1) - 1, 49)),
    deaths = Math.max(0, startDeaths || 0),
    playTime = Math.max(0, startPlayTime || 0),
    keys: Record<string, number> = {},
    pl: any;
  let fx_: any[] = [], st = 'play', tm = 0, msg = '';
  const trolls = ['Ối!', 'Lại nữa à?', 'Tin tưởng làm gì...', 'Cố lên nào!', 'Rối đứt dây rồi', 'Tưởng dễ à? :)', 'Gần được rồi... là nói dối',
    'Bạn vừa làm gì vậy?', 'Gai: 1 - Bạn: 0', 'Đừng nản, mới chết có mấy lần thôi', 'Nhìn kỹ lại đi nào',
    'Ai bảo tin cái bẫy đó?', 'Thử lại lần nữa nhé :)', 'Tay hay là mạng đây?', 'Chết đẹp đấy!',
    'Game này không cho bạn dễ vậy đâu', 'Bình tĩnh... hít thở...', 'Chắc do lag thôi nhỉ?',
    'Đã bảo là có bẫy mà', 'Nghỉ tay uống nước đi', 'Sắp qua rồi... có thể vậy', 'RIP bạn tôi',
    'Hay là bỏ cuộc nhé? Đùa thôi', 'Gai nhớ bạn lắm đó', 'Mắt để làm cảnh à?', 'Lại một cú ngã nghệ thuật'];

  // prettier-ignore
  const LV: Array<() => any> = [
    /* 1  */ () => { const f=P(480,380,100,70),s=S(320,350,30,30,{on:0}); return{n:'Màn 1: Dễ ợt mà',h:'Cứ chạy thẳng thôi...',P:[G(0,480),f,G(580,220)],S:[s],D:{x:735,y:320},T:[T(270,999,()=>s.on=1),T(430,999,()=>f.g=1)]}},
    /* 2  */ () => { const a=S(260,0,36,34,{dn:1}),b=S(500,0,36,34,{dn:1}),e=S(660,350,30,30,{on:0}); return{n:'Màn 2: Mưa gai',h:'Ngẩng đầu lên!',P:[G()],S:[a,b,e],D:{x:740,y:320},T:[T(190,999,()=>a.vy=16),T(430,999,()=>b.vy=22),T(560,999,()=>e.on=1)]}},
    /* 3  */ () => { const hs=[[200,330],[310,290],[420,320],[530,350]].map(([a,b])=>P(a,b,70,16,{hide:1})); return{n:'Màn 3: Cầu tàng hình',h:'Có những thứ thấy được mà không có thật',P:[G(0,150),G(650,150),...hs,P(300,360,90,14,{fake:1}),P(450,370,90,14,{fake:1})],S:[],D:{x:735,y:320},T:[]}},
    /* 4  */ () => { const w=S(-70,0,60,450,{on:0,wl:1}); return{n:'Màn 4: Lộn ngược',h:'Trái hay phải nhỉ?',P:[G()],S:[w,S(450,350,30,30),S(600,350,30,30)],D:{x:740,y:320},T:[T(250,999,()=>{L.rev=1;w.on=1;w.vx=1.6;L.h='ĐIỀU KHIỂN BỊ ĐẢO NGƯỢC!'})]}},
    /* 5  */ () => { const t=[160,290,420,550].map(a=>P(a,380,90,70,{fl:1})),d={x:735,y:320},hs=[P(610,300,60,14,{hide:1}),P(690,235,60,14,{hide:1}),P(745,170,55,14,{hide:1})],s=S(690,350,30,30,{on:0}); return{n:'Màn 5: Trùm giữa chặng',h:'Sàn không bền đâu...',P:[G(0,120),...t,G(680,120),...hs],S:[s],D:d,T:[T(640,999,()=>{d.x=752;d.y=110;s.on=1;L.h='Cửa chạy mất rồi!'})]}},
    /* 6  */ () => { const s=S(150,350,30,30,{on:0}); return{n:'Màn 6: Cửa giả',h:'Cửa nào mới là cửa thật?',sx:400,P:[G()],S:[s],D:{x:8,y:320},F:[{x:740,y:320,w:30,h:60}],T:[T(240,300,()=>s.on=1)]}},
    /* 7  */ () => { const a=S(800,350,30,30),b=S(800,350,30,30); return{n:'Màn 7: Gai lao tới',h:'Chúng đang chạy về phía bạn',P:[G(0,300),G(420,380)],S:[a,b,S(620,350,30,30)],D:{x:740,y:320},T:[T(80,999,()=>a.vx=-3),T(330,999,()=>b.vx=-3.5)]}},
    /* 8  */ () => { const c=S(0,-40,800,40,{dn:1,on:0}); return{n:'Màn 8: Trần hạ xuống',h:'Trần nhà có vẻ đang nặng...',P:[G()],S:[c,S(420,350,30,30),S(580,350,30,30)],D:{x:740,y:320},T:[T(150,999,()=>{c.on=1;c.vy=1.4;L.h='Trần đang hạ xuống! CHẠY ĐI!'})]}},
    /* 9  */ () => { const hs=[P(150,320,90,16),P(290,270,90,16,{fl:1}),P(430,220,90,16),P(580,170,90,16,{fl:1}),P(700,120,100,16)],s=S(465,190,30,30,{on:0}); return{n:'Màn 9: Leo tháp',h:'Đừng nhìn xuống',P:[G(0,100),...hs],S:[s],D:{x:765,y:60},T:[T(410,999,()=>s.on=1)]}},
    /* 10 */ () => { const t=[150,260,370].map(a=>P(a,380,90,70,{fl:1})),c=S(640,0,40,34,{dn:1}),s=S(570,350,30,30,{on:0}),hs=[P(620,300,60,14,{hide:1}),P(690,235,60,14,{hide:1}),P(740,170,60,14,{hide:1})]; return{n:'Màn 10: Trùm cuối',h:'Mọi trò đều có mặt ở đây',P:[G(0,110),...t,G(500,300),...hs],S:[c,s],D:{x:765,y:110},F:[{x:740,y:320,w:30,h:60}],T:[T(200,999,()=>{L.rev=1;L.h='Điều khiển đảo ngược... lại nữa!'}),T(530,999,()=>s.on=1),T(600,999,()=>c.vy=18)]}},
    /* 11 */ () => { const a=S(240,300,30,30,{on:0}),b=S(340,250,30,30,{on:0}); return{n:'Màn 11: Bậc thang gai',h:'Mỗi bậc một bất ngờ',P:[G(),P(200,330,100,50),P(300,280,100,100),P(400,230,100,150)],S:[a,b],D:{x:450,y:170},T:[T(150,230,()=>a.on=1),T(280,330,()=>b.on=1)]}},
    /* 12 */ () => { const s=SP(400,{on:0}); return{n:'Màn 12: Chọn cửa',h:'Chỉ có một cửa thật',P:[G()],S:[s],D:DR(640),F:[FK(560),FK(720)],T:[T(340,999,()=>s.on=1)]}},
    /* 13 */ () => { const c=[0,1,2,3,4].map(i=>S(240+i*100,0,36,34,{dn:1})); return{n:'Màn 13: Mưa gai dày',h:'Đừng chạy bừa',P:[G()],S:c,D:DR(),T:c.map((s,i)=>T(140+i*100,999,()=>s.vy=15))}},
    /* 14 */ () => ({n:'Màn 14: Sàn sụp',h:'Đừng dừng lại',P:[G(0,100),...[1,2,3,4,5,6].map(i=>FL(i*100,380,100)),G(700,100)],S:[],D:DR(),T:[]}),
    /* 15 */ () => { const s=[250,380,520,650].map(a=>SP(a,{on:0})); return{n:'Màn 15: Gai trồi',h:'Chúng mọc ngay trước mũi giày',P:[G()],S:s,D:DR(),T:s.map(p=>T(p.x-55,999,()=>p.on=1))}},
    /* 16 */ () => ({n:'Màn 16: Cầu ma',h:'Tin vào cái bóng mờ',P:[G(0,150),G(720,80),HP(190,340),HP(300,300),HP(410,260),HP(520,300),HP(630,340),P(320,330,80,14,{fake:1}),P(470,330,80,14,{fake:1})],S:[],D:DR(745),T:[]}),
    /* 17 */ () => ({n:'Màn 17: Trái phải đổi chỗ',h:'Hôm nay trái phải thế nào?',P:[G()],S:[SP(260),SP(440),SP(600)],D:DR(),T:[150,340,500,660].map(a=>T(a,999,()=>L.rev^=1))}),
    /* 18 */ () => { const d=DR(500),s=SP(300,{on:0}); return{n:'Màn 18: Cửa chạy trốn',h:'Lại chạy mất rồi',P:[G()],S:[s],D:d,T:[T(400,999,()=>d.x=720),T(640,999,()=>{d.x=40;s.on=1;L.h='Quay về đi!'})]}},
    /* 19 */ () => { const p=[0,1,2,3,4].map(i=>FL(150+i*110,320-i*40,80,16)); return{n:'Màn 19: Tháp rơi',h:'Leo nhanh lên',P:[G(0,100),...p,P(700,120,100,16)],S:[],D:{x:745,y:60},T:[]}},
    /* 20 */ () => ({n:'Màn 20: Ảo giác',h:'Đường lên trông rất hấp dẫn',P:[G(0,150),G(720,80),P(160,320,80,14,{fake:1}),P(270,260,80,14,{fake:1}),P(380,200,80,14,{fake:1}),P(490,140,80,14,{fake:1}),HP(190,350),HP(300,330),HP(410,350),HP(520,330),HP(630,350)],S:[],D:DR(745),T:[]}),
    /* 21 */ () => { const a=S(800,350,30,30),b=S(800,350,30,30),c=S(800,350,30,30); return{n:'Màn 21: Đoàn tàu gai',h:'Tàu đến rồi, tránh ra',P:[G(0,200),G(300,150),G(550,250)],S:[a,b,c],D:DR(),T:[T(60,999,()=>a.vx=-4),T(250,999,()=>b.vx=-3),T(450,999,()=>c.vx=-3.5)]}},
    /* 22 */ () => { const c=S(0,-40,800,40,{dn:1,on:0}); return{n:'Màn 22: Trần hạ, hố mở',h:'Nhìn lên làm gì?',P:[G(0,300),G(380,420)],S:[c,SP(480),SP(640)],D:DR(),T:[T(100,999,()=>{c.on=1;c.vy=1.2;L.h='Trần đang hạ xuống!'})]}},
    /* 23 */ () => { const s=S(545,290,30,30,{on:0}); return{n:'Màn 23: Cửa trên trời',h:'Cửa dưới đất trông an toàn quá',P:[G(),P(500,320,80,14),P(610,260,80,14,{fl:1}),P(710,200,90,14)],S:[s],D:{x:750,y:140},F:[FK(740)],T:[T(450,999,()=>s.on=1)]}},
    /* 24 */ () => { const s=[220,340,460,580].map(a=>SP(a)),e=SP(700,{on:0}); return{n:'Màn 24: Rừng gai',h:'Mỗi cú nhảy là một canh bạc',P:[G()],S:[...s,e],D:DR(750),T:[T(650,999,()=>e.on=1)]}},
    /* 25 */ () => { const a=S(285,0,36,34,{dn:1}),b=S(525,0,36,34,{dn:1}); return{n:'Màn 25: Đảo mây',h:'Trên đầu cũng có chuyện',P:[G(0,100),P(150,340,70,16),P(270,320,70,16),P(390,300,70,16),P(510,320,70,16),P(630,340,70,16),G(730,70)],S:[a,b],D:DR(745),T:[T(230,999,()=>a.vy=14),T(470,999,()=>b.vy=14)]}},
    /* 26 */ () => { const t=[150,260,370,480].map(a=>FL(a,380,90)),s=SP(650,{on:0}); return{n:'Màn 26: Sàn sụp, tay chân lộn',h:'Đừng dừng lại',P:[G(0,110),...t,G(600,200)],S:[s],D:DR(),T:[T(160,999,()=>{L.rev=1;L.h='Điều khiển đảo ngược!'}),T(570,999,()=>{L.rev=0;L.h='Tạm ổn... chưa chắc'}),T(610,999,()=>s.on=1)]}},
    /* 27 */ () => { const a=S(360,350,30,30,{on:0}),b=S(600,350,30,30,{on:0}); return{n:'Màn 27: Vực sâu',h:'Nhảy thật xa',P:[G(0,150),G(290,100),G(530,100),G(670,130)],S:[a,b],D:DR(750),T:[T(270,999,()=>a.on=1),T(500,999,()=>b.on=1)]}},
    /* 28 */ () => { const w=S(-70,0,60,450,{wl:1,vx:2.2}); return{n:'Màn 28: Kẻ đuổi bắt',h:'Chạy đi, đừng ngoảnh lại',sx:100,P:[G(0,260),G(340,460)],S:[w,SP(480),SP(620)],D:DR(),T:[]}},
    /* 29 */ () => { const t=[150,260].map(a=>FL(a,380,90)),s=SP(690,{on:0}); return{n:'Màn 29: Tổng hợp',h:'Cửa đầu tiên không phải cửa thật',P:[G(0,110),...t,HP(370,300),HP(460,250),HP(550,300),G(640,160)],S:[s],D:DR(765),F:[FK(715)],T:[T(300,999,()=>{L.rev=1;L.h='Đảo ngược nữa rồi!'}),T(600,999,()=>{L.rev=0;s.on=1})]}},
    /* 30 */ () => { const t=[150,260,370].map(a=>FL(a,380,90)),c=S(640,0,40,34,{dn:1}),s=SP(570,{on:0}),w=S(-70,0,60,450,{wl:1,on:0}); return{n:'Màn 30: Trùm cuối thật sự',h:'Không còn đường lui',P:[G(0,110),...t,G(500,300),HP(620,300,60),HP(690,235,60),HP(740,170,60)],S:[c,s,w],D:{x:765,y:110},F:[FK(740)],T:[T(200,999,()=>{L.rev=1;w.on=1;w.vx=1.3;L.h='Đảo ngược, bị đuổi!'}),T(530,999,()=>s.on=1),T(600,999,()=>c.vy=18)]}},
    /* 31 */ () => ({n:'Màn 31: Đường hầm sụp',h:'Đừng nhảy, đừng dừng',P:[G(0,300),...[3,4,5].map(i=>FL(i*100,380,100)),G(600,200)],S:[S(300,250,300,40,{dn:1})],D:DR(),T:[]}),
    /* 32 */ () => { const c=S(0,-40,800,40,{dn:1,on:0}); return{n:'Màn 32: Bóng đè',h:'Trần hạ rồi, tay còn phản bội',P:[G()],S:[c,SP(450),SP(600)],D:DR(),T:[T(100,999,()=>{c.on=1;c.vy=1.15}),T(300,999,()=>{L.rev=1;L.h='Điều khiển đảo ngược!'}),T(520,999,()=>L.rev=0)]}},
    /* 33 */ () => { const a=SP(440,{on:0}),b=SP(280,{on:0}); return{n:'Màn 33: Nhà gương',h:'Cửa thật ở phía bên kia',sx:700,P:[G()],S:[a,b],D:DR(8),F:[FK(520),FK(360),FK(200)],T:[T(500,560,()=>a.on=1),T(340,400,()=>b.on=1)]}},
    /* 34 */ () => ({n:'Màn 34: Nhảy dù',h:'Hạ cánh cho khéo',sx:40,sy:114,P:[P(0,150,120,16),G()],S:[250,370,490,610].map(a=>SP(a)),D:DR(750),T:[]}),
    /* 35 */ () => { const w=[250,420,590].map(a=>P(a,270,20,110,{hide:1})); return{n:'Màn 35: Tường ma',h:'Có thứ gì đó chặn đường',P:[G(),...w],S:[250,420,590].map(a=>SP(a+70,{on:0})),D:DR(750),T:[250,420,590].map((a,i)=>T(a-40,999,()=>L.S[i].on=1))}},
    /* 36 */ () => { const l=P(170,380,80,16,{sy:200}),s=S(335,170,30,30,{on:0}); return{n:'Màn 36: Thang máy',h:'Đi lên, lên nữa',P:[G(0,150),l,P(300,200,100,16),P(450,200,100,16),P(600,200,200,16)],S:[s],D:{x:740,y:140},T:[T(140,999,()=>l.vy=-1.2),T(255,999,()=>s.on=1)]}},
    /* 37 */ () => { const p=[150,260,370,480].map(a=>P(a,340,80,16)); return{n:'Màn 37: Chìm',h:'Chúng đang chìm dần',P:[G(0,110),...p,G(590,210)],S:[],D:DR(745),T:p.map(q=>T(q.x-30,999,()=>q.vy=.9))}},
    /* 38 */ () => { const s=[300,500,700].map(a=>SP(a,{on:0})); return{n:'Màn 38: Đạp mìn',h:'Bước đến đâu mọc đến đó',P:[G()],S:s,D:DR(760),T:s.map(p=>T(p.x-60,p.x-40,()=>p.on=1))}},
    /* 39 */ () => { const w=S(-70,0,60,450,{wl:1,on:0}); return{n:'Màn 39: Cầu ma ngược',h:'Cầu ma, bản ngược và có kẻ đuổi',P:[G(0,150),G(720,80),HP(190,340),HP(300,300),HP(410,340),HP(520,300),HP(630,340)],S:[w],D:DR(745),T:[T(120,999,()=>{L.rev=1;w.on=1;w.vx=1})]}},
    /* 40 */ () => { const t=[140,250,360,470].map(a=>FL(a,380,90)),c=[[270,210],[380,320],[490,430]].map(([a,b])=>[S(a,0,36,34,{dn:1}),b]),s=SP(640,{on:0}); return{n:'Màn 40: Trùm chặng 4',h:'Sàn sụp, trần rơi',P:[G(0,100),...t,G(580,220)],S:[...c.map((e:any)=>e[0]),s],D:DR(765),F:[FK(715)],T:[...c.map(([q,b]:any)=>T(b,999,()=>q.vy=16)),T(600,999,()=>s.on=1)]}},
    /* 41 */ () => ({n:'Màn 41: Sàn kính',h:'Sàn trông chắc chắn lắm',P:[P(0,380,800,70,{fake:1}),G(0,120),HP(170,380,80),HP(300,380,80),HP(430,380,80),HP(560,380,80),G(700,100)],S:[],D:DR(750),T:[]}),
    /* 42 */ () => { const m=[0,1,2,3,4,5].map(i=>S(380+i*70,-40,30,30,{dn:1})); return{n:'Màn 42: Thiên thạch',h:'Bầu trời đang rơi',P:[G()],S:m,D:DR(),T:m.map((q:any,i:number)=>T(100+i*85,999,()=>{q.vx=-2;q.vy=9}))}},
    /* 43 */ () => { const s=SP(600,{on:0}); return{n:'Màn 43: Bức tường',h:'Phải trèo qua mới được',P:[G(),P(480,150,40,230),P(190,330,80,16,{fl:1}),P(290,280,80,16,{fl:1}),P(390,230,80,16,{fl:1})],S:[s],D:DR(),T:[T(470,999,()=>s.on=1)]}},
    /* 44 */ () => { const w=S(0,450,800,90,{wl:1,on:0}); return{n:'Màn 44: Nước dâng',h:'Leo lên, nhanh!',P:[G(),P(120,320,100,16),P(260,260,100,16),P(400,200,100,16),P(540,140,100,16),P(680,80,120,16)],S:[w],D:{x:735,y:20},T:[T(100,999,()=>{w.on=1;w.vy=-.7;L.h='Nước dâng! Leo lên!'})]}},
    /* 45 */ () => { const t=[1,2,3,4,5,6,7].map(i=>FL(i*80,380,80)),s=[260,420,580].map(a=>SP(a,{on:0})); return{n:'Màn 45: Sàn sụp, gai trồi',h:'Vừa chạy vừa nhảy',P:[G(0,80),...t,G(640,160)],S:s,D:DR(750),T:s.map(p=>T(p.x-70,999,()=>p.on=1))}},
    /* 46 */ () => ({n:'Màn 46: Chóng mặt',h:'Trái? Phải? Ai biết',P:[G()],S:[SP(300),SP(500),SP(650)],D:DR(),T:[110,210,310,410,510,610].map(a=>T(a,999,()=>L.rev^=1))}),
    /* 47 */ () => ({n:'Màn 47: Rừng cửa giả',h:'Cái nào cũng là cửa',P:[G()],S:[SP(350),SP(550)],D:DR(750),F:[300,400,500,600].map(a=>FK(a)),T:[]}),
    /* 48 */ () => { const w=S(-70,0,60,450,{wl:1,vx:2}),a=S(420,0,36,34,{dn:1}),b=S(560,0,36,34,{dn:1}); return{n:'Màn 48: Đuổi bắt 2',h:'Chạy, chạy, vẫn chạy',sx:80,P:[G(0,260),G(340,460)],S:[w,a,b,SP(520),SP(640)],D:DR(),T:[T(340,999,()=>a.vy=16),T(480,999,()=>b.vy=16)]}},
    /* 49 */ () => { const s=SP(560,{on:0}); return{n:'Màn 49: Gương vỡ',h:'Mọi thứ đều ngược',P:[G(0,200),G(320,100),G(520,280)],S:[s],D:DR(),T:[T(0,999,()=>L.rev=1),T(480,999,()=>s.on=1)]}},
    /* 50 */ () => { const t=[140,240,340,440].map(a=>FL(a,380,80)),c1=S(360,0,36,34,{dn:1}),c2=S(460,0,36,34,{dn:1}),s=SP(610,{on:0}),w=S(-70,0,60,450,{wl:1,on:0}); return{n:'Màn 50: Trùm của các trùm',h:'Đây là màn cuối. Thật đấy.',P:[G(0,100),...t,G(540,260),HP(640,300,60),HP(700,235,60),HP(745,170,55)],S:[c1,c2,s,w],D:{x:765,y:110},F:[FK(700),FK(740)],T:[T(160,999,()=>{L.rev=1;w.on=1;w.vx=1.4;L.h='Đảo ngược, bị đuổi!'}),T(280,999,()=>c1.vy=16),T(380,999,()=>c2.vy=16),T(560,999,()=>s.on=1)]}},
  ];

  function load() {
    L = LV[lv](); L.rev = 0; L.D.w = 30; L.D.h = 60;
    pl = { x: L.sx || 50, y: L.sy || 340, w: 16, h: 34, vx: 0, vy: 0, g: 0, f: 1, ph: 0 };
    st = 'play'; fx_ = [];
  }

  function die() {
    if (st !== 'play') return;
    sound.playDeath();
    st = 'dead'; tm = 50; deaths++;
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
    let m = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
    if (L.rev) m = -m;
    pl.vx = m * 4.2; if (m) pl.f = m; pl.ph += Math.abs(pl.vx) * .08;
    pl.x = Math.max(0, Math.min(W - pl.w, pl.x + pl.vx));
    const sol = L.P.filter((p: any) => !p.fake && p.y < H + 100);
    sol.forEach((p: any) => { if (hit(pl, p)) { if (pl.vx > 0) pl.x = p.x - pl.w; else if (pl.vx < 0) pl.x = p.x + p.w; } });
    pl.vy = Math.min(pl.vy + .6, 14); pl.y += pl.vy; pl.g = 0;
    sol.forEach((p: any) => {
      if (hit(pl, p)) {
        if (pl.vy > 0) { pl.y = p.y - pl.h; pl.g = 1; if (p.fl && !p.ft && !p.g) p.ft = 25; }
        else pl.y = p.y + p.h;
        pl.vy = 0;
      }
    });
    if ((keys[' '] || keys.ArrowUp || keys.w || keys.W) && pl.g) { pl.vy = -12.5; pl.g = 0; sound.playJump(); }
    L.P.forEach((p: any) => { if (p.hide) p.sh = Math.abs(pl.x + 8 - (p.x + p.w / 2)) < 110 && Math.abs(pl.y - p.y) < 220; });
    L.S.forEach((s: any) => { if (s.on && hit(pl, s, 5)) die(); });
    (L.F || []).forEach((f: any) => { if (hit(pl, f)) die(); });
    if (pl.y > H + 40) die();
    if (hit(pl, L.D)) {
      lv++;
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
    x.strokeStyle = '#8a7bff55'; x.lineWidth = 1;
    [[-6, 0], [0, -8], [6, 0]].forEach(([a, b]) => {
      x.beginPath(); x.moveTo(cx + a, y + (b ? 4 : 14)); x.lineTo(cx + a * 2, 0); x.stroke();
    });
    x.strokeStyle = '#f3e9d2'; x.fillStyle = '#f3e9d2'; x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath(); x.arc(cx, y + 7, 7, 0, 7); x.fill();
    x.beginPath(); x.moveTo(cx, y + 14); x.lineTo(cx, y + 24);
    x.moveTo(cx, y + 16); x.lineTo(cx + s + o, y + 22 + o); x.moveTo(cx, y + 16); x.lineTo(cx - s - o, y + 22 + o);
    x.moveTo(cx, y + 24); x.lineTo(cx + s, y + 34); x.moveTo(cx, y + 24); x.lineTo(cx - s, y + 34); x.stroke();
    x.fillStyle = '#201b33'; x.beginPath(); x.arc(cx + pl.f * 3, y + 6, 1.8, 0, 7); x.fill();
  }

  load();
  let last = 0, acc = 0, rafId = 0;
  let lastTime = performance.now();

  function loop(t: number) {
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
    pressKey(k: string) { keys[k] = 1; },
    releaseKey(k: string) { delete keys[k]; },
    clearKeys() { keys = {}; },
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
      },
      initialLevel,
      initialDeaths,
      initialPlayTime
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
    const onBlur = () => engine.clearKeys();

    // Lưu tiến trình thời gian thực khi F5 hoặc đóng tab
    const onBeforeUnload = () => {
      if (engine && getPlayerName()) {
        savePlayerProgress(engine.lv, engine.deaths, engine.playTime, true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      engine.destroy();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [handleSave, initialLevel, initialDeaths, initialPlayTime]);

  // Mobile pad
  const padPress = useCallback((k: string) => engineRef.current?.pressKey(k), []);
  const padRelease = useCallback((k: string) => engineRef.current?.releaseKey(k), []);

  // Chơi lại từ đầu: đưa tiến trình về màn 1, 0 lần chết, 0 giây và lưu lại
  const handleRestartAll = () => {
    setShowRestartConfirm(false);
    engineRef.current?.restart();
    handleSave(0, 0, 0, true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      alert('Vui lòng nhập tên!');
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
          title="Chơi lại từ đầu?"
          message="Toàn bộ tiến trình hiện tại (màn chơi, số lần chết, thời gian) sẽ bị xóa và bạn bắt đầu lại từ Màn 1."
          closeLabel="Hủy"
          confirmLabel="🔁 Chơi lại"
          onConfirm={handleRestartAll}
          onClose={() => setShowRestartConfirm(false)}
        />
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        id="c"
        width={800}
        height={450}
        className="game-canvas"
        onPointerDown={() => {
          if (engineRef.current?.st === 'win') {
            engineRef.current.restart();
            handleSave(0, 0, 0, true);
          }
        }}
      />

      <p className="hint">← → hoặc A D: di chuyển · Space, W hoặc ↑: nhảy · R: chơi lại màn</p>

      {/* Mobile pad */}
      <div id="pad">
        <div className="grp">
          {['ArrowLeft', 'ArrowRight'].map((k) => (
            <button
              key={k}
              onPointerDown={(e) => {
                e.preventDefault();
                padPress(k);
              }}
              onPointerUp={() => padRelease(k)}
              onPointerLeave={() => padRelease(k)}
              onPointerCancel={() => padRelease(k)}
              aria-label={k === 'ArrowLeft' ? 'Sang trái' : 'Sang phải'}
            >
              {k === 'ArrowLeft' ? '◀' : '▶'}
            </button>
          ))}
        </div>
        <div className="pad-center-group">
        <button id="rs" aria-label="Chơi lại màn" onClick={() => engineRef.current?.pressKey('r')}>
          ↻
        </button>
          <SoundButton className="mobile-sound-btn" size="sm" />
        </div>
        <button
          className="jump"
          aria-label="Nhảy"
          onPointerDown={(e) => {
            e.preventDefault();
            sound.unlockAudio();
            padPress('ArrowUp');
          }}
          onPointerUp={() => padRelease('ArrowUp')}
          onPointerLeave={() => padRelease('ArrowUp')}
          onPointerCancel={() => padRelease('ArrowUp')}
        >
          Nhảy
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
    </div>
  );
}
