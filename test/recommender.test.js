import { test } from 'node:test';
import assert from 'node:assert';
import { scoreVariant, recommend } from '../src/recommender.js';
import { GUIDES } from '../src/guides/index.js';

const at = (cx, cy, s = 0.1) => ({ cx, cy, w: s, h: s });

test('中央の単一被写体→日の丸が上位', () => {
  const ranked = recommend([at(0.5, 0.5)], GUIDES);
  assert.equal(ranked[0].guideId, 'hinomaru');
});

test('三分割交点上の被写体→三分割系が日の丸より上', () => {
  const ranked = recommend([at(1/3, 1/3)], GUIDES);
  const idx = id => ranked.findIndex(r => r.guideId === id);
  assert.ok(idx('thirds') < idx('hinomaru'));
});

test('スポット完全一致はスコア1.0近く、遠距離は0近く', () => {
  const v = GUIDES.find(g => g.id === 'hinomaru').variants[0];
  assert.ok(scoreVariant([at(0.5, 0.5)], v) > 0.9);
  assert.ok(scoreVariant([at(0.02, 0.02)], v) < 0.2);
});

test('被写体ゼロなら全スコア0', () => {
  for (const r of recommend([], GUIDES)) assert.equal(r.score, 0);
});
