type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
  unlock?: () => void;
};

const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/**
 * Gọi TRỰC TIẾP trong sự kiện click (trước mọi await) vì trình duyệt chỉ cho vào
 * toàn màn hình / khóa hướng sau thao tác của người dùng.
 * Nếu không hỗ trợ (vd. iOS Safari), CSS `html.force-landscape` sẽ tự xoay giao diện.
 */
export async function enterLandscape(): Promise<void> {
  if (!isTouchDevice()) return;
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    }
    await (screen.orientation as LockableOrientation).lock?.('landscape');
  } catch {
    // Không hỗ trợ hoặc bị từ chối: dùng CSS dự phòng.
  }
}

/** Trả về hướng/toàn màn hình mặc định khi rời màn chơi. */
export async function exitLandscape(): Promise<void> {
  if (!isTouchDevice()) return;
  try {
    (screen.orientation as LockableOrientation).unlock?.();
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    // Bỏ qua.
  }
}

