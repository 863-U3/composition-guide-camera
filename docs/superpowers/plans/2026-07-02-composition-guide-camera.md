# 構図ガイドカメラ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** カメラ映像に構図ガイド9種をオーバーレイし、被写体を自動検知して最適構図をレコメンド・合致発光でフォローするWebアプリ（デスクトップ試作→スマホ）。

**Architecture:** getUserMediaの`<video>`の上に`<canvas>`でガイド描画。ガイドは正規化座標(0..1)のデータ定義（線・円・スパイラル・スイートスポット）で、renderer/recommenderはデータ駆動。被写体検出はTensorFlow.js COCO-SSD（CDN）をラップし数フレームおきに実行、失敗時はガイドのみモードへフォールバック。

**Tech Stack:** Vanilla JS (ES Modules, ビルドなし), Canvas 2D, TensorFlow.js + COCO-SSD (CDN), node:test（純ロジックのユニットテスト）, GitHub Pages配布想定。

## Global Constraints

- 依存パッケージなし（TF.jsはCDN `<script>` のみ）。npmはテスト実行のためだけに使わない — `node --test` 直叩き
- ガイド定義・スコアリングはDOM非依存の純関数（将来のネイティブ移植資産）
- 座標はすべて正規化(0..1)、描画時にcanvasサイズへスケール
- getUserMediaのためHTTPS必須（開発はlocalhost、公開はGitHub Pages）
- UI文言は日本語
- コミットは各タスク末で実施

---

### Task 1: プロジェクト骨格＋ガイドデータスキーマ＋基本4種定義

**Files:**
- Create: `src/guides/schema.js`（スキーマ検証）
- Create: `src/guides/basic.js`（三分割・三角・黄金比・白銀比）
- Create: `src/guides/index.js`（全ガイドの登録配列）
- Test: `test/guides.test.js`

**Interfaces:**
- Produces: ガイドオブジェクト `{id, name, group:'basic'|'advanced', variants:[{id, lines:[[x1,y1,x2,y2]], circles:[[cx,cy,r]], spirals:[{cx,cy,scale,rotation,mirror}], sweetSpots:[[cx,cy,r]]}]}`
- Produces: `validateGuide(guide) -> {ok:boolean, errors:string[]}`、`GUIDES`（全ガイド配列）

- [ ] **Step 1: 失敗するテストを書く**

```js
// test/guides.test.js
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
```

- [ ] **Step 2: 落ちることを確認** — Run: `node --test test/` → Expected: FAIL (module not found)

- [ ] **Step 3: 実装**

```js
// src/guides/schema.js
export function validateGuide(g) {
  const errors = [];
  if (!g.id) errors.push('id必須');
  if (!g.name) errors.push('name必須');
  if (!['basic','advanced'].includes(g.group)) errors.push('group不正');
  if (!Array.isArray(g.variants) || g.variants.length === 0) errors.push('variants必須');
  for (const v of g.variants ?? []) {
    for (const [k, len] of [['lines',4],['circles',3],['sweetSpots',3]]) {
      for (const item of v[k] ?? []) {
        if (item.length !== len) errors.push(`${v.id}.${k}: 要素数${len}であるべき`);
        if (item.some(n => typeof n !== 'number' || n < -0.5 || n > 1.5)) errors.push(`${v.id}.${k}: 正規化座標外`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
```

```js
// src/guides/basic.js
const PHI_A = 1 / (1 + 1.618); // ≈0.382
const PHI_B = 1 - PHI_A;       // ≈0.618
const GIN = 1 / (1 + 1.41421356); // 白銀比 ≈0.414
const GIN2 = 1 - GIN;

const vlines = xs => xs.map(x => [x, 0, x, 1]);
const hlines = ys => ys.map(y => [0, y, 1, y]);
const cross = (xs, ys) => xs.flatMap(x => ys.map(y => [x, y, 0.07]));

export const thirds = {
  id: 'thirds', name: '三分割', group: 'basic',
  variants: [{ id: 'default',
    lines: [...vlines([1/3, 2/3]), ...hlines([1/3, 2/3])],
    circles: [], spirals: [],
    sweetSpots: cross([1/3, 2/3], [1/3, 2/3]) }],
};

export const triangle = {
  id: 'triangle', name: '三角構図', group: 'basic',
  // 対角線＋対角に直交する補助線（ダイナミックシンメトリー）。反転バリアント付き
  variants: [
    { id: 'lt', lines: [[0,0,1,1],[1,0,0.5,0.5],[0,1,0.5,0.5]], circles: [], spirals: [],
      sweetSpots: [[0.5,0.5,0.08],[0.75,0.25,0.07],[0.25,0.75,0.07]] },
    { id: 'rt', lines: [[1,0,0,1],[0,0,0.5,0.5],[1,1,0.5,0.5]], circles: [], spirals: [],
      sweetSpots: [[0.5,0.5,0.08],[0.25,0.25,0.07],[0.75,0.75,0.07]] },
  ],
};

export const golden = {
  id: 'golden', name: '黄金比', group: 'basic',
  variants: [
    { id: 'grid',
      lines: [...vlines([PHI_A, PHI_B]), ...hlines([PHI_A, PHI_B])],
      circles: [], spirals: [],
      sweetSpots: cross([PHI_A, PHI_B], [PHI_A, PHI_B]) },
    // スパイラル4方向（rotation=0,90,180,270度、目はPHI点）
    ...[0, 90, 180, 270].map(rot => ({
      id: `spiral-${rot}`,
      lines: [], circles: [],
      spirals: [{ cx: 0.5, cy: 0.5, scale: 1, rotation: rot, mirror: false }],
      sweetSpots: [[
        rot === 0 ? PHI_B : rot === 90 ? PHI_A : rot === 180 ? PHI_A : PHI_B,
        rot === 0 ? PHI_B : rot === 90 ? PHI_B : rot === 180 ? PHI_A : PHI_A,
        0.09 ]],
    })),
  ],
};

export const silver = {
  id: 'silver', name: '白銀比', group: 'basic',
  variants: [{ id: 'grid',
    lines: [...vlines([GIN, GIN2]), ...hlines([GIN, GIN2])],
    circles: [], spirals: [],
    sweetSpots: cross([GIN, GIN2], [GIN, GIN2]) }],
};
```

```js
// src/guides/index.js
import { thirds, triangle, golden, silver } from './basic.js';
export const GUIDES = [thirds, triangle, golden, silver];
```

- [ ] **Step 4: テスト通過確認** — Run: `node --test test/` → Expected: PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: ガイドスキーマ＋基本4種定義"`

---

### Task 2: 応用5種ガイド定義

**Files:**
- Create: `src/guides/advanced.js`（ファイグリッド・レイルマン・対角線・シンメトリー・日の丸）
- Modify: `src/guides/index.js`
- Test: `test/guides-advanced.test.js`

**Interfaces:**
- Consumes: Task 1のスキーマ・ヘルパ規約
- Produces: `GUIDES`が9件になる

- [ ] **Step 1: 失敗するテストを書く**

```js
// test/guides-advanced.test.js
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
```

- [ ] **Step 2: 落ちる確認** — `node --test test/` → FAIL
- [ ] **Step 3: 実装**

```js
// src/guides/advanced.js
const PHI_A = 1 / (1 + 1.618), PHI_B = 1 - PHI_A;
const vlines = xs => xs.map(x => [x, 0, x, 1]);
const hlines = ys => ys.map(y => [0, y, 1, y]);
const cross = (xs, ys) => xs.flatMap(x => ys.map(y => [x, y, 0.07]));

export const phiGrid = {
  id: 'phi-grid', name: 'ファイグリッド', group: 'advanced',
  variants: [{ id: 'default',
    lines: [...vlines([PHI_A, PHI_B]), ...hlines([PHI_A, PHI_B])],
    circles: [], spirals: [], sweetSpots: cross([PHI_A, PHI_B], [PHI_A, PHI_B]) }],
};

export const railman = {
  id: 'railman', name: 'レイルマン', group: 'advanced',
  variants: [{ id: 'default',
    lines: [...vlines([0.25, 0.5, 0.75]), [0,0,1,1], [1,0,0,1]],
    circles: [], spirals: [],
    sweetSpots: [[0.25,0.25,0.07],[0.75,0.25,0.07],[0.25,0.75,0.07],[0.75,0.75,0.07]] }],
};

export const diagonal = {
  id: 'diagonal', name: '対角線', group: 'advanced',
  variants: [
    { id: 'down', lines: [[0,0,1,1]], circles: [], spirals: [], sweetSpots: [[1/3,1/3,0.08],[2/3,2/3,0.08]] },
    { id: 'up',   lines: [[0,1,1,0]], circles: [], spirals: [], sweetSpots: [[1/3,2/3,0.08],[2/3,1/3,0.08]] },
    { id: 'x',    lines: [[0,0,1,1],[0,1,1,0]], circles: [], spirals: [], sweetSpots: [[0.5,0.5,0.09]] },
  ],
};

export const symmetry = {
  id: 'symmetry', name: 'シンメトリー', group: 'advanced',
  variants: [
    { id: 'v', lines: vlines([0.5]), circles: [], spirals: [], sweetSpots: [[0.5,1/3,0.08],[0.5,2/3,0.08]] },
    { id: 'h', lines: hlines([0.5]), circles: [], spirals: [], sweetSpots: [[1/3,0.5,0.08],[2/3,0.5,0.08]] },
  ],
};

export const hinomaru = {
  id: 'hinomaru', name: '日の丸', group: 'advanced',
  variants: [{ id: 'default',
    lines: [], circles: [[0.5, 0.5, 0.22]], spirals: [],
    sweetSpots: [[0.5, 0.5, 0.22]] }],
};
```

```js
// src/guides/index.js
import { thirds, triangle, golden, silver } from './basic.js';
import { phiGrid, railman, diagonal, symmetry, hinomaru } from './advanced.js';
export const GUIDES = [thirds, triangle, golden, silver, phiGrid, railman, diagonal, symmetry, hinomaru];
```

- [ ] **Step 4: 通過確認** — `node --test test/` → PASS
- [ ] **Step 5: Commit** — `git commit -am "feat: 応用5種ガイド定義"`

---

### Task 3: レコメンダー（被写体配置×ガイドのスコアリング）

**Files:**
- Create: `src/recommender.js`
- Test: `test/recommender.test.js`

**Interfaces:**
- Consumes: `GUIDES`（Task 1-2）
- Produces: `scoreVariant(subjects, variant) -> number`（0..1）、`recommend(subjects, guides) -> {guideId, variantId, score}[]`（降順）。`subjects`は`[{cx, cy, w, h}]`（正規化bbox中心＋サイズ）

- [ ] **Step 1: 失敗するテストを書く**

```js
// test/recommender.test.js
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
```

- [ ] **Step 2: 落ちる確認** — `node --test test/recommender.test.js` → FAIL
- [ ] **Step 3: 実装**

```js
// src/recommender.js
// 各被写体を最寄りスイートスポットへ割り当て、距離をガウス減衰でスコア化。
// スポット半径内=ほぼ1.0、半径の3倍で≈0.1。variantスコアは被写体スコアの平均。
export function scoreVariant(subjects, variant) {
  if (!subjects.length || !variant.sweetSpots?.length) return 0;
  let total = 0;
  for (const s of subjects) {
    let best = 0;
    for (const [sx, sy, r] of variant.sweetSpots) {
      const d = Math.hypot(s.cx - sx, s.cy - sy);
      best = Math.max(best, Math.exp(-Math.max(0, d - r) ** 2 / (2 * (r * 1.2) ** 2)));
    }
    total += best;
  }
  return total / subjects.length;
}

export function recommend(subjects, guides) {
  return guides
    .map(g => {
      let best = { variantId: g.variants[0].id, score: 0 };
      for (const v of g.variants) {
        const score = scoreVariant(subjects, v);
        if (score > best.score) best = { variantId: v.id, score };
      }
      return { guideId: g.id, ...best };
    })
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: 通過確認** — `node --test test/` → PASS（全テスト）
- [ ] **Step 5: Commit** — `git commit -am "feat: 構図レコメンダー"`

---

### Task 4: レンダラー（Canvas描画）＋静的確認ページ

**Files:**
- Create: `src/renderer.js`
- Create: `dev/guides.html`（カメラなしで9種の描画を目視確認するページ）

**Interfaces:**
- Consumes: ガイドvariant（Task 1-2）
- Produces: `drawGuide(ctx, variant, w, h, opts)`（opts: `{opacity=0.8, color='#fff', highlight:[spotIndex...]}`）。`drawSpiral(ctx, spiral, w, h)`（黄金スパイラル: フィボナッチ矩形の1/4円弧連結）

- [ ] **Step 1: 実装**（Canvas描画はnode:testで検証しづらいので目視確認ページで担保）

```js
// src/renderer.js
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
```

```html
<!-- dev/guides.html : 全ガイド全variantをグリッド表示（黒背景canvas 300x225） -->
<!doctype html><meta charset="utf-8"><title>guides check</title>
<style>body{background:#222;color:#eee;font-family:sans-serif;display:flex;flex-wrap:wrap;gap:8px}figure{margin:0}figcaption{font-size:11px;text-align:center}</style>
<script type="module">
import { GUIDES } from '../src/guides/index.js';
import { drawGuide } from '../src/renderer.js';
for (const g of GUIDES) for (const v of g.variants) {
  const fig = document.createElement('figure');
  const c = Object.assign(document.createElement('canvas'), { width: 300, height: 225 });
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 300, 225);
  drawGuide(ctx, v, 300, 225, { highlight: [0] });
  fig.append(c, Object.assign(document.createElement('figcaption'), { textContent: `${g.name} / ${v.id}` }));
  document.body.append(fig);
}
</script>
```

- [ ] **Step 2: 目視確認** — Run: `python3 -m http.server 8877` → `http://localhost:8877/dev/guides.html` を開き、9種全variantの線・円・スパイラル・発光スポット(先頭1つ)が描画されることを確認（スクリーンショット取得）
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: Canvasレンダラー＋目視確認ページ"`

---

### Task 5: カメラ＋メイン画面＋ガイド切替UI

**Files:**
- Create: `index.html`
- Create: `src/camera.js`
- Create: `src/ui.js`
- Create: `src/app.js`（エントリ、描画ループ）
- Create: `style.css`

**Interfaces:**
- Consumes: `GUIDES`, `drawGuide`
- Produces: `startCamera(videoEl, {facing='environment'}) -> Promise<MediaStream>`（camera.js）。`initUI({onGuideChange, onVariantCycle, onAspectChange, onOpacityChange})`（ui.js）。app.jsが`requestAnimationFrame`ループでvideo上のcanvasへ現行ガイドを描画

- [ ] **Step 1: 実装** — 画面: 全画面`<video>`＋重ね`<canvas>`、下部横スクロールでガイドサムネ（dev/guides.htmlと同じ縮小canvas描画を流用）、選択中ガイドはタップで次variantへサイクル。上部にアスペクト比(4:3/16:9/1:1、canvasとvideoのletterbox切替)と濃度スライダー。カメラ拒否時は日本語メッセージ＋再試行ボタン。

```js
// src/camera.js
export async function startCamera(videoEl, { facing = 'environment' } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}
```

（ui.js / app.js / style.css は上記画面仕様どおり実装。app.jsのループ骨格:）

```js
// src/app.js の描画ループ骨格
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGuide(ctx, state.variant, canvas.width, canvas.height, {
    opacity: state.opacity, highlight: state.hitSpots,
  });
  requestAnimationFrame(loop);
}
```

- [ ] **Step 2: 実駆動確認** — `python3 -m http.server 8877` → `http://localhost:8877/` をChromeで開き、Webカメラ映像＋ガイド切替＋variantサイクル＋アスペクト比＋濃度が動くこと
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: カメラ画面＋ガイド切替UI"`

---

### Task 6: 撮影（素の保存＋焼き込みオプション）

**Files:**
- Create: `src/capture.js`
- Modify: `src/app.js`, `index.html`（シャッターボタン・焼き込みトグル）

**Interfaces:**
- Consumes: videoエレメント、現行variant、`drawGuide`
- Produces: `capture(videoEl, {burnIn=false, variant, opacity}) -> Promise<Blob>`（JPEG）。ダウンロードリンク発火で保存

- [ ] **Step 1: 実装**

```js
// src/capture.js
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
```

- [ ] **Step 2: 実駆動確認** — シャッターで素のJPEGが落ちる／焼き込みONでガイド入りが落ちること
- [ ] **Step 3: Commit** — `git commit -am "feat: 撮影・保存"`

---

### Task 7: 被写体自動検知（TF.js COCO-SSD）＋合致発光

**Files:**
- Create: `src/detector.js`
- Modify: `index.html`（CDN script）, `src/app.js`（検出→hitSpots更新）

**Interfaces:**
- Consumes: videoエレメント
- Produces: `createDetector() -> Promise<{detect(videoEl) -> Promise<[{cx,cy,w,h,label,score}]>}>`（正規化bbox）。ロード失敗時はnullを返しガイドのみモード。`hitTest(subjects, variant) -> number[]`（合致スポットindex配列）

- [ ] **Step 1: hitTestの失敗テストを書く**

```js
// test/hittest.test.js
import { test } from 'node:test';
import assert from 'node:assert';
import { hitTest } from '../src/hittest.js';

test('スポット半径内の被写体中心はヒット', () => {
  const v = { sweetSpots: [[0.5, 0.5, 0.1], [0.1, 0.1, 0.05]] };
  assert.deepEqual(hitTest([{ cx: 0.52, cy: 0.5, w: 0.2, h: 0.2 }], v), [0]);
  assert.deepEqual(hitTest([{ cx: 0.9, cy: 0.9, w: 0.1, h: 0.1 }], v), []);
});
```

- [ ] **Step 2: 落ちる確認** — `node --test test/hittest.test.js` → FAIL
- [ ] **Step 3: 実装**（hitTestは純関数で`src/hittest.js`へ。detector.jsはCDNの`cocoSsd`グローバルをラップ、検出は500ms間隔スロットル、`videoWidth`で正規化。TF未ロード/失敗はconsole警告＋null）

```js
// src/hittest.js
export function hitTest(subjects, variant) {
  const hits = new Set();
  subjects.forEach(s => {
    variant.sweetSpots.forEach(([sx, sy, r], i) => {
      if (Math.hypot(s.cx - sx, s.cy - sy) <= r) hits.add(i);
    });
  });
  return [...hits].sort((a, b) => a - b);
}
```

- [ ] **Step 4: 通過確認** — `node --test test/` → PASS
- [ ] **Step 5: 統合** — app.jsで検出結果→`state.hitSpots = hitTest(subjects, variant)`。合致時に発光（renderer実装済み）＋`navigator.vibrate?.(30)`。手動フォールバック: canvasタップで被写体1点指定（検出リストに追加、次のタップで移動）
- [ ] **Step 6: 実駆動確認** — Webカメラの前でコップ等を動かし、スポットに入ると発光すること
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: 被写体自動検知＋合致発光"`

---

### Task 8: おまかせ構図レコメンドの統合

**Files:**
- Modify: `src/app.js`, `src/ui.js`（レコメンドバッジUI）

**Interfaces:**
- Consumes: `recommend`（Task 3）、detector（Task 7）
- Produces: おまかせモードON時、検出のたびに`recommend(subjects, GUIDES)`を実行し、トップが現行と違いスコア差>0.15なら「この構図が近い: ○○」バッジ表示。バッジタップで切替。3秒間表示・チラつき防止に直近3回の多数決

- [ ] **Step 1: 実装** — おまかせトグルをUIに追加。多数決ロジックは純関数`stableTop(history) -> guideId|null`として`src/recommender.js`に追加し、テストも追加:

```js
// test/recommender.test.js に追記
import { stableTop } from '../src/recommender.js';
test('直近3回中2回以上同じトップなら採用', () => {
  assert.equal(stableTop(['thirds', 'thirds', 'golden']), 'thirds');
  assert.equal(stableTop(['thirds', 'golden', 'silver']), null);
});
```

```js
// src/recommender.js に追記
export function stableTop(history) {
  const last = history.slice(-3);
  if (last.length < 3) return null;
  const counts = {};
  for (const id of last) counts[id] = (counts[id] ?? 0) + 1;
  const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return n >= 2 ? top : null;
}
```

- [ ] **Step 2: テスト通過確認** — `node --test test/` → PASS
- [ ] **Step 3: 実駆動確認** — テーブル上の物を映して構図提案が出る・タップで切替わること
- [ ] **Step 4: Commit** — `git commit -am "feat: おまかせ構図レコメンド"`

---

### Task 9: スマホ対応＋仕上げ

**Files:**
- Modify: `style.css`（タッチ向けサイズ・safe-area）, `index.html`（viewport, PWA向けmeta）, `src/camera.js`（背面カメラ・縦画面）
- Create: `README.md`

**Interfaces:**
- Consumes: 全モジュール
- Produces: iPhone Safariで動く公開版

- [ ] **Step 1: レスポンシブ調整** — 縦画面レイアウト、サムネ・ボタンをタッチサイズ(44px+)に、`env(safe-area-inset-*)`対応
- [ ] **Step 2: 実機確認** — GitHub Pagesへデプロイ（新規公開リポジトリ作成はゆうさんに確認してから）、iPhone Safariで: カメラ起動・ガイド・検知発光・レコメンド・撮影保存
- [ ] **Step 3: README** — 使い方・構図の説明・技術構成
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: スマホ対応＋README"`

---

## Self-Review済みメモ

- 設計書の全要件をタスクへ対応付け（ガイド9種=T1-2、検知＋発光=T7、レコメンド=T3+T8、撮影=T6、エラー処理=T5/T7のフォールバック、スマホ=T9）。将来枠（自作テンプレ・方向指示・推奨ズーム）は設計書どおり対象外
- 型整合: `variant.sweetSpots=[[cx,cy,r]]`、`subjects=[{cx,cy,w,h}]`で全タスク統一
- GitHub Pages公開（外部公開行為）はT9で実施前にゆうさん確認
