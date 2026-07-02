// 誘導純関数群。DOM非依存・正規化座標(0..1)。

// 被写体bbox面積比の閾値（小さすぎ/大きすぎ判定）
export const SIZE_MIN = 0.04;
export const SIZE_MAX = 0.55;

// 水平とみなすロール角の許容（度）
const LEVEL_TOLERANCE_DEG = 2;

// 主被写体中心から最寄りスイートスポット中心へのベクトル。
// スポット半径内なら「到達済み」として {dx:0, dy:0, dist:0, spotIndex}。
// subjectなし or sweetSpots空なら null。
export function guidanceVector(subject, variant) {
  if (!subject || !variant || !variant.sweetSpots || variant.sweetSpots.length === 0) return null;
  let best = null;
  variant.sweetSpots.forEach(([sx, sy, r], i) => {
    const dx = sx - subject.cx;
    const dy = sy - subject.cy;
    const dist = Math.hypot(dx, dy);
    if (!best || dist < best.dist) best = { dx, dy, dist, spotIndex: i, r };
  });
  if (best.dist <= best.r) return { dx: 0, dy: 0, dist: 0, spotIndex: best.spotIndex };
  return { dx: best.dx, dy: best.dy, dist: best.dist, spotIndex: best.spotIndex };
}

// bbox面積比で「寄って/引いて」を助言。範囲内は null。
export function sizeAdvice(subject) {
  if (!subject) return null;
  const area = subject.w * subject.h;
  if (area < SIZE_MIN) return 'closer';
  if (area > SIZE_MAX) return 'back';
  return null;
}

// ロール角を -180..180 に正規化し、|angle| <= 2 で水平判定。
export function levelState(rollDeg) {
  let angle = ((rollDeg % 360) + 360) % 360; // 0..360
  if (angle > 180) angle -= 360;             // -180..180
  return { level: Math.abs(angle) <= LEVEL_TOLERANCE_DEG, angle };
}

// 主被写体の選定: manual優先、なければ最大面積のdetected。
export function primarySubject(detected, manual) {
  if (manual) return manual;
  if (!detected || detected.length === 0) return null;
  return detected.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
}
