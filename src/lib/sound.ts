// Hệ thống âm thanh Web Audio API (Synthesizer procedural) - 100% tự sinh không cần tải file ngoài

type Note = { freq: number; dur: number; bass?: number };

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lobbyBgmTimer: number | null = null;
  private lobbyBgmGain: GainNode | null = null;
  private isLobbyBgmRunning: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('puppet_sound_muted');
      this.isMuted = saved === 'true';

      const handleUserGesture = () => {
        this.unlockAudio();
      };

      ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach((evt) => {
        window.addEventListener(evt, handleUserGesture, { passive: true, capture: true });
      });
    }
  }

  public initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    return this.ctx;
  }

  public unlockAudio() {
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        if (this.isLobbyBgmRunning && !this.isMuted && !this.lobbyBgmTimer) {
          this.playLobbyBgm();
        }
      }).catch(() => {});
    } else {
      if (this.isLobbyBgmRunning && !this.isMuted && !this.lobbyBgmTimer) {
        this.playLobbyBgm();
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.unlockAudio();
    this.isMuted = !this.isMuted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('puppet_sound_muted', String(this.isMuted));
    }
    if (this.isMuted) {
      this.stopLobbyBgm();
    } else {
      if (this.isLobbyBgmRunning) {
        this.playLobbyBgm();
      }
      this.playJump(); // Âm thanh phản hồi khi bật âm
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('puppet_sound_changed', { detail: { muted: this.isMuted } })
      );
    }
    return this.isMuted;
  }

  // ─── SFX: Tiếng Nhảy (Jump) ────────────────────────────────────────────────
  public playJump() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.11);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  // ─── SFX: Tiếng Tiếp Đất (Landing) ─────────────────────────────────────────
  public playLand(intensity = 1) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.08);

    const vol = Math.min(0.25, 0.12 * Math.max(0.6, intensity));
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // ─── SFX: Tiếng Qua Màn (Level Clear) ───────────────────────────────────────
  public playLevelUp() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    // Chuỗi nốt hân hoan rực rỡ: C5, E5, G5, B5, C6
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    const step = 0.08;

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      const dur = idx === notes.length - 1 ? 0.45 : 0.14;
      const vol = idx === notes.length - 1 ? 0.45 : 0.32;

      gain.gain.setValueAtTime(vol, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + dur + 0.02);
    });
  }

  // ─── SFX: Tiếng Thắng Game Chung Cuộc (Win Game) ───────────────────────────
  public playWin() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const chords = [
      [523.25, 659.25, 783.99],  // C
      [587.33, 739.99, 880.0],   // D
      [659.25, 830.61, 987.77],  // E
      [1046.5, 1318.5, 1567.98], // C cao
    ];

    chords.forEach((chord, i) => {
      const startTime = t + i * 0.16;
      const dur = i === chords.length - 1 ? 0.8 : 0.22;
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + dur + 0.05);
      });
    });
  }

  // ─── SFX: Tiếng Chết Hài Hước (Troll Death) ─────────────────────────────────
  public playDeath() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.25);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.27);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.28);
  }

  // ─── SFX: Tiếng Nhấn Nút UI (Click) ────────────────────────────────────────
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.05);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  // ─── BGM: Nhạc Chờ Trang Chủ (Lofi / Chiptune Melodic Loop) ────────────────
  public playLobbyBgm() {
    this.isLobbyBgmRunning = true;
    if (this.isMuted) return;

    const ctx = this.initContext();
    if (!ctx) return;

    if (this.lobbyBgmTimer) {
      clearInterval(this.lobbyBgmTimer);
      this.lobbyBgmTimer = null;
    }

    // Nếu AudioContext đang suspended (chưa có click), đánh dấu để phát khi click đầu tiên
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Master gain cho BGM
    if (!this.lobbyBgmGain) {
      this.lobbyBgmGain = ctx.createGain();
      this.lobbyBgmGain.gain.setValueAtTime(0.18, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, ctx.currentTime);

      this.lobbyBgmGain.connect(filter);
      filter.connect(ctx.destination);
    } else {
      this.lobbyBgmGain.gain.setValueAtTime(0.18, ctx.currentTime);
    }

    // Giai điệu retro nhẹ nhàng ấm áp (C, G, Am, F)
    const melody: Note[] = [
      { freq: 261.63, dur: 0.25, bass: 130.81 }, // C4 + C3 bass
      { freq: 329.63, dur: 0.25 },               // E4
      { freq: 392.00, dur: 0.25 },               // G4
      { freq: 523.25, dur: 0.45 },               // C5
      { freq: 440.00, dur: 0.25 },               // A4
      { freq: 392.00, dur: 0.25 },               // G4
      { freq: 329.63, dur: 0.50 },               // E4

      { freq: 293.66, dur: 0.25, bass: 146.83 }, // D4 + D3 bass
      { freq: 392.00, dur: 0.25 },               // G4
      { freq: 493.88, dur: 0.25 },               // B4
      { freq: 440.00, dur: 0.45 },               // A4
      { freq: 349.23, dur: 0.25 },               // F4
      { freq: 261.63, dur: 0.50 },               // C4

      { freq: 220.00, dur: 0.25, bass: 110.00 }, // A3 + A2 bass
      { freq: 261.63, dur: 0.25 },               // C4
      { freq: 329.63, dur: 0.25 },               // E4
      { freq: 440.00, dur: 0.45 },               // A4
      { freq: 392.00, dur: 0.25 },               // G4
      { freq: 293.66, dur: 0.50 },               // D4

      { freq: 246.94, dur: 0.25, bass: 123.47 }, // B3 + B2 bass
      { freq: 293.66, dur: 0.25 },               // D4
      { freq: 392.00, dur: 0.35 },               // G4
      { freq: 493.88, dur: 0.35 },               // B4
      { freq: 523.25, dur: 0.65 },               // C5
    ];

    const playSequence = () => {
      if (this.isMuted || !this.isLobbyBgmRunning || !this.ctx || !this.lobbyBgmGain) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
        return;
      }

      let offset = 0;
      melody.forEach((note) => {
        const startTime = this.ctx!.currentTime + offset;

        // Giai điệu chính (Melody)
        const osc = this.ctx!.createOscillator();
        const noteGain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, startTime);

        noteGain.gain.setValueAtTime(0.001, startTime);
        noteGain.gain.linearRampToValueAtTime(0.28, startTime + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);

        osc.connect(noteGain);
        noteGain.connect(this.lobbyBgmGain!);

        osc.start(startTime);
        osc.stop(startTime + note.dur + 0.05);

        // Nốt trầm đệm nhịp (Bassline)
        if (note.bass) {
          const bassOsc = this.ctx!.createOscillator();
          const bassGain = this.ctx!.createGain();
          bassOsc.type = 'sine';
          bassOsc.frequency.setValueAtTime(note.bass, startTime);

          bassGain.gain.setValueAtTime(0.22, startTime);
          bassGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

          bassOsc.connect(bassGain);
          bassGain.connect(this.lobbyBgmGain!);

          bassOsc.start(startTime);
          bassOsc.stop(startTime + 0.55);
        }

        offset += note.dur + 0.06;
      });
    };

    playSequence();

    const totalDurationMs = melody.reduce((acc, n) => acc + (n.dur + 0.06) * 1000, 0);
    this.lobbyBgmTimer = window.setInterval(playSequence, totalDurationMs);
  }

  public stopLobbyBgm() {
    this.isLobbyBgmRunning = false;
    if (this.lobbyBgmTimer) {
      clearInterval(this.lobbyBgmTimer);
      this.lobbyBgmTimer = null;
    }
    if (this.lobbyBgmGain && this.ctx) {
      try {
        this.lobbyBgmGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);
      } catch {
        // Ignored
      }
      setTimeout(() => {
        if (!this.isLobbyBgmRunning && this.lobbyBgmGain) {
          this.lobbyBgmGain.disconnect();
          this.lobbyBgmGain = null;
        }
      }, 140);
    }
  }
}

export const sound = new SoundSystem();
