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
    // arcs = [cx, cy, r, 開始角deg, 終了角deg]（角度は度数なので範囲チェックは座標3要素のみ）
    for (const item of v.arcs ?? []) {
      if (item.length !== 5) errors.push(`${v.id}.arcs: 要素数5であるべき`);
      if (item.slice(0, 3).some(n => typeof n !== 'number' || n < -0.5 || n > 1.5)) errors.push(`${v.id}.arcs: 正規化座標外`);
      if (item.slice(3).some(n => typeof n !== 'number')) errors.push(`${v.id}.arcs: 角度が数値でない`);
    }
  }
  return { ok: errors.length === 0, errors };
}
