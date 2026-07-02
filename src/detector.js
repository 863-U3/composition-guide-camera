const MIN_SCORE = 0.5;

// COCO-SSD(TF.js)をラップして正規化bboxの被写体配列を返すdetectorを作る。
// CDNロード失敗/未ロード時はconsole.warn + null（呼び出し側はガイドのみモードにフォールバック）。
export async function createDetector() {
  if (typeof window === 'undefined' || !window.cocoSsd) {
    console.warn('coco-ssdが利用できません。被写体自動検知なしで続行します。');
    return null;
  }

  let model;
  try {
    model = await window.cocoSsd.load();
  } catch (err) {
    console.warn('coco-ssdモデルのロードに失敗しました。被写体自動検知なしで続行します。', err);
    return null;
  }

  return {
    async detect(videoEl) {
      if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) return [];
      const predictions = await model.detect(videoEl);
      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      return predictions
        .filter((p) => p.score >= MIN_SCORE)
        .map((p) => {
          const [x, y, w, h] = p.bbox;
          return {
            cx: (x + w / 2) / vw,
            cy: (y + h / 2) / vh,
            w: w / vw,
            h: h / vh,
            label: p.class,
            score: p.score,
          };
        });
    },
  };
}
