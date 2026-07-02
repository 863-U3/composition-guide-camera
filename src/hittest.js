export function hitTest(subjects, variant) {
  const hits = new Set();
  subjects.forEach((s) => {
    variant.sweetSpots.forEach(([sx, sy, r], i) => {
      if (Math.hypot(s.cx - sx, s.cy - sy) <= r) hits.add(i);
    });
  });
  return [...hits].sort((a, b) => a - b);
}

// video座標系(0-1, videoW x videoH)の正規化被写体を、overlay座標系(0-1, overlayRect.w x overlayRect.h)へ変換する。
// overlayはvideoに対して中央寄せcover-fit（applyAspectと同じ幾何）で表示されている前提。
export function mapVideoToOverlay(subject, videoW, videoH, overlayRect) {
  const videoRatio = videoW / videoH;
  const overlayRatio = overlayRect.w / overlayRect.h;

  // videoフレーム内で、overlayに実際に表示されている領域(クロップ矩形, video px単位)を求める
  let cropW;
  let cropH;
  if (overlayRatio > videoRatio) {
    // overlayの方が横長 → videoの上下がクロップされる
    cropW = videoW;
    cropH = videoW / overlayRatio;
  } else {
    // overlayの方が縦長（または同じ） → videoの左右がクロップされる
    cropH = videoH;
    cropW = videoH * overlayRatio;
  }
  const cropX = (videoW - cropW) / 2;
  const cropY = (videoH - cropH) / 2;

  const subjectPxX = subject.cx * videoW;
  const subjectPxY = subject.cy * videoH;

  const cx = (subjectPxX - cropX) / cropW;
  const cy = (subjectPxY - cropY) / cropH;
  const w = (subject.w * videoW) / cropW;
  const h = (subject.h * videoH) / cropH;

  return { ...subject, cx, cy, w, h };
}
