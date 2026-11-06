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

  // 1. Thử khóa hướng ngang bằng ScreenOrientation API (hoạt động tốt trên Android Chrome, Edge, Samsung Internet)
  try {
    await (screen.orientation as LockableOrientation).lock?.('landscape');
  } catch {
    // Trình duyệt không hỗ trợ hoặc cần toàn màn hình trước
  }

  // 2. Thử vào toàn màn hình (fullscreen) để hỗ trợ tốt hơn cho việc khóa hướng
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
      // Khóa lại sau khi đã vào toàn màn hình (yêu cầu của một số trình duyệt Android)
      try {
        await (screen.orientation as LockableOrientation).lock?.('landscape');
      } catch { }
    }
  } catch {
    // Không hỗ trợ (vd. iOS Safari): CSS force-landscape sẽ đảm nhận
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

