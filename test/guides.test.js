import { test } from 'node:test';
import assert from 'node:assert';
import { validateGuide } from '../src/guides/schema.js';
import { GUIDES } from '../src/guides/index.js';

test('全ガイドがスキーマを満たす', () => {
  assert.ok(GUIDES.length >= 4);
  for (const g of GUIDES) {
    const r = validateGuide(g);
    assert.deepEqual(r.errors, [], `${g.id}: ${r.errors.join(',')}`);
  }
});

test('三分割は縦横2本ずつ・交点4つがスイートスポット', () => {
  const g = GUIDES.find(g => g.id === 'thirds');
  const v = g.variants[0];
  assert.equal(v.lines.length, 4);
  assert.equal(v.sweetSpots.length, 4);
  // 交点(1/3,1/3)がスポットに含まれる
  assert.ok(v.sweetSpots.some(([x,y]) => Math.abs(x-1/3)<1e-6 && Math.abs(y-1/3)<1e-6));
});

test('黄金比の分割線は0.382/0.618位置', () => {
  const g = GUIDES.find(g => g.id === 'golden');
  const xs = g.variants[0].lines.filter(l => l[0]===l[2]).map(l => l[0]).sort();
  assert.ok(Math.abs(xs[0]-0.382)<0.001 && Math.abs(xs[1]-0.618)<0.001);
});
