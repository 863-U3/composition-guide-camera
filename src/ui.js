import { GUIDES } from './guides/index.js';
import { drawGuide } from './renderer.js';

const ASPECTS = [
  { id: '4:3', w: 4, h: 3 },
  { id: '16:9', w: 16, h: 9 },
  { id: '1:1', w: 1, h: 1 },
];

const THUMB_W = 96;
const THUMB_H = 72;

/**
 * initUI wires up the bottom guide strip, aspect buttons, opacity slider,
 * and the camera-error overlay. All DOM lookups happen inside this function
 * so importing this module is safe in a DOM-free (headless) environment.
 */
export function initUI({ onGuideChange, onVariantCycle, onAspectChange, onOpacityChange, onBurnInChange, onShutter, onAutoRecommendChange, onRecommendBadgeTap } = {}) {
  const strip = document.getElementById('guideStrip');
  const aspectControls = document.getElementById('aspectControls');
  const opacitySlider = document.getElementById('opacitySlider');
  const burnInToggle = document.getElementById('burnInToggle');
  const autoRecommendToggle = document.getElementById('autoRecommendToggle');
  const recommendBadge = document.getElementById('recommendBadge');
  const shutterBtn = document.getElementById('shutterBtn');
  const errorOverlay = document.getElementById('errorOverlay');
  const retryBtn = document.getElementById('retryBtn');

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

  // --- レコメンドバッジ ---
  if (recommendBadge) {
    recommendBadge.addEventListener('click', () => {
      onRecommendBadgeTap?.();
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
    showRecommendBadge(guideName) {
      if (!recommendBadge) return;
      recommendBadge.textContent = `この構図が近い: ${guideName}`;
      recommendBadge.classList.remove('is-hidden');
    },
    hideRecommendBadge() {
      recommendBadge?.classList.add('is-hidden');
    },
  };
}
