# v2 全自動誘導 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 知識ゼロでカメラを向けるだけ——構図自動選択＋配置矢印＋寄り引き＋水平の3軸誘導。

**Architecture:** 新規 `src/guidance.js`（純関数: guidanceVector / sizeAdvice / levelState）＋renderer拡張（矢印・水準器）＋app.js組み替え（おまかせデフォルト・自動切替・トースト）＋UI整理（サムネ帯とプロ設定を格納）。

**Tech Stack:** 既存どおり（vanilla JS ESM, node:test, TF.js CDN）。

## Global Constraints
- 依存パッケージなし。テストは `npm test`（= node --test）
- 純関数はDOM非依存・正規化(0..1)座標
- UI文言日本語。外部送信なし
- 既存16テストを壊さない

---

### Task 1: guidance.js 純関数群（TDD）

**Files:** Create `src/guidance.js` / Test `test/guidance.test.js`

**Interfaces:**
- `guidanceVector(subject, variant) -> {dx, dy, dist, spotIndex} | null` — 主被写体中心から最寄りスイートスポット中心へのベクトル（正規化座標）。variant.sweetSpots空 or subject null なら null。スポット半径内なら dist にかかわらず `{dx:0, dy:0, dist:0, spotIndex}` を返す
- `sizeAdvice(subject) -> 'closer' | 'back' | null` — bbox面積比 w*h < 0.04 → 'closer'、> 0.55 → 'back'、他 null。閾値は定数 `SIZE_MIN=0.04` `SIZE_MAX=0.55` としてexport
- `levelState(rollDeg) -> {level: boolean, angle: number}` — |rollDeg| <= 2 で level:true。angle は正規化した -180..180
- `primarySubject(detected, manual) -> subject | null` — manual優先、なければ最大面積のdetected

テスト例（すべて数値を明記して書く）:
```js
// (0.5,0.5)の被写体、日の丸spot(0.5,0.5,0.22) → dist 0, spotIndex 0
// (0.1,0.5)、三分割 → 最寄り(1/3,1/3 or 1/3,2/3)へのdx>0
// {w:0.1,h:0.1}(面積0.01) → 'closer'; {w:0.8,h:0.8} → 'back'; {w:0.3,h:0.3} → null
// levelState(1.5) → level:true; levelState(-5) → level:false, angle:-5
// primarySubject: manualが最優先、無ければ面積最大
```
RED → GREEN → commit `feat: 誘導純関数群（guidance.js）`

### Task 2: 矢印・水準器・トースト描画（renderer拡張）

**Files:** Modify `src/renderer.js`（`drawArrow(ctx, from, to, w, h, opts)` / `drawLevel(ctx, angleDeg, w, h, {level})`）, `dev/guides.html` に矢印・水準器のサンプル描画を追加（目視ゲート用）

- drawArrow: 被写体位置→スポットへ。半透明白、先端三角、距離に応じてopacity 0.9〜0.4。dist=0では描かない
- drawLevel: 画面中央に基準線（固定・薄）＋現在の傾き線（angleDeg回転）。level時は緑
- 検証: `npm test`回帰＋コントローラーのCDPスクショ目視。commit `feat: 誘導描画（矢印・水準器）`

### Task 3: app.js組み替え——おまかせデフォルト・自動切替・誘導統合

**Files:** Modify `src/app.js`, `src/ui.js`, `index.html`, `style.css`

- state.autoRecommend 初期値 true。バッジ廃止→自動切替＋トースト（`ui.showToast(text)` 1.5s フェード、位置は上部中央）。既存のstableTop/抑制ロジック流用、スコア差条件も維持
- rAFループ: primarySubject → guidanceVector → drawArrow、sizeAdvice → 下部に「もっと寄って/少し引いて」テキスト表示（ui要素、変化時のみ更新）
- 手動でサムネから構図を選んだら autoRecommend=false にし、「おまかせ構図」トグルで復帰
- デフォルト濃度を 0.8→0.5 に
- 検証: `npm test`回帰＋node --check。commit `feat: おまかせデフォルト＋誘導統合`

### Task 4: UI整理＋水平誘導

**Files:** Modify `index.html`, `style.css`, `src/ui.js`, `src/app.js`

- サムネ帯: デフォルト非表示、「構図を選ぶ」小ボタンで開閉（開いてる時だけ表示）
- 上部バー: アスペクト比・濃度・焼き込みを「⚙」ポップオーバーへ。メイン画面は シャッター＋⚙＋構図を選ぶ＋おまかせトグル のみ
- 水平誘導: 「水平ガイド」ボタン（⚙内）→ iOSは DeviceOrientationEvent.requestPermission()（ユーザー操作起点）、許可で deviceorientation 購読、levelState→drawLevel をループに追加。非対応/拒否は機能非表示
- 検証: `npm test`回帰、コントローラーがCDP目視（デスクトップは水平誘導ボタン非表示になることも確認——DeviceOrientationEventの有無で判定）。commit `feat: UI整理＋水平ガイド`

## Self-Review済みメモ
- 3軸誘導=T1-4で網羅（配置=T1+T2+T3、大きさ=T1+T3、傾き=T1+T2+T4）
- 成功基準「設定を触らずに矢印→光→撮影」はT3完了時点で成立、T4は磨き
