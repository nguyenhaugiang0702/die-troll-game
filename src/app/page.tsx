'use client';

import { useEffect, useState, useCallback } from 'react';
import HomeScreen from '@/components/HomeScreen';
import GameCanvas from '@/components/GameCanvas';
import { loadPlayerProgress, type PlayerProfile } from '@/lib/supabase';

export default function Home() {
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [profile, setProfile] = useState<PlayerProfile>({
    id: '',
    name: '',
    level: 1,
    deaths: 0,
    hasPlayed: false,
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // Thông số khởi chạy màn chơi
  const [targetLevel, setTargetLevel] = useState<number>(1);
  const [targetDeaths, setTargetDeaths] = useState<number>(0);
  const [targetName, setTargetName] = useState<string>('');

  const refreshProfile = useCallback(async () => {
    try {
      const p = await loadPlayerProgress();
      setProfile(p);
    } catch (e) {
      console.warn('Lỗi khi tải profile:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshProfile();
      setIsInitializing(false);
    })();
  }, [refreshProfile]);

  const handleStartGame = (level: number, deaths: number, name: string) => {
    setTargetLevel(level || 1);
    setTargetDeaths(deaths || 0);
    setTargetName(name || '');
    setScreen('game');
  };

  const handleBackToHome = async () => {
    await refreshProfile();
    setScreen('home');
  };

  if (isInitializing) {
    return (
      <main className="w-full min-h-[450px] flex items-center justify-center">
        <div style={{ color: '#8a7bff', fontSize: '16px', fontWeight: 600 }}>
          Đang tải game...
        </div>
      </main>
    );
  }

  return (
    <main className="w-full flex flex-col items-center justify-center">
      {screen === 'home' ? (
        <HomeScreen
          profile={profile}
          onStartGame={handleStartGame}
          onRefreshProfile={refreshProfile}
        />
      ) : (
        <GameCanvas
          initialLevel={targetLevel}
          initialDeaths={targetDeaths}
          playerName={targetName}
          onBackToHome={handleBackToHome}
        />
      )}
    </main>
  );
}
