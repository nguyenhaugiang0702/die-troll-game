'use client';

export type ToastType = 'success' | 'warning' | 'error';

interface ToastProps {
  title: string;
  message: string;
  type?: ToastType;
  icon?: string;
  onSyncServer?: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  closeLabel?: string;
  onClose: () => void;
}

export default function Toast({
  title,
  message,
  type = 'warning',
  icon,
  onSyncServer,
  onConfirm,
  confirmLabel = 'Xác nhận',
  closeLabel = 'Đóng',
  onClose,
}: ToastProps) {
  // Quy ước chuẩn:
  // - success: Xanh lá (✅) -> thành công, ok
  // - warning: Vàng / Cam (⚠️) -> cần xác nhận (confirm), cảnh báo
  // - error: Đỏ (❌) -> lỗi
  const defaultIcon =
    type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
  const displayIcon = icon || defaultIcon;

  return (
    <div className={`toast-container toast-container-${type}`} role="alert" aria-live="assertive">
      <div className={`toast-card toast-card-${type}`}>
        <div className="toast-header">
          <div className="toast-title-group">
            <span className="toast-icon">{displayIcon}</span>
            <h4 className={`toast-title toast-title-${type}`}>{title}</h4>
          </div>
          <button
            onClick={onClose}
            className="toast-close-btn"
            title="Đóng thông báo"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <p className="toast-body">{message}</p>

        <div className="toast-actions">
          <button className="btn-toast-dismiss" onClick={onClose}>
            {closeLabel}
          </button>
          {onConfirm && (
            <button
              className={`btn-toast-action btn-toast-action-${type}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          )}
          {onSyncServer && (
            <button
              className="btn-toast-action btn-toast-action-warning"
              onClick={onSyncServer}
            >
              🔄 Đồng bộ lại dữ liệu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}