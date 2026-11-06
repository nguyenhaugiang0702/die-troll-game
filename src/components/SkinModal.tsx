'use client';

import { useEffect, useRef, useState } from 'react';
import {
  SKINS,
  isSkinUnlocked,
  resolveActiveSkinId,
  drawPuppetSkin,
  spawnSkinMoveEffect,
  spawnSkinJumpEffect,
  spawnSkinLandEffect,
  renderSkinParticles,
  type SkinParticle,
} from '@/lib/skins';
import { sound } from '@/lib/sound';

interface SkinModalProps {
  currentLevel: number;
  totalDeaths: number;
  selectedSkinId: string;
  onSelectSkin: (skinId: string) => void;
  onClose: () => void;
}

// Component hiển thị chuyển động preview nhỏ cho từng skin: Chạy, Nhảy và Tiếp đất
function SkinMiniPreview({
  skinId,
  levelNumber,
  isEquipped,
}: {
  skinId: string;
  levelNumber: number;
  isEquipped?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let tick = 0;
    const particles: SkinParticle[] = [];
    const resolvedId = resolveActiveSkinId(skinId, levelNumber);

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Hiệu ứng nền nhẹ
      ctx.fillStyle = '#171224';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Mặt đất mini
      ctx.strokeStyle = '#382f54';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(6, 60);
      ctx.lineTo(78, 60);
      ctx.stroke();

      // Chu kỳ 130 tick:
      // 0..45: Di chuyển (Run) với vệt chân
      // 46..75: Nhảy (Jump) với phản lực bung tỏa
      // 76..95: Tiếp đất (Land) với sóng xung kích & co giãn
      // 96..129: Lùi lại / Quay đầu nhẹ
      const cycle = tick % 130;
      let cx = 42;
      let y = 26;
      let s = 0;
      let o = 0;
      let f = 1;
      let scaleX = 1;
      let scaleY = 1;

      if (cycle <= 45) {
        // 1. Di chuyển (Run)
        f = 1;
        const moveProgress = cycle / 45;
        cx = 24 + moveProgress * 22; // từ 24 -> 46
        y = 26;
        s = Math.sin(cycle * 0.4) * 5;
        o = 0;
        if (cycle % 4 === 0) {
          spawnSkinMoveEffect(particles, cx, 60, f, resolvedId, tick);
        }
      } else if (cycle <= 75) {
        // 2. Khi Nhảy (Jump)
        f = 1;
        if (cycle === 46) {
          spawnSkinJumpEffect(particles, cx, 60, resolvedId);
        }
        const jumpProgress = (cycle - 46) / 29;
        const jumpHeight = Math.sin(jumpProgress * Math.PI) * 20;
        y = 26 - jumpHeight;
        cx = 46 + jumpProgress * 6;
        s = 2;
        o = -3;
        if (jumpProgress < 0.28) {
          scaleX = 0.9;
          scaleY = 1.15;
        }
      } else if (cycle <= 95) {
        // 3. Khi Tiếp Đất (Land)
        f = 1;
        cx = 52;
        y = 26;
        if (cycle === 76) {
          spawnSkinLandEffect(particles, cx, 60, resolvedId, 1.2);
        }
        const landFactor = Math.max(0, (90 - cycle) / 14);
        scaleX = 1 + landFactor * 0.25;
        scaleY = 1 - landFactor * 0.25;
        s = 0;
        o = 0;
      } else {
        // 4. Quay lại / chuẩn bị chu kỳ mới
        f = -1;
        const backProgress = (cycle - 96) / 33;
        cx = 52 - backProgress * 28;
        y = 26;
        s = Math.sin(cycle * 0.25) * 4;
        o = 0;
        if (cycle % 5 === 0) {
          spawnSkinMoveEffect(particles, cx, 60, f, resolvedId, tick);
        }
      }

      // Cập nhật và vẽ các hạt hiệu ứng của skin
      renderSkinParticles(ctx, particles);

      // Vẽ nhân vật con rối
      drawPuppetSkin(ctx, cx, y, s, o, f, resolvedId, tick, scaleX, scaleY);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [skinId, levelNumber]);

  return (
    <div className="skin-preview-wrap">
      <canvas
        ref={canvasRef}
        width={84}
        height={74}
        className="skin-mini-canvas"
        style={{
          border: isEquipped ? '1.5px solid #f5c542' : '1.5px solid #3d3463',
        }}
      />
      <span className="skin-preview-hint">Chạy · Nhảy · Đáp</span>
    </div>
  );
}

export default function SkinModal({
  currentLevel,
  totalDeaths,
  selectedSkinId,
  onSelectSkin,
  onClose,
}: SkinModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'level' | 'deaths'>('all');

  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleEquip = (skinId: string) => {
    sound.playClick();
    onSelectSkin(skinId);
  };

  const levelSkins = SKINS.filter((s) => s.type === 'level');
  const deathSkins = SKINS.filter((s) => s.type === 'deaths');
  const autoSkin = SKINS.find((s) => s.type === 'auto')!;

  const filteredSkins =
    activeTab === 'all'
      ? SKINS
      : activeTab === 'level'
      ? [autoSkin, ...levelSkins]
      : deathSkins;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card-skins"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lb-modal-header">
          <div className="lb-modal-title-row">
            <h3 className="modal-title lb-modal-title">
              👕 Tủ Đồ Trang Phục (Skins)
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
            Trang bị skin để kích hoạt diện mạo độc quyền cùng hiệu ứng <strong>Di chuyển</strong>, <strong>Nhảy</strong> và <strong>Tiếp đất</strong> đặc trưng!
          </p>
        </div>

        {/* Tab chuyển đổi danh mục */}
        <div className="skin-tabs">
          <button
            type="button"
            className={`skin-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tất cả ({SKINS.length})
          </button>
          <button
            type="button"
            className={`skin-tab-btn ${activeTab === 'level' ? 'active' : ''}`}
            onClick={() => setActiveTab('level')}
          >
            🎯 Theo Màn (5)
          </button>
          <button
            type="button"
            className={`skin-tab-btn ${activeTab === 'deaths' ? 'active' : ''}`}
            onClick={() => setActiveTab('deaths')}
          >
            💀 Theo Số Lần Chết (4)
          </button>
        </div>

        {/* Danh sách các Skin */}
        <div className="skin-grid-container">
          {filteredSkins.map((skin) => {
            const unlocked = isSkinUnlocked(skin, currentLevel, totalDeaths);
            const isEquipped = selectedSkinId === skin.id;

            // Tính tiến độ mở khóa nếu chưa mở
            let progressText = '';
            let progressPercent = 100;
            if (!unlocked) {
              if (skin.type === 'level') {
                const req = skin.reqValue || 1;
                progressPercent = Math.min(100, Math.floor(((currentLevel || 1) / req) * 100));
                progressText = `Cần đạt Màn ${req} (Hiện tại: Màn ${currentLevel || 1}/${req})`;
              } else if (skin.type === 'deaths') {
                const req = skin.reqValue || 0;
                progressPercent = Math.min(100, Math.floor(((totalDeaths || 0) / req) * 100));
                progressText = `Cần chết ${req} lần (Hiện tại: ${totalDeaths || 0}/${req})`;
              }
            }

            return (
              <div
                key={skin.id}
                className={`skin-card ${isEquipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}
              >
                <SkinMiniPreview
                  skinId={skin.id}
                  levelNumber={currentLevel}
                  isEquipped={isEquipped}
                />

                <div className="skin-card-info">
                  <div className="skin-card-title-row">
                    <span className="skin-card-name">
                      {skin.icon} {skin.name}
                    </span>
                    {skin.id === 'auto' && (
                      <span className="skin-badge-auto">Tự đổi màn</span>
                    )}
                  </div>
                  <p className="skin-card-desc">{skin.desc}</p>

                  {/* Chi tiết hiệu ứng Chạy, Nhảy, Tiếp đất của Skin */}
                  {skin.effects && (
                    <div className="skin-effects-box">
                      <div className="skin-effect-item">
                        <span className="skin-effect-label">👟 Chạy:</span>
                        <span className="skin-effect-val">{skin.effects.move}</span>
                      </div>
                      <div className="skin-effect-item">
                        <span className="skin-effect-label">🚀 Nhảy:</span>
                        <span className="skin-effect-val">{skin.effects.jump}</span>
                      </div>
                      <div className="skin-effect-item">
                        <span className="skin-effect-label">💥 Đáp:</span>
                        <span className="skin-effect-val">{skin.effects.land}</span>
                      </div>
                    </div>
                  )}

                  {!unlocked ? (
                    <div className="skin-lock-box">
                      <div className="skin-lock-header">
                        <span className="skin-lock-icon">🔒</span>
                        <span className="skin-lock-text">{progressText}</span>
                      </div>
                      <div className="skin-progress-bar">
                        <div
                          className="skin-progress-fill"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="skin-action-row">
                      {isEquipped ? (
                        <span className="skin-badge-equipped">✓ Đang trang bị</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-skin-equip"
                          onClick={() => handleEquip(skin.id)}
                        >
                          Trang bị
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lb-modal-footer">
          <button className="btn-secondary lb-btn-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
