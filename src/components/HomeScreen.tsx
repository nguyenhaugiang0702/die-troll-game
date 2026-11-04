'use client';

import { useState } from 'react';
import {
  registerOrFindPlayer,
  clearPlayerSession,
  verifyLocalWithServer,
  syncLocalWithServer,
  formatPlayTime,
  type PlayerProfile,
} from '@/lib/supabase';
import LeaderboardModal from './LeaderboardModal';
import Toast from './Toast';

interface HomeScreenProps {
  profile: PlayerProfile;
  onStartGame: (level: number, deaths: number, playTime: number, name: string) => void;
  onRefreshProfile: () => Promise<void>;
}

export default function HomeScreen({
  profile,
  onStartGame,
  onRefreshProfile,
}: HomeScreenProps) {
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Trạng thái kiểm tra & Toast báo lỗi không khớp
  const [isCheckingMatch, setIsCheckingMatch] = useState(false);
  const [toastData, setToastData] = useState<{
    title: string;
    message: string;
    localData?: { level: number; deaths: number; playTime: number; name: string };
    serverData?: { level: number; deaths: number; playTime: number; name: string };
  } | null>(null);

  // Xử lý khi nhấn nút "Chơi Ngay"
  const handlePlayClick = async () => {
    // Nếu chưa chơi lần nào (chưa có tên hoặc chưa có tiến trình)
    if (!profile.hasPlayed || !profile.name) {
      setNameInput('');
      setNameError('');
      setShowNameModal(true);
      return;
    }

    // Đã từng chơi: Tiến hành đối soát LocalStorage với Server trước khi cho vào chơi
    setIsCheckingMatch(true);
    setToastData(null);

    const check = await verifyLocalWithServer();
    setIsCheckingMatch(false);

    if (check.isNewUser) {
      setShowNameModal(true);
      return;
    }

    // Nếu KHÔNG MATCH: Chặn vào game và hiện Toast cảnh báo lỗi
    if (!check.isMatch) {
      setToastData({
        title: 'Phát hiện sai lệch dữ liệu!',
        message:
          check.message ||
          'Dữ liệu lưu trên máy (Local) không khớp với dữ liệu trên máy chủ (Server). Vui lòng đồng bộ lại!',
        localData: check.localData,
        serverData: check.serverData,
      });
      return;
    }

    // Nếu MATCH: Vào đúng level của server/local
    const finalLevel = check.serverData?.level ?? profile.level;
    const finalDeaths = check.serverData?.deaths ?? profile.deaths;
    const finalPlayTime = check.serverData?.playTime ?? profile.playTime;
    const finalName = check.serverData?.name ?? profile.name;
    onStartGame(finalLevel, finalDeaths, finalPlayTime, finalName);
  };

  // Xác nhận nhập tên
  const handleConfirmName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Vui lòng nhập tên người chơi!');
      return;
    }
    if (trimmed.length > 20) {
      setNameError('Tên không được vượt quá 20 ký tự!');
      return;
    }

    try {
      setIsSubmitting(true);
      setNameError('');
      const saved = await registerOrFindPlayer(trimmed);
      await onRefreshProfile();
      setShowNameModal(false);
      // Vào game đúng level vừa đăng ký hoặc tìm thấy (level 1 nếu mới, hoặc level cũ nếu tên đã chơi)
      onStartGame(saved.level || 1, saved.deaths || 0, saved.playTime || 0, saved.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
      setNameError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetProfile = () => {
    if (window.confirm('Bạn có chắc muốn xoá tiến trình trên máy này để tạo người chơi mới?')) {
      clearPlayerSession();
      onRefreshProfile();
    }
  };

  // Khôi phục dữ liệu Local theo Server khi bị sai lệch
  const handleSyncServer = async () => {
    if (toastData?.serverData) {
      syncLocalWithServer(toastData.serverData);
      await onRefreshProfile();
      setToastData(null);
    }
  };

  return (
    <div className="home-container">
      {/* Toast thông báo lỗi không khớp */}
      {toastData && (
        <Toast
          title={toastData.title}
          message={toastData.message}
          localData={toastData.localData}
          serverData={toastData.serverData}
          onSyncServer={toastData.serverData ? handleSyncServer : undefined}
          onClose={() => setToastData(null)}
        />
      )}

      {/* Hero / Game Logo */}
      <div className="home-hero">
        <div className="home-badge">🎭 DIE AGAIN: PUPPET ESCAPE</div>
        <h1 className="home-title">CON RỐI BỊ TROLL</h1>
        <p className="home-subtitle">
          50 màn chơi với đủ loại cạm bẫy bất ngờ, đảo phím và cú lừa.
          <br />
          Càng tin tưởng, càng dễ chết!
        </p>
      </div>

      {/* Thông tin người chơi */}
      <div className="home-profile-card">
        {profile.hasPlayed && profile.name ? (
          <div className="profile-existing">
            <div className="profile-header">
              <span className="profile-avatar">👤</span>
              <div className="profile-details">
                <span className="profile-greeting">Chào mừng trở lại!</span>
                <span className="profile-name">{profile.name}</span>
              </div>
              <button
                className="profile-reset-btn"
                onClick={handleResetProfile}
                title="Đổi tên / Chơi tài khoản mới"
              >
                Đổi tên ✎
              </button>
            </div>
            <div className="profile-stats">
              <div className="stat-box">
                <span className="stat-label">Tiến trình</span>
                <span className="stat-value level-highlight">Màn {profile.level} / 50</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-box">
                <span className="stat-label">Số lần chết</span>
                <span className="stat-value">{profile.deaths} lần</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-box">
                <span className="stat-label">Thời gian</span>
                <span className="stat-value" style={{ color: '#a79aff', fontSize: '14px' }}>
                  {formatPlayTime(profile.playTime || 0)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-new">
            <span className="profile-new-icon">✨</span>
            <div className="profile-new-text">
              <strong>Người chơi mới</strong>
              <span>Chưa có tiến trình lưu trữ trên thiết bị này</span>
            </div>
          </div>
        )}
      </div>

      {/* 2 Nút bấm chính: Chơi Ngay & Bảng Xếp Hạng */}
      <div className="home-actions">
        <button
          className="btn-home-play"
          onClick={handlePlayClick}
          disabled={isCheckingMatch}
          autoFocus
        >
          <span className="btn-icon">{isCheckingMatch ? '⏳' : '🎮'}</span>
          <span className="btn-text-group">
            <span className="btn-main-text">
              {isCheckingMatch
                ? 'Đang kiểm tra dữ liệu...'
                : profile.hasPlayed && profile.name
                ? `Chơi Tiếp (Màn ${profile.level})`
                : 'Chơi Ngay'}
            </span>
            <span className="btn-sub-text">
              {isCheckingMatch
                ? 'Đối soát LocalStorage với Server...'
                : profile.hasPlayed && profile.name
                ? 'Tiếp tục hành trình của bạn'
                : 'Bắt đầu từ Màn 1'}
            </span>
          </span>
        </button>

        <button
          className="btn-home-lb"
          onClick={() => setShowLeaderboard(true)}
        >
          <span className="btn-icon">🏆</span>
          <span className="btn-text-group">
            <span className="btn-main-text">Bảng Xếp Hạng</span>
            <span className="btn-sub-text">Vinh danh các cao thủ sống sót</span>
          </span>
        </button>
      </div>

      {/* Hướng dẫn phím tắt */}
      <div className="home-footer-tips">
        <span className="tip-title">Điều khiển:</span>
        <span className="tip-item">← → / A D : Di chuyển</span>
        <span className="tip-dot">·</span>
        <span className="tip-item">Space / W / ↑ : Nhảy</span>
        <span className="tip-dot">·</span>
        <span className="tip-item">R : Chơi lại màn</span>
      </div>

      {/* Modal Nhập Tên cho người chơi mới */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowNameModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Chào Mừng Người Chơi!</h3>
            <p className="modal-desc">
              Nhập tên của bạn để tự động lưu tiến trình và ghi danh trên Bảng Xếp Hạng:
            </p>

            <input
              className="modal-input"
              placeholder="Ví dụ: Rối Tí Nị, Siêu Nhân..."
              maxLength={20}
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (nameError) setNameError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleConfirmName()}
              autoFocus
              disabled={isSubmitting}
            />

            {nameError && (
              <p style={{ color: '#ff6b6b', fontSize: '13px', margin: '-8px 0 12px 0', textAlign: 'center' }}>
                ⚠️ {nameError}
              </p>
            )}

            <div className="modal-buttons">
              <button
                className="btn-secondary"
                onClick={() => setShowNameModal(false)}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                className="btn-action"
                onClick={handleConfirmName}
                disabled={isSubmitting}
                style={{ padding: '8px 20px', minWidth: '120px' }}
              >
                {isSubmitting ? 'Đang tạo...' : 'Vào Chơi 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bảng Xếp Hạng */}
      {showLeaderboard && (
        <LeaderboardModal
          currentPlayerName={profile.name}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  );
}
