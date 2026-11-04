'use client';

import { useEffect, useState } from 'react';
import { sound } from '@/lib/sound';

interface SoundButtonProps {
  className?: string;
  size?: 'sm' | 'md';
}

export default function SoundButton({ className = '', size = 'md' }: SoundButtonProps) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(sound.getMuted());

    const handleSoundChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean }>;
      setMuted(customEvent.detail.muted);
    };

    window.addEventListener('puppet_sound_changed', handleSoundChange);
    return () => window.removeEventListener('puppet_sound_changed', handleSoundChange);
  }, []);

  const handleToggle = () => {
    const nextMuted = sound.toggleMute();
    setMuted(nextMuted);
    if (!nextMuted) {
      sound.playClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`btn-sound-toggle ${className}`}
      title={muted ? 'Bật âm thanh (Đang tắt)' : 'Tắt âm thanh (Đang bật)'}
      aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
    >
      <span className="sound-icon">{muted ? '🔇' : '🔊'}</span>
      {size === 'md' && <span className="sound-label">{muted ? 'Bật Âm' : 'Tắt Âm'}</span>}
    </button>
  );
}

