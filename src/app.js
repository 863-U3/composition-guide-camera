import { GUIDES } from './guides/index.js';
import { drawGuide } from './renderer.js';
import { startCamera } from './camera.js';
import { initUI } from './ui.js';
import { capture, download } from './capture.js';
import { createDetector } from './detector.js';
import { hitTest, mapVideoToOverlay } from './hittest.js';

const DETECT_INTERVAL_MS = 500;

const state = {
  guide: GUIDES[0],
  variant: GUIDES[0]?.variants[0],
  opacity: 0.8,
  aspect: { id: '4:3', w: 4, h: 3 },
  hitSpots: [],
  burnIn: false,
  detectedSubjects: [],
  manualSubject: null,
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
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
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

function setBurnIn(value) {
  state.burnIn = value;
}

async function onShutter(videoEl) {
  try {
    const blob = await capture(videoEl, {
      burnIn: state.burnIn,
      variant: state.variant,
      opacity: state.opacity,
    });
    if (!blob) {
      console.warn('撮影に失敗しました');
      return;
    }
    download(blob);
  } catch (err) {
    console.warn('撮影に失敗しました', err);
  }
}

function updateHitSpots() {
  const subjects = [...state.detectedSubjects];
  if (state.manualSubject) subjects.push(state.manualSubject);
  if (!state.variant) {
    state.hitSpots = [];
    return;
  }
  const nextHits = hitTest(subjects, state.variant);
  const isNewHit = nextHits.some((i) => !state.hitSpots.includes(i));
  state.hitSpots = nextHits;
  if (isNewHit && nextHits.length > 0) {
    navigator.vibrate?.(30);
  }
}

function handleOverlayTap(overlay, clientX, clientY) {
  const rect = overlay.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
  state.manualSubject = { cx: nx, cy: ny, w: 0.05, h: 0.05, label: 'manual', score: 1 };
  updateHitSpots();
}

function clearManualSubject() {
  state.manualSubject = null;
  updateHitSpots();
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
    onBurnInChange: setBurnIn,
    onShutter: () => onShutter(video),
  });

  overlay.addEventListener('click', (e) => handleOverlayTap(overlay, e.clientX, e.clientY));
  overlay.addEventListener('dblclick', () => clearManualSubject());

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

  const detector = await createDetector();
  let detecting = false;
  let lastDetectAt = 0;

  async function runDetection(timestamp) {
    if (!detector || detecting) return;
    if (timestamp - lastDetectAt < DETECT_INTERVAL_MS) return;
    lastDetectAt = timestamp;
    detecting = true;
    try {
      const rawSubjects = await detector.detect(video);
      const overlayRect = { w: overlay.clientWidth, h: overlay.clientHeight };
      state.detectedSubjects =
        video.videoWidth && video.videoHeight && overlayRect.w && overlayRect.h
          ? rawSubjects.map((s) => mapVideoToOverlay(s, video.videoWidth, video.videoHeight, overlayRect))
          : [];
      updateHitSpots();
    } catch (err) {
      console.warn('被写体検知に失敗しました', err);
    } finally {
      detecting = false;
    }
  }

  function loop(timestamp) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.variant) {
      drawGuide(ctx, state.variant, cssW, cssH, {
        opacity: state.opacity,
        highlight: state.hitSpots,
      });
    }
    runDetection(timestamp);
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
