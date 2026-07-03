export function drawGuide(ctx, variant, w, h, opts = {}) {
  const { opacity = 0.8, color = '#ffffff', highlight = [] } = opts;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (const [x1, y1, x2, y2] of variant.lines) {
    ctx.beginPath(); ctx.moveTo(x1 * w, y1 * h); ctx.lineTo(x2 * w, y2 * h); ctx.stroke();
  }
  for (const [cx, cy, r] of variant.circles) {
    ctx.beginPath(); ctx.arc(cx * w, cy * h, r * Math.min(w, h), 0, Math.PI * 2); ctx.stroke();
  }
  // arcs = [cx, cy, r, 開始角deg, 終了角deg]（S字・C字などの部分円弧）
  for (const [cx, cy, r, a1, a2] of variant.arcs ?? []) {
    ctx.beginPath();
    ctx.arc(cx * w, cy * h, r * Math.min(w, h), (a1 * Math.PI) / 180, (a2 * Math.PI) / 180);
    ctx.stroke();
  }
  for (const sp of variant.spirals ?? []) drawSpiral(ctx, sp, w, h);
  // スイートスポット: 破線円。highlightに入っていれば発光（太line＋glow色）
  variant.sweetSpots.forEach(([cx, cy, r], i) => {
    ctx.save();
    ctx.setLineDash(highlight.includes(i) ? [] : [6, 5]);
    if (highlight.includes(i)) {
      ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 14;
    }
    ctx.beginPath(); ctx.arc(cx * w, cy * h, r * Math.min(w, h), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

// drawArrow: 被写体位置(from)→スポット(to)へ誘導する矢印。座標は正規化{x,y}（0〜1）。
// opts.dist: 正規化距離。0.4以上で最も薄く(0.4)…実際は距離が遠いほど強調(0.9)、近いほど弱める(0.4)。dist===0なら描画しない。
export function drawArrow(ctx, from, to, w, h, opts = {}) {
  const { dist = 1, color = '#ffffff' } = opts;
  if (dist === 0) return;
  const clamped = Math.min(Math.max(dist, 0), 0.4);
  // 遠い(0.4以上)ほど濃く0.9、近い(0)ほど薄く0.4
  const opacity = 0.4 + (clamped / 0.4) * 0.5;
  const x1 = from.x * w, y1 = from.y * h;
  const x2 = to.x * w, y2 = to.y * h;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.min(w, h) * 0.025;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  // 先端三角
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// drawLevel: 画面中央に固定の薄い水平基準線＋現在の傾き線（angleDeg回転）。level:trueなら両方緑。
export function drawLevel(ctx, angleDeg, w, h, opts = {}) {
  const { level = false } = opts;
  const cx = w / 2, cy = h / 2;
  const halfLen = w * 0.2;
  const activeColor = level ? '#4ade80' : '#ffffff';
  ctx.save();
  // 固定基準線（薄い水平線）
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = level ? '#4ade80' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - halfLen, cy);
  ctx.lineTo(cx + halfLen, cy);
  ctx.stroke();
  // 現在の傾き線
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad) * halfLen, dy = Math.sin(rad) * halfLen;
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = activeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - dx, cy - dy);
  ctx.lineTo(cx + dx, cy + dy);
  ctx.stroke();
  ctx.restore();
}

export function drawSpiral(ctx, { cx, cy, scale = 1, rotation = 0, mirror = false }, w, h) {
  // フィボナッチ近似スパイラル: 対数螺旋 r=a*b^θ を回転・反転して描く
  const b = Math.pow(1.618, 2 / Math.PI);
  const a = 0.004 * Math.min(w, h) * scale;
  const rot = (rotation * Math.PI) / 180;
  ctx.beginPath();
  for (let t = 0; t <= Math.PI * 6; t += 0.05) {
    const r = a * Math.pow(b, t);
    let x = r * Math.cos(t), y = r * Math.sin(t);
    if (mirror) x = -x;
    const rx = x * Math.cos(rot) - y * Math.sin(rot);
    const ry = x * Math.sin(rot) + y * Math.cos(rot);
    const px = cx * w + rx, py = cy * h + ry;
    t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
}
