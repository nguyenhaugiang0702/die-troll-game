'use client';

import { useEffect, useState } from 'react';
import { fetchLeaderboard, formatPlayTime, type Player } from '@/lib/supabase';
import AvatarDisplay from './AvatarDisplay';

interface LeaderboardModalProps {
  currentPlayerName?: string;
  onClose: () => void;
}

interface PreviewAvatarData {
  avatar: string;
  name: string;
  isMe?: boolean;
}

export default function LeaderboardModal({
  currentPlayerName,
  onClose,
}: LeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<Player[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewAvatar, setPreviewAvatar] = useState<PreviewAvatarData | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError('');
      const res = await fetchLeaderboard();
      if (!isMounted) return;
      setLoading(false);
      if ('error' in res) {
        setError(res.error);
      } else {
        setLeaderboard(res.data);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Đóng modal phóng to ảnh hoặc đóng toàn bộ bảng điểm bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewAvatar) {
          setPreviewAvatar(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewAvatar, onClose]);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-card modal-card-leaderboard"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="lb-modal-header">
            <div className="lb-modal-title-row">
              <h3 className="modal-title lb-modal-title">
                🏆 Bảng Xếp Hạng Cao Thủ
              </h3>
              <button
                onClick={onClose}
                className="btn-modal-close"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <p className="modal-desc lb-modal-desc">
              Xếp hạng theo màn cao nhất vượt qua, ít lần chết nhất & thời gian nhanh nhất.
            </p>
          </div>

          <div className="lb-table-container">
            {loading && <div className="lb-empty">Đang tải bảng xếp hạng...</div>}
            {error && <div className="lb-empty lb-error">❌ {error}</div>}
            {!loading && !error && leaderboard && leaderboard.length === 0 && (
              <div className="lb-empty">Chưa có ai lưu điểm. Hãy là người đầu tiên chinh phục!</div>
            )}
            {!loading && !error && leaderboard && leaderboard.length > 0 && (
              <table className="lb-table">
                <thead>
                  <tr>
                    <th className="lb-col-rank">#</th>
                    <th className="lb-col-player">Người chơi</th>
                    <th className="lb-col-level">Màn</th>
                    <th className="lb-col-deaths">
                      <span className="desk-only">Số lần chết</span>
                      <span className="mob-only">Chết</span>
                    </th>
                    <th className="lb-col-time">
                      <span className="desk-only">Thời gian</span>
                      <span className="mob-only">TG</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item, idx) => {
                    const isMe =
                      Boolean(currentPlayerName) &&
                      item.name?.trim().toLowerCase() === currentPlayerName?.trim().toLowerCase();
                    const rank =
                      idx === 0
                        ? '🥇'
                        : idx === 1
                          ? '🥈'
                          : idx === 2
                            ? '🥉'
                            : `${idx + 1}`;
                    return (
                      <tr key={item.id || idx} className={isMe ? 'lb-row-me' : ''}>
                        <td className="lb-col-rank">
                          <span className={`lb-rank-badge ${idx < 3 ? `top-${idx + 1}` : ''}`}>
                            {rank}
                          </span>
                        </td>
                        <td className="lb-col-player">
                          <div className="lb-player-cell">
                            <button
                              type="button"
                              className="lb-avatar-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewAvatar({
                                  avatar: item.avatar || '🎭',
                                  name: item.name || 'Ẩn danh',
                                  isMe,
                                });
                              }}
                              title="Nhấp để xem ảnh phóng to"
                              aria-label={`Xem ảnh đại diện của ${item.name || 'Ẩn danh'}`}
                            >
                              <AvatarDisplay
                                avatar={item.avatar}
                                size={28}
                                className="lb-player-avatar"
                              />
                            </button>
                            <span className="lb-player-name" title={item.name || 'Ẩn danh'}>
                              {item.name || 'Ẩn danh'}
                            </span>
                            {isMe && <span className="lb-you-badge">(Bạn)</span>}
                          </div>
                        </td>
                        <td className="lb-col-level">
                          <span className="lb-level-tag">
                            <span className="desk-only">Màn </span>
                            <span className="mob-only">M.</span>
                            {item.level || 1}
                          </span>
                        </td>
                        <td className="lb-col-deaths">
                          <span className="lb-deaths-val">{item.deaths || 0}</span>
                          <span className="desk-only lb-unit"> lần</span>
                        </td>
                        <td className="lb-col-time">
                          <span className="lb-time-val">
                            {formatPlayTime(item.play_time || 0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="lb-modal-footer">
            <button className="btn-secondary lb-btn-close" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Modal Phóng To Ảnh Avatar */}
      {previewAvatar && (
        <div
          className="lb-preview-overlay"
          onClick={() => setPreviewAvatar(null)}
        >
          <div
            className="lb-preview-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewAvatar(null)}
              className="btn-modal-close lb-preview-close"
              aria-label="Đóng xem trước"
            >
              ✕
            </button>
            <div className="lb-preview-avatar-box">
              <AvatarDisplay
                avatar={previewAvatar.avatar}
                size={160}
                style={{
                  borderRadius:
                    previewAvatar.avatar?.startsWith('data:image') ||
                    previewAvatar.avatar?.startsWith('http')
                      ? '16px'
                      : '50%',
                }}
              />
            </div>
            <div className="lb-preview-info">
              <div className="lb-preview-name-row">
                <span className="lb-preview-name">{previewAvatar.name}</span>
                {previewAvatar.isMe && <span className="lb-you-badge">(Bạn)</span>}
              </div>
              <span className="lb-preview-hint">Nhấp vào bất kỳ đâu để đóng</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
