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
    { id: 'x',    lines: [[0,0,1,1],[0,1,1,0]], circles: [], spirals: [], sweetSpots: [[1/3,1/3,0.08],[2/3,2/3,0.08],[1/3,2/3,0.08],[2/3,1/3,0.08]] },
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
