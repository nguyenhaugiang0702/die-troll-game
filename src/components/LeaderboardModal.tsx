'use client';

import { useEffect, useState } from 'react';
import { fetchLeaderboard, formatPlayTime, type Player } from '@/lib/supabase';
import AvatarDisplay from './AvatarDisplay';

interface LeaderboardModalProps {
  currentPlayerName?: string;
  onClose: () => void;
}

export default function LeaderboardModal({
  currentPlayerName,
  onClose,
}: LeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<Player[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 620 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="modal-title" style={{ margin: 0, textAlign: 'left' }}>
            🏆 Bảng Xếp Hạng Cao Thủ
          </h3>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '4px 10px', fontSize: '13px' }}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <p className="modal-desc" style={{ textAlign: 'left', marginBottom: 12 }}>
          Xếp hạng theo màn cao nhất vượt qua, ít lần chết nhất & tốc độ nhanh nhất.
        </p>

        <div id="lb-content" style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
          {loading && <div className="lb-empty">Đang tải bảng xếp hạng...</div>}
          {error && <div className="lb-empty" style={{ color: '#ff6b6b' }}>⚠️ {error}</div>}
          {!loading && !error && leaderboard && leaderboard.length === 0 && (
            <div className="lb-empty">Chưa có ai lưu điểm. Hãy là người đầu tiên chinh phục!</div>
          )}
          {!loading && !error && leaderboard && leaderboard.length > 0 && (
            <table className="lb-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Hạng</th>
                  <th>Người chơi</th>
                  <th style={{ textAlign: 'center' }}>Màn</th>
                  <th style={{ textAlign: 'center' }}>Số lần chết</th>
                  <th style={{ textAlign: 'right' }}>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((item, idx) => {
                  const isMe =
                    Boolean(currentPlayerName) &&
                    item.name?.toLowerCase() === currentPlayerName?.toLowerCase();
                  const rank =
                    idx === 0
                      ? '🥇 1'
                      : idx === 1
                        ? '🥈 2'
                        : idx === 2
                          ? '🥉 3'
                          : `${idx + 1}`;
                  return (
                    <tr key={item.id || idx} className={isMe ? 'me' : ''}>
                      <td>{rank}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <AvatarDisplay avatar={item.avatar} size={24} />
                          <span>{item.name || 'Ẩn danh'}</span>
                        </span>
                        {isMe && <span style={{ color: '#f5c542', marginLeft: 4 }}>(Bạn)</span>}
                      </td>
                      <td style={{ textAlign: 'center', color: '#f5c542', fontWeight: 600 }}>
                        Màn {item.level || 1}
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.deaths || 0} lần</td>
                      <td style={{ textAlign: 'right', color: '#a79aff', fontSize: '13px' }}>
                        {formatPlayTime(item.play_time || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-buttons" style={{ marginTop: 14 }}>
          <button className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
