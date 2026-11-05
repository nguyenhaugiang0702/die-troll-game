'use client';

import { useState, useEffect } from 'react';
import {
  registerOrFindPlayer,
  clearPlayerSession,
  verifyLocalWithServer,
  syncLocalWithServer,
  formatPlayTime,
  AVATAR_LIST,
  DEFAULT_AVATAR,
  restoreAccountById,
  type PlayerProfile,
} from '@/lib/supabase';
import LeaderboardModal from './LeaderboardModal';
import Toast from './Toast';
import AvatarDisplay from './AvatarDisplay';
import SoundButton from './SoundButton';
import { sound } from '@/lib/sound';
import { enterLandscape, exitLandscape } from '@/lib/landscape';
import SkinModal from './SkinModal';
import { getSelectedSkin, setSelectedSkin } from '@/lib/skins';

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
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSkinModal, setShowSkinModal] = useState(false);
  const [selectedSkin, setSelectedSkinState] = useState('auto');

  useEffect(() => {
    setSelectedSkinState(getSelectedSkin());
  }, []);

  const handleSelectSkin = (skinId: string) => {
    setSelectedSkin(skinId);
    setSelectedSkinState(skinId);
  };

  // Sao chép ID & Khôi phục ID
  const [copiedId, setCopiedId] = useState(false);
  const [restoreIdInput, setRestoreIdInput] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Sao chép ID người chơi
  const handleCopyId = async () => {
    if (!profile.id) return;
    const idStr = String(profile.id);
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(idStr);
        copied = true;
      }
    } catch {
      // fallback
    }

    if (!copied) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = idStr;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch {
        // fallback
      }
    }

    if (copied) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2200);
    } else {
      setToastData({
        type: 'error',
        title: 'Không thể tự sao chép',
        message: `Trình duyệt chặn sao chép. Hãy chép thủ công mã ID: ${idStr}`,
      });
    }
  };

  // Khôi phục tài khoản bằng ID
  const handleConfirmRestoreId = async () => {
    const trimmed = restoreIdInput.trim();
    if (!trimmed) {
      setRestoreError('Vui lòng nhập hoặc dán mã ID người chơi!');
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreError('');
      const restored = await restoreAccountById(trimmed);
      await onRefreshProfile();
      setShowRestoreModal(false);
      setToastData({
        type: 'success',
        title: 'Khôi phục thành công!',
        message: `Chào mừng ${restored.name} trở lại! Tiến trình của bạn: Màn ${restored.level}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể khôi phục tài khoản.';
      setRestoreError(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  // Trạng thái kiểm tra & Toast báo lỗi không khớp
  const [isCheckingMatch, setIsCheckingMatch] = useState(false);
  const [toastData, setToastData] = useState<{
    type?: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    serverData?: { level: number; deaths: number; playTime: number; name: string; avatar?: string };
    confirmLabel?: string;
    onConfirm?: () => void;
  } | null>(null);

  // Xử lý khi nhấn nút "Chơi Ngay"
  const handlePlayClick = async () => {
    sound.unlockAudio();
    if (!profile.hasPlayed || !profile.name) {
      setNameInput('');
      setSelectedAvatar(DEFAULT_AVATAR);
      setNameError('');
      setShowNameModal(true);
      return;
    }

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

    if (!check.isMatch) {
      void exitLandscape();
      setToastData({
        type: 'warning',
        title: 'Cần xác nhận đồng bộ dữ liệu',
        message:
          check.message ||
          'Dữ liệu trò chơi không đồng bộ hoặc đã bị thay đổi. Vui lòng xác nhận để đồng bộ lại.',
        serverData: check.serverData,
      });
      return;
    }

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

  // Đặt lại hồ sơ (Tạo mới) - xác nhận bằng Toast
  const handleResetProfile = () => {
    setToastData({
      type: 'warning',
      title: 'Chơi mới?',
      message:
        'Bạn sẽ thoát khỏi tài khoản hiện tại trên thiết bị này để bắt đầu người chơi mới. Tiến trình cũ vẫn được lưu trên máy chủ, hãy sao chép ID trước để khôi phục lại sau.',
      confirmLabel: 'Chơi mới',
      onConfirm: () => {
        clearPlayerSession();
        setShowEditModal(false);
        setToastData(null);
        onRefreshProfile();
      },
    });
  };

  return (
    <div className="home-container">
      {/* Toast thông báo */}
      {toastData && (
        <Toast
          type={toastData.type || 'warning'}
          title={toastData.title}
          message={toastData.message}
          onClose={() => setToastData(null)}
          onConfirm={
            toastData.onConfirm
              ? toastData.onConfirm
              : toastData.serverData
              ? () => {
                  syncLocalWithServer(toastData.serverData!);
                  setToastData(null);
                  onRefreshProfile();
                }
              : undefined
          }
          confirmLabel={toastData.confirmLabel || (toastData.serverData ? 'Đồng bộ lại' : undefined)}
        />
      )}

      {/* Top Bar: Nút Bật/Tắt Âm Thanh */}
      <div className="home-top-bar">
        <SoundButton size="md" />
      </div>

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
                <AvatarDisplay avatar={profile.avatar || DEFAULT_AVATAR} size={42} />
              </button>
              <div className="profile-details">
                <span className="profile-greeting">Chào mừng trở lại!</span>
                <span className="profile-name">{profile.name}</span>
                {profile.id && (
                  <span className="profile-id-badge" title={`Mã ID đầy đủ: ${profile.id}`}>
                    ID: <code>{profile.id.length > 10 ? `${profile.id.slice(0, 8)}...` : profile.id}</code>
                  </span>
                )}
              </div>
              <div className="profile-actions">
                <button
                  type="button"
                  className="btn-profile-copy-id"
                  onClick={handleCopyId}
                  title="Sao chép ID để nhập vào trình duyệt khác khôi phục tiến trình"
                >
                  {copiedId ? '✓ Đã chép ID' : '📋 Sao chép ID'}
                </button>
                <button
                  type="button"
                  className="profile-reset-btn"
                  onClick={() => {
                    setNameInput(profile.name);
                    setSelectedAvatar(profile.avatar || DEFAULT_AVATAR);
                    setNameError('');
                    setShowEditModal(true);
                  }}
                  title="Đổi tên / Avatar"
                >
                  Sửa ✎
                </button>
              </div>
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
              <span>Chưa có tiến trình trên trình duyệt này</span>
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
                ? 'Đối soát dữ liệu với Server...'
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

        <button
          type="button"
          className="btn-home-skin"
          onClick={() => setShowSkinModal(true)}
        >
          <span className="btn-icon">👕</span>
          <span className="btn-text-group">
            <span className="btn-main-text">Tủ Đồ Trang Phục (Skins)</span>
            <span className="btn-sub-text">Mở khóa diện mạo độc lạ theo Màn & Số lần chết</span>
          </span>
        </button>

        {/* Nút phụ tuỳ chọn: ngang hàng trên PC, xếp dọc trên điện thoại */}
        <div className="home-sub-actions">
          <button
            type="button"
            className="btn-sub-action"
            onClick={() => {
              setRestoreIdInput('');
              setRestoreError('');
              setShowRestoreModal(true);
            }}
            title="Nhập mã ID người chơi bạn đã sao chép từ thiết bị cũ"
          >
            <span className="sub-btn-icon">🔑</span>
            <span>Khôi phục bằng ID</span>
          </button>

          {profile.hasPlayed && profile.name && (
            <button
              type="button"
              className="btn-sub-action btn-sub-reset"
              onClick={handleResetProfile}
              title="Thoát tài khoản trên máy này để chơi mới"
            >
              <span className="sub-btn-icon">🔄</span>
              <span>Chơi mới</span>
            </button>
          )}
        </div>
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

      {/* Lưu ý khi mở link qua ứng dụng (Zalo, Messenger, Facebook, TikTok...) */}
      <div className="home-browser-notice">
        <span className="notice-icon">💡</span>
        <div className="notice-text">
          <strong>Lưu ý:</strong> Nếu truy cập link bị lỗi hiển thị (lệch phím, méo màn hình...), bạn vui lòng nhấn vào dấu <strong>⋮</strong> hoặc <strong>⋯</strong> ở góc trên và chọn <strong>&quot;Mở bằng trình duyệt&quot;</strong> (Chrome / Safari) để chơi mượt mà nhất nhé!
        </div>
      </div>

      {/* Modal Nhập Tên & Chọn Avatar cho người chơi mới */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowNameModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Chào Mừng Người Chơi!</h3>
            <p className="modal-desc">
              Chọn biểu tượng và đặt tên của bạn để bắt đầu vượt 50 màn troll:
            </p>

            {/* Quick Presets Avatar */}
            <div className="avatar-picker-label">Hình đại diện:</div>
            <div className="avatar-preview-box">
              <div className="avatar-preview-circle">
                <AvatarDisplay avatar={selectedAvatar} size={56} />
              </div>
            </div>

            <div className="avatar-picker-label" style={{ marginTop: '8px' }}>
              Chọn biểu tượng có sẵn:
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
                ❌ {nameError}
              </p>
            )}

            {/* Chuyển sang khôi phục bằng ID */}
            <div className="modal-switch-box">
              <span>Đã chơi trên trình duyệt khác?</span>
              <button
                type="button"
                className="btn-switch-restore"
                onClick={() => {
                  setShowNameModal(false);
                  setRestoreIdInput('');
                  setRestoreError('');
                  setShowRestoreModal(true);
                }}
              >
                🔑 Nhập ID để khôi phục tiến trình ➔
              </button>
            </div>

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

      {/* Modal Sửa Hồ Sơ */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Hồ Sơ Người Chơi</h3>
            <p className="modal-desc">Đổi tên hiển thị hoặc biểu tượng đại diện của bạn:</p>

            {/* Avatar Preview */}
            <div className="avatar-picker-label">Hình đại diện:</div>
            <div className="avatar-preview-box">
              <div className="avatar-preview-circle">
                <AvatarDisplay avatar={selectedAvatar} size={56} />
              </div>
            </div>

            <div className="avatar-picker-label" style={{ marginTop: '8px' }}>
              Chọn biểu tượng có sẵn:
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
                ❌ {nameError}
              </p>
            )}

            {/* Mã ID người chơi đầy đủ */}
            {profile.id && (
              <div className="modal-id-section">
                <div className="modal-id-header">
                  <span className="avatar-picker-label" style={{ margin: 0 }}>Mã ID tài khoản của bạn:</span>
                  <button
                    type="button"
                    className="btn-modal-copy-id"
                    onClick={handleCopyId}
                  >
                    {copiedId ? '✓ Đã chép' : '📋 Sao chép ID'}
                  </button>
                </div>
                <div className="modal-id-box">
                  <code className="modal-id-code">{profile.id}</code>
                </div>
                <p className="modal-id-hint">Lưu mã này để dán vào trình duyệt khác khi muốn chơi tiếp.</p>
              </div>
            )}

            <div className="modal-buttons" style={{ justifyContent: 'flex-end' }}>
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
      )}

      {/* Modal Khôi Phục Bằng ID */}
      {showRestoreModal && (
        <div className="modal-overlay" onClick={() => !isRestoring && setShowRestoreModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">🔑 Khôi Phục Bằng ID</h3>
            <p className="modal-desc">
              Dán mã ID người chơi bạn đã sao chép từ Zalo / Safari cũ để lấy lại toàn bộ tiến trình:
            </p>

            <div className="restore-input-group">
              <input
                className="modal-input restore-id-input"
                placeholder="Dán mã ID (ví dụ: a1b2c3d4-...)"
                value={restoreIdInput}
                onChange={(e) => {
                  setRestoreIdInput(e.target.value);
                  if (restoreError) setRestoreError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && !isRestoring && handleConfirmRestoreId()}
                autoFocus
                disabled={isRestoring}
              />
              <button
                type="button"
                className="btn-paste-clipboard"
                onClick={async () => {
                  try {
                    if (navigator.clipboard && navigator.clipboard.readText) {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setRestoreIdInput(text.trim());
                        if (restoreError) setRestoreError('');
                      }
                    }
                  } catch {
                    // Clipboard denied
                  }
                }}
                title="Dán nhanh từ bộ nhớ tạm"
              >
                📋 Dán
              </button>
            </div>

            {restoreError && (
              <p style={{ color: '#ff6b6b', fontSize: '13px', margin: '-4px 0 12px 0', textAlign: 'center' }}>
                ❌ {restoreError}
              </p>
            )}

            <div className="modal-buttons">
              <button
                className="btn-secondary"
                onClick={() => setShowRestoreModal(false)}
                disabled={isRestoring}
              >
                Hủy
              </button>
              <button
                className="btn-action"
                onClick={handleConfirmRestoreId}
                disabled={isRestoring}
                style={{ padding: '8px 20px', minWidth: '130px' }}
              >
                {isRestoring ? 'Đang kiểm tra...' : 'Khôi Phục Tiến Trình 🚀'}
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

      {/* Modal Tủ Đồ Trang Phục (Skins) */}
      {showSkinModal && (
        <SkinModal
          currentLevel={profile.level || 1}
          totalDeaths={profile.deaths || 0}
          selectedSkinId={selectedSkin}
          onSelectSkin={handleSelectSkin}
          onClose={() => setShowSkinModal(false)}
        />
      )}
    </div>
  );
}
