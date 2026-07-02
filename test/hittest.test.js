import { test } from 'node:test';
import assert from 'node:assert';
import { hitTest, mapVideoToOverlay, visibleVideoRect } from '../src/hittest.js';

test('スポット半径内の被写体中心はヒット', () => {
  const v = { sweetSpots: [[0.5, 0.5, 0.1], [0.1, 0.1, 0.05]] };
  assert.deepEqual(hitTest([{ cx: 0.52, cy: 0.5, w: 0.2, h: 0.2 }], v), [0]);
  assert.deepEqual(hitTest([{ cx: 0.9, cy: 0.9, w: 0.1, h: 0.1 }], v), []);
});

test('mapVideoToOverlay: 中心はどんな幾何でも中心へ', () => {
  const subject = { cx: 0.5, cy: 0.5, w: 0.2, h: 0.2, label: 'cup', score: 0.9 };
  const mapped = mapVideoToOverlay(subject, 800, 600, 800, 600, { x: 0, y: 0, w: 800, h: 600 });
  assert.ok(Math.abs(mapped.cx - 0.5) < 1e-9);
  assert.ok(Math.abs(mapped.cy - 0.5) < 1e-9);
});

test('mapVideoToOverlay: 横window 1000x600 / video 1600x900 / overlay 1:1(600x600@x200)', () => {
  // scale = max(1000/1600, 600/900) = 0.66667 (高さ基準)
  // 表示video = 1066.67 x 600, displayedX0 = (1000-1066.67)/2 = -33.33, Y0 = 0
  // overlayRect: 中央の 600x600, x=200, y=0
  // 中心 (0.5,0.5): windowPx=500, windowPy=300 → overlay(0.5,0.5)
  const c = mapVideoToOverlay(
    { cx: 0.5, cy: 0.5, w: 0.1, h: 0.1, label: 'x', score: 1 },
    1600, 900, 1000, 600, { x: 200, y: 0, w: 600, h: 600 },
  );
  assert.ok(Math.abs(c.cx - 0.5) < 1e-6, `cx=${c.cx}`);
  assert.ok(Math.abs(c.cy - 0.5) < 1e-6, `cy=${c.cy}`);

  // video cx=0.25: windowPx = -33.33 + 0.25*1066.67 = 233.33 → (233.33-200)/600 = 0.05556
  const l = mapVideoToOverlay(
    { cx: 0.25, cy: 0.5, w: 0.1, h: 0.1, label: 'x', score: 1 },
    1600, 900, 1000, 600, { x: 200, y: 0, w: 600, h: 600 },
  );
  assert.ok(Math.abs(l.cx - 0.055555) < 1e-4, `cx=${l.cx}`);
  // 旧実装(video→overlay直接cover)なら 0.5 のまま。ここが RED になる点。
  assert.ok(l.cx < 0.4, `旧実装退行: cx=${l.cx}`);
});

test('mapVideoToOverlay: 縦window 390x844 / video 900x1600 / overlay 4:3', () => {
  // overlay 4:3 を window にフィット: w=390, h=292.5, x=0, y=275.75
  // scale = max(390/900, 844/1600) = 0.5275 (高さ基準)
  // 表示video = 474.75 x 844, displayedX0 = (390-474.75)/2 = -42.375, Y0 = 0
  const overlay = { x: 0, y: 275.75, w: 390, h: 292.5 };
  const c = mapVideoToOverlay(
    { cx: 0.5, cy: 0.5, w: 0.1, h: 0.1, label: 'x', score: 1 },
    900, 1600, 390, 844, overlay,
  );
  assert.ok(Math.abs(c.cx - 0.5) < 1e-6, `cx=${c.cx}`);
  assert.ok(Math.abs(c.cy - 0.5) < 1e-6, `cy=${c.cy}`);

  // video cy=0.2: windowPy = 0 + 0.2*844 = 168.8 → overlay外(<0) になる
  // (168.8-275.75)/292.5 = -0.3656
  const top = mapVideoToOverlay(
    { cx: 0.5, cy: 0.2, w: 0.1, h: 0.1, label: 'x', score: 1 },
    900, 1600, 390, 844, overlay,
  );
  assert.ok(Math.abs(top.cy - (-0.36565)) < 1e-3, `cy=${top.cy}`);
  assert.ok(top.cy < 0, `overlay範囲外になるべき: cy=${top.cy}`);
});

test('visibleVideoRect: overlayが見せているvideo画素矩形', () => {
  // window 1000x600, video 1600x900, overlay 600x600@x200
  // scale=0.66667 → cropX=(200+33.33)/0.66667=350, cropW=600/0.66667=900
  const r = visibleVideoRect(1600, 900, 1000, 600, { x: 200, y: 0, w: 600, h: 600 });
  assert.ok(Math.abs(r.x - 350) < 1e-3, `x=${r.x}`);
  assert.ok(Math.abs(r.y - 0) < 1e-3, `y=${r.y}`);
  assert.ok(Math.abs(r.w - 900) < 1e-3, `w=${r.w}`);
  assert.ok(Math.abs(r.h - 900) < 1e-3, `h=${r.h}`);
});
