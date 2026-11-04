'use client';

interface ToastProps {
  title: string;
  message: string;
  onSyncServer?: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  closeLabel?: string;
  onClose: () => void;
}

export default function Toast({
  title,
  message,
  onSyncServer,
  onConfirm,
  confirmLabel = 'Xác nhận',
  closeLabel = 'Đóng',
  onClose,
}: ToastProps) {
  return (
    <div className="toast-container" role="alert" aria-live="assertive">
      <div className="toast-card">
        <div className="toast-header">
          <div className="toast-title-group">
            <span className="toast-icon">⚠️</span>
            <h4 className="toast-title">{title}</h4>
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
            <button className="btn-toast-action" onClick={onConfirm}>
              {confirmLabel}
            </button>
          )}
          {onSyncServer && (
            <button className="btn-toast-action" onClick={onSyncServer}>
              🔄 Đồng bộ lại dữ liệu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
