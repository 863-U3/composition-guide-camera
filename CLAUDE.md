# 構図ガイドカメラ

知識ゼロで美しい構図で撮れるWebカメラアプリ。線はアシスト、主役は自動誘導（配置・大きさ・傾きの3軸）。

- 起動: `python3 -m http.server 8000` → localhost:8000
- テスト: `npm test`（node:test。Node 24はディレクトリ引数不可なので引数なしが正）
- 公開: GitHub Pages `863-u3.github.io/composition-guide-camera/`（noindex・URL非宣伝）。iPhoneキャッシュは `?v=N` で回避
- 設計書/実装計画: `docs/superpowers/specs/` と `docs/superpowers/plans/` が正本
- **最重要注意**: `src/hittest.js` の座標変換は video→window→overlay の2段cover-fit。触る時は必ず `test/hittest.test.js` の手計算ケースを確認
- UI検証はstate直書きでなくCDPの実イベント（`Input.dispatchMouseEvent`）で行う
- コミット規約: `feat/fix/docs/chore: 日本語説明`
- 制約: 依存パッケージなし・ビルドなし・外部送信なし・UI文言は日本語
