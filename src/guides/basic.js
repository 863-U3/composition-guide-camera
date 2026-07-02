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
      sweetSpots: [[0.75,0.25,0.07],[0.25,0.75,0.07]] },
    { id: 'rt', lines: [[1,0,0,1],[0,0,0.5,0.5],[1,1,0.5,0.5]], circles: [], spirals: [],
      sweetSpots: [[0.25,0.25,0.07],[0.75,0.75,0.07]] },
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
