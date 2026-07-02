import { GUIDES } from './guides/index.js';
import { drawGuide } from './renderer.js';
import { startCamera } from './camera.js';
import { initUI } from './ui.js';

const state = {
  guide: GUIDES[0],
  variant: GUIDES[0]?.variants[0],
  opacity: 0.8,
  aspect: { id: '4:3', w: 4, h: 3 },
  hitSpots: [],
};

function applyAspect(video, overlay, aspect) {
  const containerW = window.innerWidth;
  const containerH = window.innerHeight;
  const containerRatio = containerW / containerH;
  const targetRatio = aspect.w / aspect.h;

  let w;
  let h;
  if (targetRatio > containerRatio) {
    w = containerW;
    h = containerW / targetRatio;
  } else {
    h = containerH;
    w = containerH * targetRatio;
  }

  overlay.style.width = `${w}px`;
  overlay.style.height = `${h}px`;
  overlay.style.left = `${(containerW - w) / 2}px`;
  overlay.style.top = `${(containerH - h) / 2}px`;

  const canvas = overlay.querySelector('canvas');
  if (canvas) {
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
  }
}

function setGuide(guideId) {
  const guide = GUIDES.find((g) => g.id === guideId);
  if (!guide) return;
  state.guide = guide;
  state.variant = guide.variants[0];
}

function cycleVariant(guideId) {
  const guide = GUIDES.find((g) => g.id === guideId);
  if (!guide) return;
  const idx = guide.variants.indexOf(state.variant);
  const nextIdx = (idx + 1) % guide.variants.length;
  state.variant = guide.variants[nextIdx];
}

function setAspect(video, overlay, aspect) {
  state.aspect = aspect;
  applyAspect(video, overlay, aspect);
}

function setOpacity(value) {
  state.opacity = value;
}

async function init() {
  const video = document.getElementById('camera');
  const overlay = document.getElementById('overlayContainer');
  const canvas = document.getElementById('guideCanvas');
  const ctx = canvas.getContext('2d');

  const ui = initUI({
    onGuideChange: setGuide,
    onVariantCycle: cycleVariant,
    onAspectChange: (aspect) => setAspect(video, overlay, aspect),
    onOpacityChange: setOpacity,
  });

  async function tryStartCamera() {
    try {
      await startCamera(video, { facing: 'environment' });
      ui.hideError();
      applyAspect(video, overlay, state.aspect);
    } catch (err) {
      ui.showError(tryStartCamera);
    }
  }

  window.addEventListener('resize', () => applyAspect(video, overlay, state.aspect));

  await tryStartCamera();

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (state.variant) {
      drawGuide(ctx, state.variant, canvas.width, canvas.height, {
        opacity: state.opacity,
        highlight: state.hitSpots,
      });
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

export { state, applyAspect, setGuide, cycleVariant, setAspect, setOpacity, init };
