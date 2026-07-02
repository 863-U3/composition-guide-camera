import { drawGuide } from './renderer.js';

export async function capture(videoEl, { burnIn = false, variant, opacity = 0.8 } = {}) {
  const c = document.createElement('canvas');
  c.width = videoEl.videoWidth; c.height = videoEl.videoHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(videoEl, 0, 0);
  if (burnIn && variant) drawGuide(ctx, variant, c.width, c.height, { opacity });
  return new Promise(res => c.toBlob(res, 'image/jpeg', 0.92));
}

export function download(blob, name = `photo-${Date.now()}.jpg`) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob), download: name,
  });
  a.click(); URL.revokeObjectURL(a.href);
}
