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
