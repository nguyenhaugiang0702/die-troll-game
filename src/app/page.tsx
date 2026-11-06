'use client';

import { useEffect, useState, useCallback } from 'react';
import HomeScreen from '@/components/HomeScreen';
import GameCanvas from '@/components/GameCanvas';
import { loadPlayerProgress, type PlayerProfile } from '@/lib/supabase';
import { exitLandscape } from '@/lib/landscape';
import { sound } from '@/lib/sound';

export default function Home() {
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [profile, setProfile] = useState<PlayerProfile>({
    id: '',
    name: '',
    avatar: '🎭',
    level: 1,
    deaths: 0,
    playTime: 0,
    hasPlayed: false,
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // Thông số khởi chạy màn chơi
  const [targetLevel, setTargetLevel] = useState<number>(1);
  const [targetDeaths, setTargetDeaths] = useState<number>(0);
  const [targetPlayTime, setTargetPlayTime] = useState<number>(0);
  const [targetName, setTargetName] = useState<string>('');

  const refreshProfile = useCallback(async () => {
    try {
      const p = await loadPlayerProgress();
      setProfile(p);
      return p;
    } catch (e) {
      console.warn('Lỗi khi tải profile:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const p = await refreshProfile();
      // Kiểm tra trạng thái màn hình trước khi F5
      const savedScreen =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('puppet_active_screen')
          : null;

      // Nếu trước đó đang chơi (savedScreen === 'game') và đã có tài khoản
      if (savedScreen === 'game' && p && p.hasPlayed && p.name) {
        setTargetLevel(p.level || 1);
        setTargetDeaths(p.deaths || 0);
        setTargetPlayTime(p.playTime || 0);
        setTargetName(p.name);
        setScreen('game');
      } else {
        setScreen('home');
      }
      setIsInitializing(false);
    })();
  }, [refreshProfile]);

  // Ở màn chơi: bật CSS xoay ngang và khóa màn hình chống zoom / cuộn
  useEffect(() => {
    const isGame = screen === 'game';
    document.documentElement.classList.toggle('force-landscape', isGame);
    document.documentElement.classList.toggle('in-game', isGame);
    document.body.classList.toggle('in-game', isGame);
    return () => {
      document.documentElement.classList.remove('force-landscape', 'in-game');
      document.body.classList.remove('in-game');
    };
  }, [screen]);

  const handleStartGame = (level: number, deaths: number, playTime: number, name: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('puppet_active_screen', 'game');
    }
    setTargetLevel(level || 1);
    setTargetDeaths(deaths || 0);
    setTargetPlayTime(playTime || 0);
    setTargetName(name || '');
    setScreen('game');
  };

  const handleBackToHome = async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('puppet_active_screen', 'home');
    }
    void exitLandscape();
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
    <main className={`page-main ${screen === 'game' ? 'page-main-game' : 'page-main-home'}`}>
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
          initialPlayTime={targetPlayTime}
          playerName={targetName}
          onBackToHome={handleBackToHome}
        />
      )}
    </main>
  );
}
