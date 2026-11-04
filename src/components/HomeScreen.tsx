'use client';

import { useState } from 'react';
import {
  registerOrFindPlayer,
  clearPlayerSession,
  verifyLocalWithServer,
  syncLocalWithServer,
  formatPlayTime,
  AVATAR_LIST,
  DEFAULT_AVATAR,
  type PlayerProfile,
} from '@/lib/supabase';
import LeaderboardModal from './LeaderboardModal';
import Toast from './Toast';
import AvatarDisplay from './AvatarDisplay';
import { enterLandscape, exitLandscape } from '@/lib/landscape';

interface HomeScreenProps {
  profile: PlayerProfile;
  onStartGame: (level: number, deaths: number, playTime: number, name: string) => void;
  onRefreshProfile: () => Promise<any>;
}

export default function HomeScreen({
  profile,
  onStartGame,
  onRefreshProfile,
}: HomeScreenProps) {
  const [showNameModal, setShowNameModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Trạng thái kiểm tra & Toast báo lỗi không khớp
  const [isCheckingMatch, setIsCheckingMatch] = useState(false);
  const [toastData, setToastData] = useState<{
    title: string;
    message: string;
    serverData?: { level: number; deaths: number; playTime: number; name: string; avatar?: string };
  } | null>(null);

  // Xử lý khi nhấn nút "Chơi Ngay"
  const handlePlayClick = async () => {
    // Nếu chưa chơi lần nào (chưa có tên hoặc chưa có tiến trình)
    if (!profile.hasPlayed || !profile.name) {
      setNameInput('');
      setSelectedAvatar(DEFAULT_AVATAR);
      setNameError('');
      setShowNameModal(true);
      return;
    }

    // Đã từng chơi: xoay ngang ngay trong thao tác nhấn, rồi đối soát LocalStorage với Server
    void enterLandscape();
    setIsCheckingMatch(true);
    setToastData(null);

    const check = await verifyLocalWithServer();
    setIsCheckingMatch(false);

    if (check.isNewUser) {
      void exitLandscape();
      setShowNameModal(true);
      return;
    }

    // Nếu KHÔNG MATCH: Chặn vào game và hiện Toast cảnh báo chung
    if (!check.isMatch) {
      void exitLandscape();
      setToastData({
        title: 'Lỗi đồng bộ dữ liệu',
        message:
          check.message ||
          'Dữ liệu trò chơi không đồng bộ hoặc đã bị thay đổi. Vui lòng đồng bộ lại để tiếp tục.',
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

  // Xác nhận tạo người chơi mới
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

    void enterLandscape();
    try {
      setIsSubmitting(true);
      setNameError('');
      const saved = await registerOrFindPlayer(trimmed, selectedAvatar);
      await onRefreshProfile();
      setShowNameModal(false);
      onStartGame(saved.level || 1, saved.deaths || 0, saved.playTime || 0, saved.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
      setNameError(msg);
      void exitLandscape();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lưu chỉnh sửa Tên & Avatar
  const handleSaveEditProfile = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Tên không được để trống!');
      return;
    }
    if (trimmed.length > 20) {
      setNameError('Tên không được vượt quá 20 ký tự!');
      return;
    }

    try {
      setIsSubmitting(true);
      setNameError('');
      await registerOrFindPlayer(trimmed, selectedAvatar);
      await onRefreshProfile();
      setShowEditModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu.';
      setNameError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetProfile = () => {
    if (window.confirm('Bạn có chắc muốn xoá tiến trình trên máy này để tạo người chơi mới?')) {
      clearPlayerSession();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('puppet_active_screen', 'home');
      }
      setShowEditModal(false);
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
      {/* Toast thông báo lỗi */}
      {toastData && (
        <Toast
          title={toastData.title}
          message={toastData.message}
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
              <button
                className="profile-avatar-btn"
                onClick={() => {
                  setNameInput(profile.name);
                  setSelectedAvatar(profile.avatar || DEFAULT_AVATAR);
                  setNameError('');
                  setShowEditModal(true);
                }}
                title="Nhấn để đổi Avatar & Tên"
              >
                <AvatarDisplay avatar={profile.avatar || DEFAULT_AVATAR} size={40} />
              </button>
              <div className="profile-details">
                <span className="profile-greeting">Chào mừng trở lại!</span>
                <span className="profile-name">{profile.name}</span>
              </div>
              <button
                className="profile-reset-btn"
                onClick={() => {
                  setNameInput(profile.name);
                  setSelectedAvatar(profile.avatar || DEFAULT_AVATAR);
                  setNameError('');
                  setShowEditModal(true);
                }}
                title="Đổi tên / Avatar"
              >
                Sửa hồ sơ ✎
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

      {/* Modal Nhập Tên & Chọn/Tải Avatar cho người chơi mới */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowNameModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Chào Mừng Người Chơi!</h3>
            <p className="modal-desc">
              Tải ảnh đại diện hoặc chọn biểu tượng và đặt tên của bạn:
            </p>

            {/* Avatar Preview & Upload */}
            <div className="avatar-picker-label">Hình đại diện (Avatar):</div>
            <div className="avatar-preview-box">
              <div className="avatar-preview-circle">
                <AvatarDisplay avatar={selectedAvatar} size={56} />
              </div>
            </div>

            {/* Quick Presets */}
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

            <div className="avatar-picker-label">Biệt danh người chơi:</div>
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

      {/* Modal Sửa Hồ Sơ (Tên & Avatar ảnh/biểu tượng) */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Hồ Sơ Người Chơi</h3>
            <p className="modal-desc">Tải ảnh đại diện mới hoặc đổi tên hiển thị của bạn:</p>

            {/* Avatar Preview & Upload */}
            <div className="avatar-picker-label">Hình đại diện (Avatar):</div>
            <div className="avatar-preview-box">
              <div className="avatar-preview-circle">
                <AvatarDisplay avatar={selectedAvatar} size={56} />
              </div>
            </div>

            {/* Quick Presets */}
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

            <div className="avatar-picker-label">Tên hiển thị:</div>
            <input
              className="modal-input"
              placeholder="Nhập tên mới..."
              maxLength={20}
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (nameError) setNameError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleSaveEditProfile()}
              autoFocus
              disabled={isSubmitting}
            />

            {nameError && (
              <p style={{ color: '#ff6b6b', fontSize: '13px', margin: '-8px 0 12px 0', textAlign: 'center' }}>
                ⚠️ {nameError}
              </p>
            )}

            <div className="modal-buttons" style={{ justifyContent: 'space-between' }}>
              <button
                className="btn-secondary"
                style={{ color: '#ff6b6b', borderColor: '#6b2d3d' }}
                onClick={handleResetProfile}
                disabled={isSubmitting}
                title="Xoá tiến trình và tạo tài khoản mới"
              >
                Chơi mới
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  className="btn-action"
                  onClick={handleSaveEditProfile}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu hồ sơ'}
                </button>
              </div>
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
