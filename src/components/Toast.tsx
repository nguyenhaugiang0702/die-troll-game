'use client';

interface ToastProps {
  title: string;
  message: string;
  localData?: { level: number; deaths: number; name: string };
  serverData?: { level: number; deaths: number; name: string };
  onSyncServer?: () => void;
  onClose: () => void;
}

export default function Toast({
  title,
  message,
  localData,
  serverData,
  onSyncServer,
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

        {localData && serverData && (
          <div className="toast-diff-box">
            <div className="toast-diff-row">
              <span className="diff-label">Dữ liệu trên máy (Local):</span>
              <span className="diff-val-local">
                Màn {localData.level} · {localData.deaths} lần chết
                {localData.name !== serverData.name ? ` (${localData.name})` : ''}
              </span>
            </div>
            <div className="toast-diff-row">
              <span className="diff-label">Dữ liệu máy chủ (Server):</span>
              <span className="diff-val-server">
                Màn {serverData.level} · {serverData.deaths} lần chết
                {localData.name !== serverData.name ? ` (${serverData.name})` : ''}
              </span>
            </div>
          </div>
        )}

        <div className="toast-actions">
          <button className="btn-toast-dismiss" onClick={onClose}>
            Bỏ qua
          </button>
          {serverData && onSyncServer && (
            <button className="btn-toast-action" onClick={onSyncServer}>
              🔄 Khôi phục theo Server
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

