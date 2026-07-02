import { test } from 'node:test';
import assert from 'node:assert';
import {
  guidanceVector, sizeAdvice, levelState, primarySubject,
  SIZE_MIN, SIZE_MAX,
} from '../src/guidance.js';

// ---- guidanceVector ----

test('guidanceVector: 日の丸spot(0.5,0.5,0.22)中心の被写体 → dist 0, spotIndex 0', () => {
  const v = { sweetSpots: [[0.5, 0.5, 0.22]] };
  const g = guidanceVector({ cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 }, v);
  assert.deepEqual(g, { dx: 0, dy: 0, dist: 0, spotIndex: 0 });
});

test('guidanceVector: スポット半径内なら距離があってもdist 0扱い', () => {
  // (0.6,0.5) は spot(0.5,0.5,r=0.22) の中心から 0.1 < 0.22 → 半径内
  const v = { sweetSpots: [[0.5, 0.5, 0.22]] };
  const g = guidanceVector({ cx: 0.6, cy: 0.5, w: 0.2, h: 0.2 }, v);
  assert.deepEqual(g, { dx: 0, dy: 0, dist: 0, spotIndex: 0 });
});

test('guidanceVector: (0.1,0.5)と三分割 → 最寄り(1/3,1/3 or 1/3,2/3)へdx>0', () => {
  // 三分割の4スポット。(0.1,0.5)から (1/3,1/3) と (1/3,2/3) は等距離で最寄り。
  // dx = 1/3 - 0.1 = 0.2333... > 0
  const r = 0.07;
  const v = { sweetSpots: [
    [1 / 3, 1 / 3, r], [2 / 3, 1 / 3, r], [1 / 3, 2 / 3, r], [2 / 3, 2 / 3, r],
  ] };
  const g = guidanceVector({ cx: 0.1, cy: 0.5, w: 0.1, h: 0.1 }, v);
  assert.ok(g.dx > 0, `dx=${g.dx}`);
  assert.ok(Math.abs(g.dx - (1 / 3 - 0.1)) < 1e-9, `dx=${g.dx}`);
  // 最寄りは x=1/3 の2点のどちらか（spotIndex 0 or 2）
  assert.ok(g.spotIndex === 0 || g.spotIndex === 2, `spotIndex=${g.spotIndex}`);
  // dist = hypot(1/3-0.1, 1/3-0.5) = hypot(0.23333, 0.16667) ≈ 0.28675
  assert.ok(Math.abs(g.dist - Math.hypot(1 / 3 - 0.1, 1 / 3 - 0.5)) < 1e-9, `dist=${g.dist}`);
});

test('guidanceVector: sweetSpots空 or subject null は null', () => {
  assert.equal(guidanceVector({ cx: 0.5, cy: 0.5, w: 0.1, h: 0.1 }, { sweetSpots: [] }), null);
  assert.equal(guidanceVector(null, { sweetSpots: [[0.5, 0.5, 0.1]] }), null);
});

// ---- sizeAdvice ----

test('sizeAdvice: 面積0.01(<0.04)はcloser、0.64(>0.55)はback、0.09はnull', () => {
  assert.equal(sizeAdvice({ cx: 0.5, cy: 0.5, w: 0.1, h: 0.1 }), 'closer'); // 0.01
  assert.equal(sizeAdvice({ cx: 0.5, cy: 0.5, w: 0.8, h: 0.8 }), 'back');   // 0.64
  assert.equal(sizeAdvice({ cx: 0.5, cy: 0.5, w: 0.3, h: 0.3 }), null);     // 0.09
});

test('sizeAdvice: 閾値定数のexport', () => {
  assert.equal(SIZE_MIN, 0.04);
  assert.equal(SIZE_MAX, 0.55);
});

// ---- levelState ----

test('levelState: 1.5度は水平、-5度は非水平でangle=-5', () => {
  assert.deepEqual(levelState(1.5), { level: true, angle: 1.5 });
  assert.deepEqual(levelState(-5), { level: false, angle: -5 });
});

test('levelState: angleは-180..180に正規化される', () => {
  // 190度 → -170度
  const a = levelState(190);
  assert.equal(a.level, false);
  assert.ok(Math.abs(a.angle - (-170)) < 1e-9, `angle=${a.angle}`);
  // -181度 → 179度
  const b = levelState(-181);
  assert.ok(Math.abs(b.angle - 179) < 1e-9, `angle=${b.angle}`);
});

// ---- primarySubject ----

test('primarySubject: manualが最優先', () => {
  const manual = { cx: 0.2, cy: 0.2, w: 0.1, h: 0.1, label: 'manual', score: 1 };
  const detected = [{ cx: 0.5, cy: 0.5, w: 0.9, h: 0.9, label: 'big', score: 0.9 }];
  assert.equal(primarySubject(detected, manual), manual);
});

test('primarySubject: manualなしなら最大面積のdetected', () => {
  const small = { cx: 0.3, cy: 0.3, w: 0.1, h: 0.1, label: 'small', score: 0.9 }; // 0.01
  const big = { cx: 0.6, cy: 0.6, w: 0.4, h: 0.5, label: 'big', score: 0.5 };     // 0.20
  assert.equal(primarySubject([small, big], null), big);
});

test('primarySubject: 何もなければnull', () => {
  assert.equal(primarySubject([], null), null);
  assert.equal(primarySubject(null, null), null);
});
