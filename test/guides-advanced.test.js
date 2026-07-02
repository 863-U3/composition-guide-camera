import { test } from 'node:test';
import assert from 'node:assert';
import { validateGuide } from '../src/guides/schema.js';
import { GUIDES } from '../src/guides/index.js';

test('9種登録・全てスキーマ適合', () => {
  assert.equal(GUIDES.length, 9);
  for (const g of GUIDES) assert.deepEqual(validateGuide(g).errors, []);
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
