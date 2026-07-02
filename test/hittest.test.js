import { test } from 'node:test';
import assert from 'node:assert';
import { hitTest, mapVideoToOverlay } from '../src/hittest.js';

test('スポット半径内の被写体中心はヒット', () => {
  const v = { sweetSpots: [[0.5, 0.5, 0.1], [0.1, 0.1, 0.05]] };
  assert.deepEqual(hitTest([{ cx: 0.52, cy: 0.5, w: 0.2, h: 0.2 }], v), [0]);
  assert.deepEqual(hitTest([{ cx: 0.9, cy: 0.9, w: 0.1, h: 0.1 }], v), []);
});

test('mapVideoToOverlay: video==overlay ratioなら座標そのまま', () => {
  const subject = { cx: 0.5, cy: 0.5, w: 0.2, h: 0.2, label: 'cup', score: 0.9 };
  const mapped = mapVideoToOverlay(subject, 800, 600, { w: 400, h: 300 });
  assert.ok(Math.abs(mapped.cx - 0.5) < 1e-9);
  assert.ok(Math.abs(mapped.cy - 0.5) < 1e-9);
});

test('mapVideoToOverlay: video横長・overlay縦長(4:3クロップ)で中央寄せ', () => {
  // video 16:9 (1600x900), overlay 4:3 (crop) -> video幅方向がクロップされる
  const subject = { cx: 0.5, cy: 0.5, w: 0.1, h: 0.1, label: 'x', score: 0.9 };
  const mapped = mapVideoToOverlay(subject, 1600, 900, { w: 400, h: 300 });
  assert.ok(Math.abs(mapped.cx - 0.5) < 1e-9);
  assert.ok(Math.abs(mapped.cy - 0.5) < 1e-9);
});

test('mapVideoToOverlay: 端の被写体はoverlay範囲外(<0 or >1)になり得る', () => {
  // video 16:9, overlay 4:3 -> 横方向がクロップされる。video端の点はoverlay外に出る
  const subject = { cx: 0.02, cy: 0.5, w: 0.05, h: 0.05, label: 'x', score: 0.9 };
  const mapped = mapVideoToOverlay(subject, 1600, 900, { w: 400, h: 300 });
  assert.ok(mapped.cx < 0);
});
