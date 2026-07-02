import { GUIDES } from './guides/index.js';
import { drawGuide, drawArrow, drawLevel } from './renderer.js';
import { startCamera } from './camera.js';
import { initUI } from './ui.js';
import { capture, download } from './capture.js';
import { createDetector } from './detector.js';
import { hitTest, mapVideoToOverlay, visibleVideoRect } from './hittest.js';
import { recommend, stableTop } from './recommender.js';
import { guidanceVector, sizeAdvice, primarySubject, levelState } from './guidance.js';

const DETECT_INTERVAL_MS = 500;
const RECOMMEND_SCORE_MARGIN = 0.15;
const RECOMMEND_SUPPRESS_MS = 5000;

const state = {
  guide: GUIDES[0],
  variant: GUIDES[0]?.variants[0],
  opacity: 0.5,
  aspect: { id: '4:3', w: 4, h: 3 },
  hitSpots: [],
  burnIn: false,
  detectedSubjects: [],
  manualSubject: null,
  autoRecommend: true,
  recommendHistory: [],
  suppressedGuideId: null,
  suppressedUntil: 0,
  levelEnabled: false,
  rollDeg: null,
};

let onDeviceOrientation = null;

function setLevelEnabled(value) {
  state.levelEnabled = value;
  if (value) {
    if (!onDeviceOrientation) {
      onDeviceOrientation = (event) => {
        state.rollDeg = event.gamma ?? null;
      };
    }
    window.addEventListener('deviceorientation', onDeviceOrientation);
  } else {
    if (onDeviceOrientation) {
      window.removeEventListener('deviceorientation', onDeviceOrientation);
    }
    state.rollDeg = null;
  }
}

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

function setAutoRecommend(value, ui) {
  state.autoRecommend = value;
  state.recommendHistory = [];
}

function switchToGuide(ui, guideId, variantId) {
  const guide = GUIDES.find((g) => g.id === guideId);
  if (!guide) return;
  state.guide = guide;
  state.variant = guide.variants.find((v) => v.id === variantId) ?? guide.variants[0];
  ui.selectGuide?.(guideId);
  state.suppressedGuideId = guideId;
  state.suppressedUntil = Date.now() + RECOMMEND_SUPPRESS_MS;
  ui.showToast?.(guide.name ?? guideId);
}

function updateAutoRecommend(ui) {
  const subjects = [...state.detectedSubjects];
  if (state.manualSubject) subjects.push(state.manualSubject);
  if (!state.autoRecommend || subjects.length === 0) return;
  const ranked = recommend(subjects, GUIDES);
  if (!ranked.length) return;
  const top = ranked[0];
  state.recommendHistory.push(top.guideId);
  if (state.recommendHistory.length > 5) state.recommendHistory.shift();

  const stableGuideId = stableTop(state.recommendHistory);
  if (!stableGuideId) return;
  if (stableGuideId === state.guide?.id) return;
  if (state.suppressedGuideId === stableGuideId && Date.now() < state.suppressedUntil) return;

  const currentScore = ranked.find((r) => r.guideId === state.guide?.id)?.score ?? 0;
  const stableEntry = ranked.find((r) => r.guideId === stableGuideId);
  if (!stableEntry) return;
  if (stableEntry.score - currentScore <= RECOMMEND_SCORE_MARGIN) return;

  switchToGuide(ui, stableGuideId, stableEntry.variantId);
}

async function onShutter(videoEl, overlay) {
  try {
    let crop;
    if (videoEl.videoWidth && videoEl.videoHeight && overlay) {
      const r = overlay.getBoundingClientRect();
      if (r.width && r.height) {
        crop = visibleVideoRect(
          videoEl.videoWidth,
          videoEl.videoHeight,
          window.innerWidth,
          window.innerHeight,
          { x: r.left, y: r.top, w: r.width, h: r.height },
        );
      }
    }
    const blob = await capture(videoEl, {
      burnIn: state.burnIn,
      variant: state.variant,
      opacity: state.opacity,
      crop,
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
    onShutter: () => onShutter(video, overlay),
    onAutoRecommendChange: (value) => setAutoRecommend(value, ui),
    onLevelToggle: setLevelEnabled,
  });

  video.addEventListener('click', (e) => handleOverlayTap(overlay, e.clientX, e.clientY));
  video.addEventListener('dblclick', () => clearManualSubject());

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
      const r = overlay.getBoundingClientRect();
      const overlayRect = { x: r.left, y: r.top, w: r.width, h: r.height };
      state.detectedSubjects =
        video.videoWidth && video.videoHeight && overlayRect.w && overlayRect.h
          ? rawSubjects.map((s) =>
              mapVideoToOverlay(
                s,
                video.videoWidth,
                video.videoHeight,
                window.innerWidth,
                window.innerHeight,
                overlayRect,
              ))
          : [];
      updateHitSpots();
      updateAutoRecommend(ui);
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

    if (state.levelEnabled && state.rollDeg != null) {
      const { level } = levelState(state.rollDeg);
      drawLevel(ctx, state.rollDeg, cssW, cssH, { level });
    }

    const subj = primarySubject(state.detectedSubjects, state.manualSubject);
    if (subj) {
      const gv = guidanceVector(subj, state.variant);
      if (gv && gv.dist > 0) {
        const from = { x: subj.cx, y: subj.cy };
        const to = { x: subj.cx + gv.dx, y: subj.cy + gv.dy };
        drawArrow(ctx, from, to, cssW, cssH, { dist: gv.dist });
      }
      ui.setSizeAdvice?.(sizeAdvice(subj));
    } else {
      ui.setSizeAdvice?.(null);
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

export { state, applyAspect, setGuide, cycleVariant, setAspect, setOpacity, setAutoRecommend, setLevelEnabled, init };
