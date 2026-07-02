export function hitTest(subjects, variant) {
  const hits = new Set();
  subjects.forEach((s) => {
    variant.sweetSpots.forEach(([sx, sy, r], i) => {
      if (Math.hypot(s.cx - sx, s.cy - sy) <= r) hits.add(i);
    });
  });
  return [...hits].sort((a, b) => a - b);
}

// videoはwindow全体にcover-fitされ、overlayはwindow内の中央サブ矩形。
// video画素座標系での cover-fit 幾何（scale・中央寄せオフセット）を返す。
function coverFit(videoW, videoH, windowW, windowH) {
  const scale = Math.max(windowW / videoW, windowH / videoH);
  const dispX0 = (windowW - videoW * scale) / 2;
  const dispY0 = (windowH - videoH * scale) / 2;
  return { scale, dispX0, dispY0 };
}

// overlay(window内のbounding rect: {x,y,w,h})が実際に見せている
// videoフレーム内の画素矩形 {x,y,w,h}（video px単位）を返す純関数。
// キャプチャのクロップ元矩形にそのまま使える。
export function visibleVideoRect(videoW, videoH, windowW, windowH, overlayRect) {
  const { scale, dispX0, dispY0 } = coverFit(videoW, videoH, windowW, windowH);
  return {
    x: (overlayRect.x - dispX0) / scale,
    y: (overlayRect.y - dispY0) / scale,
    w: overlayRect.w / scale,
    h: overlayRect.h / scale,
  };
}

// video正規化(0-1)の被写体を overlay正規化(0-1)へ変換する。
// 変換鎖: video正規化 → window CSS px(cover-fit) → overlay正規化(overlayのbounding rect)。
// overlayRect は {x,y,w,h}（window座標系のbounding rect）。
export function mapVideoToOverlay(subject, videoW, videoH, windowW, windowH, overlayRect) {
  const crop = visibleVideoRect(videoW, videoH, windowW, windowH, overlayRect);
  const subjectPxX = subject.cx * videoW;
  const subjectPxY = subject.cy * videoH;
  return {
    ...subject,
    cx: (subjectPxX - crop.x) / crop.w,
    cy: (subjectPxY - crop.y) / crop.h,
    w: (subject.w * videoW) / crop.w,
    h: (subject.h * videoH) / crop.h,
  };
}
