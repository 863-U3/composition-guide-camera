const hlines = ys => ys.map(y => [0, y, 1, y]);

export const horizon = {
  id: 'horizon', name: '水平線', group: 'advanced',
  // 水平線（地平線）を上下どちらかの1/3に置く。低い線=空を広く、高い線=手前を広く
  variants: [
    { id: 'low', lines: hlines([2/3]), circles: [], spirals: [],
      sweetSpots: [[1/3, 2/3, 0.08], [2/3, 2/3, 0.08]] },
    { id: 'high', lines: hlines([1/3]), circles: [], spirals: [],
      sweetSpots: [[1/3, 1/3, 0.08], [2/3, 1/3, 0.08]] },
    { id: 'both', lines: hlines([1/3, 2/3]), circles: [], spirals: [],
      sweetSpots: [[0.5, 1/3, 0.08], [0.5, 2/3, 0.08]] },
  ],
};

export const slant = {
  id: 'slant', name: '斜線', group: 'advanced',
  // 平行な斜線のリズム。対角線と違い「流れの反復」が主役
  variants: [
    { id: 'down', lines: [[0, 0, 1, 1], [0, 1/3, 2/3, 1], [1/3, 0, 1, 2/3]], circles: [], spirals: [],
      sweetSpots: [[1/3, 2/3, 0.08], [2/3, 1/3, 0.08]] },
    { id: 'up', lines: [[0, 1, 1, 0], [0, 2/3, 2/3, 0], [1/3, 1, 1, 1/3]], circles: [], spirals: [],
      sweetSpots: [[1/3, 1/3, 0.08], [2/3, 2/3, 0.08]] },
  ],
};

export const frame = {
  id: 'frame', name: '額縁', group: 'advanced',
  variants: [{ id: 'default',
    lines: [
      [0.14, 0.14, 0.86, 0.14], [0.86, 0.14, 0.86, 0.86],
      [0.86, 0.86, 0.14, 0.86], [0.14, 0.86, 0.14, 0.14],
    ],
    circles: [], spirals: [],
    sweetSpots: [[0.5, 0.5, 0.1]] }],
};

export const tunnel = {
  id: 'tunnel', name: 'トンネル', group: 'advanced',
  variants: [{ id: 'default',
    lines: [], circles: [[0.5, 0.5, 0.16], [0.5, 0.5, 0.36]], spirals: [],
    sweetSpots: [[0.5, 0.5, 0.1]] }],
};

const radialLines = (vx, vy) => [
  [vx, vy, 0, 0], [vx, vy, 1, 0], [vx, vy, 0, 1], [vx, vy, 1, 1],
  [vx, vy, 0, vy], [vx, vy, 1, vy], [vx, vy, 0.5, 0], [vx, vy, 0.5, 1],
];

export const radial = {
  id: 'radial', name: '放射線', group: 'advanced',
  // 消失点から放射する線。奥行きと迫力
  variants: [
    { id: 'center', lines: radialLines(0.5, 0.42), circles: [], spirals: [],
      sweetSpots: [[0.5, 0.42, 0.08]] },
    { id: 'left', lines: radialLines(1/3, 1/3), circles: [], spirals: [],
      sweetSpots: [[1/3, 1/3, 0.08]] },
  ],
};

export const curve = {
  id: 'curve', name: 'アルファベット', group: 'advanced',
  // S字・C字の曲線構図。arcs = [cx, cy, r, 開始角deg, 終了角deg]
  variants: [
    { id: 's',
      lines: [], circles: [], spirals: [],
      arcs: [[0.5, 0.3, 0.18, 270, 90], [0.5, 0.66, 0.18, 90, 270]],
      sweetSpots: [[0.5, 0.3, 0.08], [0.5, 0.66, 0.08]] },
    { id: 'c',
      lines: [], circles: [], spirals: [],
      arcs: [[0.55, 0.5, 0.3, 60, 300]],
      sweetSpots: [[0.55, 0.5, 0.1]] },
  ],
};

export const pattern = {
  id: 'pattern', name: 'パターン', group: 'advanced',
  // 等間隔の繰り返しがつくるリズム
  variants: [{ id: 'default',
    lines: [],
    circles: [
      [0.25, 0.33, 0.06], [0.5, 0.33, 0.06], [0.75, 0.33, 0.06],
      [0.25, 0.67, 0.06], [0.5, 0.67, 0.06], [0.75, 0.67, 0.06],
    ],
    spirals: [],
    sweetSpots: [
      [0.25, 0.33, 0.07], [0.5, 0.33, 0.07], [0.75, 0.33, 0.07],
      [0.25, 0.67, 0.07], [0.5, 0.67, 0.07], [0.75, 0.67, 0.07],
    ] }],
};
