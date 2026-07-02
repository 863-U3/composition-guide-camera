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
