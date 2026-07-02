import { drawGuide } from './renderer.js';
import { visibleVideoRect } from './hittest.js';

// crop: overlayが見せているvideo画素矩形 {x,y,w,h}（未指定ならフルフレーム）。
// canvasはcropサイズで作り、burn-inガイドはcanvas全体に描く（＝プレビューと一致）。
export async function capture(videoEl, { burnIn = false, variant, opacity = 0.8, crop } = {}) {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const src = crop && crop.w > 0 && crop.h > 0 ? crop : { x: 0, y: 0, w: vw, h: vh };

  const c = document.createElement('canvas');
  c.width = Math.round(src.w);
  c.height = Math.round(src.h);
  const ctx = c.getContext('2d');
  ctx.drawImage(videoEl, src.x, src.y, src.w, src.h, 0, 0, c.width, c.height);
  if (burnIn && variant) drawGuide(ctx, variant, c.width, c.height, { opacity });
  return new Promise(res => c.toBlob(res, 'image/jpeg', 0.92));
}

export { visibleVideoRect };

export function download(blob, name = `photo-${Date.now()}.jpg`) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob), download: name,
  });
  a.click(); URL.revokeObjectURL(a.href);
}
