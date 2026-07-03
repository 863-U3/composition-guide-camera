import { GUIDES } from './guides/index.js';
import { drawGuide } from './renderer.js';

const ASPECTS = [
  { id: '4:3', w: 4, h: 3 },
  { id: '16:9', w: 16, h: 9 },
  { id: '1:1', w: 1, h: 1 },
];

const THUMB_W = 96;
const THUMB_H = 72;

const ZUKAN_DIAGRAM_W = 320;
const ZUKAN_DIAGRAM_H = 240;

// 初心者向けの一言コツ（構図図鑑用）
const GUIDE_TIPS = {
  thirds: '線の交点に主役を置くだけで様になる、いちばんの定番。',
  triangle: '画面の中に三角形をつくると、どっしり安定した印象に。',
  golden: '渦の中心に主役を。自然で心地よいバランスになる。',
  silver: '和の建築や街並みと相性がいい、日本になじむ比率。',
  'phi-grid': '三分割より少し中央寄り。上品な余白が生まれる。',
  railman: '縦1/4の線に主役を乗せると、風景に奥行きが出る。',
  diagonal: '斜めの流れをつくると、写真に動きとスピード感が出る。',
  symmetry: '上下や左右で対称に。水鏡や建物で効果絶大。',
  hinomaru: 'ど真ん中にドン。潔く主役を見せたいときに。',
};

/**
 * initUI wires up the bottom guide strip, aspect buttons, opacity slider,
 * and the camera-error overlay. All DOM lookups happen inside this function
 * so importing this module is safe in a DOM-free (headless) environment.
 */
export function initUI({ onGuideChange, onVariantCycle, onAspectChange, onOpacityChange, onBurnInChange, onShutter, onAutoRecommendChange, onLevelToggle } = {}) {
  const strip = document.getElementById('guideStrip');
  const aspectControls = document.getElementById('aspectControls');
  const opacitySlider = document.getElementById('opacitySlider');
  const burnInToggle = document.getElementById('burnInToggle');
  const autoRecommendToggle = document.getElementById('autoRecommendToggle');
  const toast = document.getElementById('toast');
  const sizeAdvice = document.getElementById('sizeAdvice');
  const shutterBtn = document.getElementById('shutterBtn');
  const errorOverlay = document.getElementById('errorOverlay');
  const retryBtn = document.getElementById('retryBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const guideStripToggleBtn = document.getElementById('guideStripToggleBtn');
  const levelControl = document.getElementById('levelControl');
  const levelToggle = document.getElementById('levelToggle');
  let toastHideTimer = null;
  let toastFadeTimer = null;
  function showToastLocal(text) {
    if (!toast) return;
    if (toastHideTimer) clearTimeout(toastHideTimer);
    if (toastFadeTimer) clearTimeout(toastFadeTimer);
    toast.textContent = text;
    toast.classList.remove('is-hidden');
    toast.classList.remove('is-fading');
    toastFadeTimer = setTimeout(() => {
      toast.classList.add('is-fading');
    }, 1200);
    toastHideTimer = setTimeout(() => {
      toast.classList.add('is-hidden');
    }, 1500);
  }
  const SIZE_ADVICE_TEXT = { closer: 'もっと寄って', back: '少し引いて' };
  let currentSizeAdvice = null;

  let selectedGuideId = GUIDES[0]?.id ?? null;

  // --- ガイドサムネ ---
  if (strip) {
    strip.innerHTML = '';
    for (const guide of GUIDES) {
      const btn = document.createElement('button');
      btn.className = 'guide-thumb';
      btn.dataset.guideId = guide.id;
      btn.setAttribute('aria-label', guide.name);

      const canvas = document.createElement('canvas');
      canvas.width = THUMB_W;
      canvas.height = THUMB_H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, THUMB_W, THUMB_H);
      drawGuide(ctx, guide.variants[0], THUMB_W, THUMB_H, { opacity: 1 });

      const label = document.createElement('span');
      label.className = 'guide-thumb-label';
      label.textContent = guide.name;

      btn.append(canvas, label);
      btn.addEventListener('click', () => {
        for (const el of strip.querySelectorAll('.guide-thumb')) el.classList.remove('is-selected');
        btn.classList.add('is-selected');
        if (autoRecommendToggle?.checked) {
          autoRecommendToggle.checked = false;
          onAutoRecommendChange?.(false);
        }
        if (selectedGuideId === guide.id) {
          onVariantCycle?.(guide.id);
        } else {
          selectedGuideId = guide.id;
          onGuideChange?.(guide.id);
        }
      });
      strip.appendChild(btn);
    }
    strip.querySelector('.guide-thumb')?.classList.add('is-selected');
  }

  // --- アスペクト比 ---
  if (aspectControls) {
    aspectControls.innerHTML = '';
    for (const aspect of ASPECTS) {
      const btn = document.createElement('button');
      btn.className = 'aspect-btn';
      btn.textContent = aspect.id;
      btn.dataset.aspectId = aspect.id;
      btn.addEventListener('click', () => {
        for (const el of aspectControls.querySelectorAll('.aspect-btn')) el.classList.remove('is-selected');
        btn.classList.add('is-selected');
        onAspectChange?.(aspect);
      });
      aspectControls.appendChild(btn);
    }
    aspectControls.querySelector('.aspect-btn')?.classList.add('is-selected');
  }

  // --- 濃度スライダー ---
  if (opacitySlider) {
    opacitySlider.addEventListener('input', () => {
      onOpacityChange?.(Number(opacitySlider.value));
    });
  }

  // --- ガイド焼き込みトグル ---
  if (burnInToggle) {
    burnInToggle.addEventListener('change', () => {
      onBurnInChange?.(burnInToggle.checked);
    });
  }

  // --- おまかせ構図トグル ---
  if (autoRecommendToggle) {
    autoRecommendToggle.addEventListener('change', () => {
      onAutoRecommendChange?.(autoRecommendToggle.checked);
    });
  }

  // --- シャッターボタン ---
  if (shutterBtn) {
    shutterBtn.addEventListener('click', () => {
      onShutter?.();
    });
  }

  // --- カメラエラー ---
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      retryHandler?.();
    });
  }
  let retryHandler = null;

  // --- ⚙設定ポップオーバー ---
  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', () => {
      settingsPanel.classList.toggle('is-hidden');
    });
  }

  // --- 構図図鑑 ---
  const zukanBtn = document.getElementById('zukanBtn');
  const zukanOverlay = document.getElementById('zukanOverlay');
  const zukanCloseBtn = document.getElementById('zukanCloseBtn');
  const zukanList = document.getElementById('zukanList');
  if (zukanBtn && zukanOverlay && zukanList) {
    let zukanBuilt = false;
    const buildZukan = () => {
      if (zukanBuilt) return;
      zukanBuilt = true;
      for (const guide of GUIDES) {
        const entry = document.createElement('button');
        entry.className = 'zukan-entry';
        entry.setAttribute('aria-label', `${guide.name}で撮る`);

        const title = document.createElement('h2');
        title.className = 'zukan-entry-title';
        title.textContent = guide.name;

        const diagram = document.createElement('canvas');
        diagram.className = 'zukan-diagram';
        diagram.width = ZUKAN_DIAGRAM_W;
        diagram.height = ZUKAN_DIAGRAM_H;
        const dctx = diagram.getContext('2d');
        dctx.fillStyle = '#111';
        dctx.fillRect(0, 0, ZUKAN_DIAGRAM_W, ZUKAN_DIAGRAM_H);
        drawGuide(dctx, guide.variants[0], ZUKAN_DIAGRAM_W, ZUKAN_DIAGRAM_H, { opacity: 1 });

        const photo = document.createElement('img');
        photo.className = 'zukan-photo';
        photo.src = `assets/samples/${guide.id}.jpg`;
        photo.alt = `${guide.name}の作例`;
        photo.loading = 'lazy';

        const tip = document.createElement('p');
        tip.className = 'zukan-tip';
        tip.textContent = GUIDE_TIPS[guide.id] ?? '';

        entry.append(title, diagram, photo, tip);
        entry.addEventListener('click', () => {
          if (autoRecommendToggle?.checked) {
            autoRecommendToggle.checked = false;
            onAutoRecommendChange?.(false);
          }
          selectedGuideId = guide.id;
          if (strip) {
            for (const el of strip.querySelectorAll('.guide-thumb')) {
              el.classList.toggle('is-selected', el.dataset.guideId === guide.id);
            }
          }
          onGuideChange?.(guide.id);
          zukanOverlay.classList.add('is-hidden');
          showToastLocal(`${guide.name}で撮ってみよう`);
        });
        zukanList.appendChild(entry);
      }
    };
    zukanBtn.addEventListener('click', () => {
      buildZukan();
      zukanOverlay.classList.remove('is-hidden');
    });
    zukanCloseBtn?.addEventListener('click', () => {
      zukanOverlay.classList.add('is-hidden');
    });
  }

  // --- 構図を選ぶ（サムネ帯開閉） ---
  if (guideStripToggleBtn && strip) {
    guideStripToggleBtn.addEventListener('click', () => {
      const nowHidden = strip.classList.toggle('is-hidden');
      guideStripToggleBtn.classList.toggle('is-active', !nowHidden);
    });
  }

  // --- 水平ガイドトグル ---
  if (levelControl) {
    if (typeof DeviceOrientationEvent === 'undefined') {
      levelControl.classList.add('is-hidden');
    } else if (levelToggle) {
      levelControl.classList.remove('is-hidden');
      levelToggle.addEventListener('click', async () => {
        if (levelToggle.checked) {
          // requestPermissionが存在する(iOS)場合はユーザー操作起点で許可要求
          if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
              const result = await DeviceOrientationEvent.requestPermission();
              if (result !== 'granted') {
                levelToggle.checked = false;
                showToastLocal('水平ガイドを使えません');
                return;
              }
            } catch (err) {
              levelToggle.checked = false;
              showToastLocal('水平ガイドを使えません');
              return;
            }
          }
          onLevelToggle?.(true);
        } else {
          onLevelToggle?.(false);
        }
      });
    }
  }

  return {
    guides: GUIDES,
    aspects: ASPECTS,
    // コールバックを発火せず、選択状態(selectedGuideId + .is-selected)だけ同期する。
    // バッジ経由でガイドを切り替えた後、次のサムネタップが誤ってvariant cycleに
    // 入らないようにするため。
    selectGuide(guideId) {
      if (!GUIDES.some((g) => g.id === guideId)) return;
      selectedGuideId = guideId;
      if (strip) {
        for (const el of strip.querySelectorAll('.guide-thumb')) {
          el.classList.toggle('is-selected', el.dataset.guideId === guideId);
        }
      }
    },
    showError(onRetry) {
      retryHandler = onRetry;
      if (shutterBtn) shutterBtn.disabled = true;
      errorOverlay?.classList.remove('is-hidden');
    },
    hideError() {
      if (shutterBtn) shutterBtn.disabled = false;
      errorOverlay?.classList.add('is-hidden');
    },
    showToast: showToastLocal,
    setSizeAdvice(kind) {
      if (!sizeAdvice || kind === currentSizeAdvice) return;
      currentSizeAdvice = kind;
      if (!kind) {
        sizeAdvice.textContent = '';
        sizeAdvice.classList.add('is-hidden');
        return;
      }
      sizeAdvice.textContent = SIZE_ADVICE_TEXT[kind] ?? '';
      sizeAdvice.classList.remove('is-hidden');
    },
  };
}
