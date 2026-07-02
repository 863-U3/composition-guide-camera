// 各被写体を最寄りスイートスポットへ割り当て、距離をガウス減衰でスコア化。
// スポット半径内=ほぼ1.0、半径の3倍で≈0.1。variantスコアは被写体スコアの平均。
export function scoreVariant(subjects, variant) {
  if (!subjects.length || !variant.sweetSpots?.length) return 0;
  let total = 0;
  for (const s of subjects) {
    let best = 0;
    for (const [sx, sy, r] of variant.sweetSpots) {
      const d = Math.hypot(s.cx - sx, s.cy - sy);
      best = Math.max(best, Math.exp(-(Math.max(0, d - r) ** 2) / (2 * (r * 0.95) ** 2)));
    }
    total += best;
  }
  return total / subjects.length;
}

// 直近3回のトップguideId履歴から多数決で安定したトップを返す（チラつき防止）。
export function stableTop(history) {
  const last = history.slice(-3);
  if (last.length < 3) return null;
  const counts = {};
  for (const id of last) counts[id] = (counts[id] ?? 0) + 1;
  const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return n >= 2 ? top : null;
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
