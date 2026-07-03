import { test } from 'node:test';
import assert from 'node:assert';
import { validateGuide } from '../src/guides/schema.js';
import { GUIDES } from '../src/guides/index.js';

test('16種登録・全てスキーマ適合', () => {
  assert.equal(GUIDES.length, 16);
  for (const g of GUIDES) assert.deepEqual(validateGuide(g).errors, []);
});

test('追加7種（水平線〜パターン）が登録されている', () => {
  for (const id of ['horizon', 'slant', 'frame', 'tunnel', 'radial', 'curve', 'pattern']) {
    assert.ok(GUIDES.some(g => g.id === id), `${id}が未登録`);
  }
});

test('アルファベット構図はarcsを持ちスキーマ適合', () => {
  const g = GUIDES.find(g => g.id === 'curve');
  assert.ok(g.variants.every(v => v.arcs.length > 0));
  assert.deepEqual(validateGuide(g).errors, []);
});

test('arcsの要素数不正はスキーマエラー', () => {
  const bad = { id: 'x', name: 'x', group: 'advanced', variants: [
    { id: 'v', lines: [], circles: [], spirals: [], arcs: [[0.5, 0.5, 0.2, 0]], sweetSpots: [[0.5, 0.5, 0.1]] },
  ] };
  assert.ok(validateGuide(bad).errors.length > 0);
});

test('額縁のスポットは中央・トンネルは同心円', () => {
  const frame = GUIDES.find(g => g.id === 'frame').variants[0];
  assert.deepEqual(frame.sweetSpots[0].slice(0, 2), [0.5, 0.5]);
  const tunnel = GUIDES.find(g => g.id === 'tunnel').variants[0];
  assert.ok(tunnel.circles.length >= 2);
  assert.ok(tunnel.circles.every(c => c[0] === 0.5 && c[1] === 0.5));
});

test('レイルマンは縦3本＋対角2本', () => {
  const v = GUIDES.find(g => g.id === 'railman').variants[0];
  assert.equal(v.lines.filter(l => l[0] === l[2]).length, 3);
  assert.equal(v.lines.filter(l => l[0] !== l[2]).length, 2);
});

test('日の丸のスポットは中央', () => {
  const v = GUIDES.find(g => g.id === 'hinomaru').variants[0];
  assert.deepEqual(v.sweetSpots[0].slice(0,2), [0.5, 0.5]);
});
