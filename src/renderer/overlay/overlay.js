'use strict';

const api = window.prinskrin;

const el = (id) => document.getElementById(id);

const ui = {
  shot: el('shot'),
  dimTop: el('dimTop'),
  dimLeft: el('dimLeft'),
  dimRight: el('dimRight'),
  dimBottom: el('dimBottom'),
  sel: el('sel'),
  ink: el('ink'),
  badge: el('sizeBadge'),
  toolbar: el('toolbar'),
  hint: el('hint'),
  winHighlight: el('winHighlight'),
  winTitle: el('winTitle'),
  toast: el('toast'),
};

const COLORS = ['#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#0a84ff', '#bf5af2', '#ffffff', '#111111'];
const WIDTHS = [2, 4, 7];
const TEXT_SIZE = 18;

const ICONS = {
  region:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><path d="M8.5 8.5h7v7h-7z" stroke-dasharray="2 2"/></svg>',
  screen:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  window:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="14" height="11" rx="2"/><path d="M7 2.5h12.5A1.5 1.5 0 0 1 21 4v11"/></svg>',
  monitor:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="12" height="9" rx="1.6"/><rect x="12" y="11" width="9.5" height="7" rx="1.6"/><path d="M6 20h5"/></svg>',
  move:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>',
  pen:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5 4 20z"/><path d="M14.5 6l3 3"/></svg>',
  marker:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l6-9 5 5-6 7H6l-2-3z"/><path d="M15 6l4 3"/><path d="M3 21h8"/></svg>',
  rect:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="4" y="5.5" width="16" height="13" rx="1.5"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19L19 5"/><path d="M11 5h8v8"/></svg>',
  text:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/></svg>',
  undo:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7L4 12l5 5"/><path d="M4 12h9.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  copy:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 6.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5" stroke-linecap="round"/></svg>',
  save:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="M8 10.5l4 4 4-4"/><path d="M5 19h14"/></svg>',
  saveAs:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5.5A1.5 1.5 0 0 1 5.5 4H17l3 3v11.5A1.5 1.5 0 0 1 18.5 20H9"/><path d="M4 20v-5h5"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M12 3.5v2M12 18.5v2M4.9 7.8l1.7 1M17.4 15.2l1.7 1M4.9 16.2l1.7-1M17.4 8.8l1.7-1"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
};

const state = {
  display: null,
  displays: [],
  mode: 'region',
  active: false,
  phase: 'idle', // idle | selecting | selected
  sel: null,
  shapes: [],
  tool: 'move',
  color: '#ff3b30',
  lineWidth: 4,
  drag: null,
  image: null,
  windowRects: [],
  windowsLoadedAt: 0,
  hoverWindow: null,
  editingText: null,
  autoSave: false,
  busy: false,
  dpr: 1,
};

/* ---------------- утилиты ---------------- */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function point(event) {
  return { x: event.clientX, y: event.clientY };
}

function viewWidth() {
  return window.innerWidth;
}

function viewHeight() {
  return window.innerHeight;
}

function scaleX() {
  const img = state.image;
  const width = state.display && state.display.size ? state.display.size.width : 0;
  if (img && width) return img.naturalWidth / width;
  return state.dpr || 1;
}

function scaleY() {
  const img = state.image;
  const height = state.display && state.display.size ? state.display.size.height : 0;
  if (img && height) return img.naturalHeight / height;
  return state.dpr || 1;
}

/* ---------------- отрисовка ---------------- */

function setRect(node, x, y, w, h) {
  node.style.left = `${Math.round(x)}px`;
  node.style.top = `${Math.round(y)}px`;
  node.style.width = `${Math.max(0, Math.round(w))}px`;
  node.style.height = `${Math.max(0, Math.round(h))}px`;
}

function layoutDims() {
  const W = viewWidth();
  const H = viewHeight();
  const sel = state.sel;
  if (!sel) {
    setRect(ui.dimTop, 0, 0, W, H);
    setRect(ui.dimLeft, 0, 0, 0, 0);
    setRect(ui.dimRight, 0, 0, 0, 0);
    setRect(ui.dimBottom, 0, 0, 0, 0);
    return;
  }
  setRect(ui.dimTop, 0, 0, W, sel.y);
  setRect(ui.dimLeft, 0, sel.y, sel.x, sel.h);
  setRect(ui.dimRight, sel.x + sel.w, sel.y, W - (sel.x + sel.w), sel.h);
  setRect(ui.dimBottom, 0, sel.y + sel.h, W, H - (sel.y + sel.h));
}

function layoutSelection() {
  const sel = state.sel;
  if (!sel) {
    ui.sel.classList.remove('visible');
    ui.ink.classList.remove('visible');
    ui.badge.classList.remove('visible');
    document.body.classList.remove('has-selection');
    return;
  }
  ui.sel.classList.add('visible');
  document.body.classList.add('has-selection');
  setRect(ui.sel, sel.x, sel.y, sel.w, sel.h);
  renderInk();
  updateBadge();
}

function updateBadge() {
  const sel = state.sel;
  if (!sel) {
    ui.badge.classList.remove('visible');
    return;
  }
  const w = Math.round(sel.w * scaleX());
  const h = Math.round(sel.h * scaleY());
  ui.badge.textContent = `${w} × ${h}`;
  ui.badge.classList.add('visible');

  const bw = ui.badge.offsetWidth;
  const bh = ui.badge.offsetHeight;
  let x = sel.x;
  let y = sel.y - bh - 6;
  if (y < 4) y = sel.y + 6;
  x = clamp(x, 4, viewWidth() - bw - 4);
  ui.badge.style.left = `${Math.round(x)}px`;
  ui.badge.style.top = `${Math.round(y)}px`;
  ui.badge.style.display = 'block';
}

function renderInk() {
  const sel = state.sel;
  const canvas = ui.ink;
  if (!sel) {
    canvas.classList.remove('visible');
    return;
  }
  const width = Math.max(1, Math.round(sel.w));
  const height = Math.max(1, Math.round(sel.h));
  const dpr = state.dpr || 1;
  const needW = Math.round(width * dpr);
  const needH = Math.round(height * dpr);
  if (canvas.width !== needW || canvas.height !== needH) {
    canvas.width = needW;
    canvas.height = needH;
  }
  canvas.classList.add('visible');
  canvas.style.left = `${Math.round(sel.x)}px`;
  canvas.style.top = `${Math.round(sel.y)}px`;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawShapes(ctx, state.shapes);
}

function drawShapes(ctx, shapes) {
  for (const shape of shapes) drawShape(ctx, shape);
}

function drawShape(ctx, shape) {
  if (!shape) return;
  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = shape.width;

  if (shape.tool === 'pen' || shape.tool === 'marker') {
    if (shape.tool === 'marker') {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(9, shape.width * 2.6);
    }
    const points = shape.points || [];
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, Math.max(1, ctx.lineWidth / 2), 0, Math.PI * 2);
      ctx.fill();
    } else if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }
  } else if (shape.tool === 'rect') {
    const r = shape.rect;
    const x = Math.min(r.x, r.x + r.w);
    const y = Math.min(r.y, r.y + r.h);
    ctx.strokeRect(x, y, Math.abs(r.w), Math.abs(r.h));
  } else if (shape.tool === 'arrow') {
    drawArrow(ctx, shape.rect);
  } else if (shape.tool === 'text') {
    ctx.font = `600 ${shape.size || TEXT_SIZE}px "Segoe UI", Arial, sans-serif`;
    ctx.textBaseline = 'top';
    const lineHeight = (shape.size || TEXT_SIZE) * 1.25;
    String(shape.text)
      .split('\n')
      .forEach((line, index) => {
        ctx.fillText(line, shape.x, shape.y + index * lineHeight);
      });
  }
  ctx.restore();
}

function drawArrow(ctx, rect) {
  const x1 = rect.x;
  const y1 = rect.y;
  const x2 = rect.x + rect.w;
  const y2 = rect.y + rect.h;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = Math.max(11, ctx.lineWidth * 3.4);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

/* ---------------- раскладка ---------------- */

function layout() {
  layoutDims();
  layoutSelection();
  positionToolbar();
}

function positionToolbar() {
  const tb = ui.toolbar;
  if (!tb || tb.style.display === 'none') return;
  const W = viewWidth();
  const H = viewHeight();
  const tw = tb.offsetWidth;
  const th = tb.offsetHeight;
  let x;
  let y;

  if (state.sel) {
    x = state.sel.x + state.sel.w / 2 - tw / 2;
    x = clamp(x, 10, Math.max(10, W - tw - 10));
    if (state.sel.y - th - 12 >= 8) {
      y = state.sel.y - th - 12;
    } else if (state.sel.y + state.sel.h + th + 12 <= H - 8) {
      y = state.sel.y + state.sel.h + 12;
    } else {
      y = clamp(state.sel.y + 12, 8, Math.max(8, H - th - 8));
    }
  } else {
    x = clamp(W / 2 - tw / 2, 10, Math.max(10, W - tw - 10));
    y = 24;
  }

  tb.style.left = `${Math.round(x)}px`;
  tb.style.top = `${Math.round(y)}px`;

  const hint = ui.hint;
  if (hint && hint.style.display !== 'none') {
    const hw = hint.offsetWidth;
    const hh = hint.offsetHeight;
    hint.style.left = `${Math.round(clamp(x + tw / 2 - hw / 2, 10, W - hw - 10))}px`;
    hint.style.top = `${Math.round(y + th + 9)}px`;
    hint.style.visibility = hh ? 'visible' : 'hidden';
  }
}

/* ---------------- панель ---------------- */

function makeButton({ icon, label, title, onClick, active, variant, iconOnly }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tb-btn';
  if (iconOnly) button.classList.add('icon-only');
  if (variant) button.classList.add(variant);
  if (active) button.classList.add('active');
  if (title) button.title = title;

  if (icon) {
    const span = document.createElement('span');
    span.className = 'ico';
    span.innerHTML = ICONS[icon] || '';
    button.appendChild(span);
  }
  if (label) {
    const span = document.createElement('span');
    span.textContent = label;
    button.appendChild(span);
  }
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  button.addEventListener('pointerdown', (event) => event.stopPropagation());
  return button;
}

function separator() {
  const span = document.createElement('span');
  span.className = 'tb-sep';
  return span;
}

function buildToolbar() {
  const tb = ui.toolbar;
  tb.innerHTML = '';

  if (!state.active) {
    tb.style.display = 'none';
    ui.hint.style.display = 'none';
    return;
  }

  tb.style.display = 'flex';
  if (state.phase === 'selected') {
    buildEditorBar(tb);
  } else {
    buildModeBar(tb);
  }
  ui.hint.style.display = state.phase === 'selected' ? 'none' : '';
  renderHint();
  requestAnimationFrame(() => {
    positionToolbar();
    updateBadge();
  });
}

function buildModeBar(tb) {
  const row = document.createElement('div');
  row.className = 'tb-row';

  const brand = document.createElement('span');
  brand.className = 'tb-brand';
  brand.textContent = 'prinSkrin';
  row.appendChild(brand);
  row.appendChild(separator());

  row.appendChild(
    makeButton({
      icon: 'region',
      label: 'Выделение',
      title: 'Выделить область мышью (по умолчанию)',
      active: state.mode === 'region',
      onClick: () => {
        state.mode = 'region';
        buildToolbar();
      },
    }),
  );
  row.appendChild(
    makeButton({
      icon: 'screen',
      label: 'Весь экран',
      title: 'Скриншот всего экрана и сохранение',
      onClick: () => saveWholeDisplay(),
    }),
  );
  row.appendChild(
    makeButton({
      icon: 'window',
      label: 'Окно',
      title: 'Кликните по нужному окну',
      active: state.mode === 'window',
      onClick: () => {
        state.mode = 'window';
        loadWindows();
        buildToolbar();
      },
    }),
  );

  if (state.displays.length > 1) {
    row.appendChild(separator());
    for (const display of state.displays) {
      row.appendChild(
        makeButton({
          icon: 'monitor',
          label: display.label,
          title: `Скриншот: ${display.label}, ${display.size.width}×${display.size.height}`,
          active: false,
          onClick: () => api.captureDisplay(display.id),
        }),
      );
    }
  }

  row.appendChild(separator());
  row.appendChild(
    makeButton({
      icon: 'settings',
      title: 'Настройки',
      iconOnly: true,
      onClick: () => api.openSettings(),
    }),
  );
  row.appendChild(
    makeButton({
      icon: 'close',
      title: 'Отмена (Esc)',
      iconOnly: true,
      variant: 'danger',
      onClick: () => api.cancel(),
    }),
  );

  tb.appendChild(row);
}

function buildEditorBar(tb) {
  const tools = document.createElement('div');
  tools.className = 'tb-row';

  const toolList = [
    { id: 'move', icon: 'move', title: 'Переместить / изменить выделение' },
    { id: 'pen', icon: 'pen', title: 'Карандаш' },
    { id: 'marker', icon: 'marker', title: 'Маркер' },
    { id: 'rect', icon: 'rect', title: 'Прямоугольник' },
    { id: 'arrow', icon: 'arrow', title: 'Стрелка' },
    { id: 'text', icon: 'text', title: 'Текст' },
  ];

  for (const tool of toolList) {
    tools.appendChild(
      makeButton({
        icon: tool.icon,
        title: tool.title,
        iconOnly: true,
        active: state.tool === tool.id,
        onClick: () => {
          state.tool = tool.id;
          buildToolbar();
        },
      }),
    );
  }

  tools.appendChild(separator());
  tools.appendChild(
    makeButton({
      icon: 'undo',
      title: 'Отменить последний элемент (Ctrl+Z)',
      iconOnly: true,
      onClick: () => {
        state.shapes.pop();
        renderInk();
      },
    }),
  );
  tools.appendChild(separator());

  for (const color of COLORS) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    if (state.color === color) swatch.classList.add('active');
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener('click', (event) => {
      event.stopPropagation();
      state.color = color;
      buildToolbar();
    });
    swatch.addEventListener('pointerdown', (event) => event.stopPropagation());
    tools.appendChild(swatch);
  }

  tools.appendChild(separator());
  for (const width of WIDTHS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'width-btn';
    if (state.lineWidth === width) button.classList.add('active');
    button.title = `Толщина ${width}`;
    const dot = document.createElement('span');
    dot.style.width = `${width + 2}px`;
    dot.style.height = `${width + 2}px`;
    button.appendChild(dot);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      state.lineWidth = width;
      buildToolbar();
    });
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    tools.appendChild(button);
  }

  tb.appendChild(tools);

  const actions = document.createElement('div');
  actions.className = 'tb-row';

  actions.appendChild(
    makeButton({
      icon: 'copy',
      label: 'Копировать',
      title: 'Скопировать в буфер (Ctrl+C)',
      onClick: () => copyImage(),
    }),
  );
  actions.appendChild(
    makeButton({
      icon: 'save',
      label: 'Сохранить',
      title: 'Сохранить в папку (Enter)',
      variant: 'primary',
      onClick: () => saveImage(),
    }),
  );
  actions.appendChild(
    makeButton({
      icon: 'saveAs',
      label: 'Ещё…',
      title: 'Сохранить как… (Ctrl+S)',
      onClick: () => saveImageAs(),
    }),
  );

  const spacer = document.createElement('span');
  spacer.className = 'tb-spacer';
  actions.appendChild(spacer);

  actions.appendChild(
    makeButton({
      icon: 'close',
      title: 'Отмена (Esc)',
      iconOnly: true,
      variant: 'danger',
      onClick: () => api.cancel(),
    }),
  );

  tb.appendChild(actions);
}

function renderHint() {
  if (!state.active || state.phase === 'selected') {
    ui.hint.style.display = 'none';
    return;
  }
  ui.hint.style.display = '';
  if (state.mode === 'window') {
    ui.hint.innerHTML = 'Наведите курсор на окно и кликните · <kbd>Esc</kbd> — отмена';
  } else {
    ui.hint.innerHTML =
      'Зажмите ЛКМ и выделите область · <kbd>Space</kbd> — весь экран · <kbd>Enter</kbd> — сохранить экран · <kbd>Esc</kbd> — отмена';
  }
}

/* ---------------- состояние ---------------- */

function discardSelection() {
  state.sel = null;
  state.shapes = [];
  state.phase = 'idle';
  state.hoverWindow = null;
  ui.winHighlight.classList.remove('visible');
  layout();
  buildToolbar();
}

function finalizeSelection({ autoSave = state.autoSave } = {}) {
  if (!state.sel) return;
  state.sel = {
    x: clamp(state.sel.x, 0, viewWidth()),
    y: clamp(state.sel.y, 0, viewHeight()),
    w: clamp(state.sel.w, 1, viewWidth() - clamp(state.sel.x, 0, viewWidth())),
    h: clamp(state.sel.h, 1, viewHeight() - clamp(state.sel.y, 0, viewHeight())),
  };
  state.phase = 'selected';
  state.hoverWindow = null;
  ui.winHighlight.classList.remove('visible');
  layout();
  buildToolbar();
  if (autoSave) saveImage();
}

function activate() {
  if (state.active) return;
  state.active = true;
  document.body.classList.remove('passive');
  api.claim();
  buildToolbar();
  layout();
}

function deactivate() {
  state.active = false;
  state.sel = null;
  state.shapes = [];
  state.phase = 'idle';
  state.hoverWindow = null;
  ui.winHighlight.classList.remove('visible');
  document.body.classList.add('passive');
  buildToolbar();
  layout();
}

/* ---------------- выделение мышью ---------------- */

function beginSelection(p) {
  state.phase = 'selecting';
  state.shapes = [];
  state.sel = { x: p.x, y: p.y, w: 0, h: 0 };
  state.drag = { kind: 'new', sx: p.x, sy: p.y };
  state.hoverWindow = null;
  ui.winHighlight.classList.remove('visible');
  ui.toolbar.style.display = 'none';
  ui.hint.style.display = 'none';
  layoutDims();
  layoutSelection();
}

function updateNewSelection(p) {
  const drag = state.drag;
  if (!drag) return;
  const x = clamp(p.x, 0, viewWidth());
  const y = clamp(p.y, 0, viewHeight());
  state.sel = {
    x: Math.min(drag.sx, x),
    y: Math.min(drag.sy, y),
    w: Math.abs(x - drag.sx),
    h: Math.abs(y - drag.sy),
  };
  layoutDims();
  layoutSelection();
}

function hitHandle(x, y) {
  const sel = state.sel;
  if (!sel) return null;
  const points = {
    nw: [sel.x, sel.y],
    n: [sel.x + sel.w / 2, sel.y],
    ne: [sel.x + sel.w, sel.y],
    e: [sel.x + sel.w, sel.y + sel.h / 2],
    se: [sel.x + sel.w, sel.y + sel.h],
    s: [sel.x + sel.w / 2, sel.y + sel.h],
    sw: [sel.x, sel.y + sel.h],
    w: [sel.x, sel.y + sel.h / 2],
  };
  for (const [name, [hx, hy]] of Object.entries(points)) {
    if (Math.abs(x - hx) <= 7 && Math.abs(y - hy) <= 7) return name;
  }
  return null;
}

function insideSelection(x, y) {
  const sel = state.sel;
  if (!sel) return false;
  return x >= sel.x && x <= sel.x + sel.w && y >= sel.y && y <= sel.y + sel.h;
}

function beginMove(p) {
  state.drag = { kind: 'move', sx: p.x, sy: p.y, origin: { ...state.sel } };
}

function beginResize(handle, p) {
  state.drag = { kind: 'resize', handle, sx: p.x, sy: p.y, origin: { ...state.sel } };
}

function applyMove(p) {
  const drag = state.drag;
  if (!drag) return;
  const origin = drag.origin;
  const dx = p.x - drag.sx;
  const dy = p.y - drag.sy;
  state.sel = {
    x: clamp(origin.x + dx, 0, viewWidth() - origin.w),
    y: clamp(origin.y + dy, 0, viewHeight() - origin.h),
    w: origin.w,
    h: origin.h,
  };
  layout();
}

function applyResize(p) {
  const drag = state.drag;
  if (!drag) return;
  const origin = drag.origin;
  const handle = drag.handle;
  let left = origin.x;
  let top = origin.y;
  let right = origin.x + origin.w;
  let bottom = origin.y + origin.h;

  if (handle.includes('w')) left = clamp(p.x, 0, right - 10);
  if (handle.includes('e')) right = clamp(p.x, left + 10, viewWidth());
  if (handle.includes('n')) top = clamp(p.y, 0, bottom - 10);
  if (handle.includes('s')) bottom = clamp(p.y, top + 10, viewHeight());

  state.sel = { x: left, y: top, w: right - left, h: bottom - top };
  layout();
}

function updateCursor() {
  if (state.busy) return;
  if (state.phase !== 'selected' || !state.sel) {
    document.body.style.cursor = 'crosshair';
    return;
  }
  const handle = hitHandle(state.lastPoint ? state.lastPoint.x : -100, state.lastPoint ? state.lastPoint.y : -100);
  if (handle) {
    const map = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
    document.body.style.cursor = map[handle] || 'crosshair';
    return;
  }
  if (state.lastPoint && insideSelection(state.lastPoint.x, state.lastPoint.y)) {
    document.body.style.cursor = state.tool === 'move' ? 'move' : 'crosshair';
    return;
  }
  document.body.style.cursor = 'crosshair';
}

/* ---------------- рисование ---------------- */

function beginShape(p) {
  const sel = state.sel;
  if (!sel) return;
  const rel = { x: p.x - sel.x, y: p.y - sel.y };
  const shape = {
    tool: state.tool,
    color: state.color,
    width: state.lineWidth,
    points: [rel],
    rect: { x: rel.x, y: rel.y, w: 0, h: 0 },
  };
  state.shapes.push(shape);
  state.drag = { kind: 'shape', shape };
  renderInk();
}

function updateShape(p) {
  const drag = state.drag;
  const sel = state.sel;
  if (!drag || !sel || !drag.shape) return;
  const rel = { x: p.x - sel.x, y: p.y - sel.y };
  const shape = drag.shape;
  if (shape.tool === 'pen' || shape.tool === 'marker') {
    const last = shape.points[shape.points.length - 1];
    if (!last || Math.hypot(rel.x - last.x, rel.y - last.y) > 1.2) shape.points.push(rel);
  } else {
    shape.rect = { x: shape.rect.x, y: shape.rect.y, w: rel.x - shape.rect.x, h: rel.y - shape.rect.y };
  }
  renderInk();
}

function startTextInput(p) {
  const sel = state.sel;
  if (!sel) return;
  const editor = document.createElement('textarea');
  editor.className = 'text-editor';
  editor.rows = 1;
  editor.style.left = `${p.x - 3}px`;
  editor.style.top = `${p.y - 2}px`;
  editor.style.height = '28px';
  editor.style.color = state.color;
  document.body.appendChild(editor);
  state.editingText = editor;

  let finished = false;
  const finish = (cancel) => {
    if (finished) return;
    finished = true;
    const text = editor.value.replace(/\s+$/g, '');
    if (!cancel && text.trim()) {
      state.shapes.push({
        tool: 'text',
        color: state.color,
        width: state.lineWidth,
        size: TEXT_SIZE,
        text,
        x: p.x - sel.x,
        y: p.y - sel.y,
      });
    }
    editor.remove();
    state.editingText = null;
    renderInk();
    editor.blur();
  };

  editor.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      finish(false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(true);
    }
  });
  editor.addEventListener('blur', () => finish(false));
  editor.addEventListener('input', () => {
    editor.style.height = 'auto';
    editor.style.height = `${Math.max(28, editor.scrollHeight)}px`;
  });

  setTimeout(() => editor.focus(), 0);
}

/* ---------------- окна ---------------- */

async function loadWindows() {
  if (state.windowsLoadedAt && Date.now() - state.windowsLoadedAt < 500) return;
  state.windowsLoadedAt = Date.now();
  const list = await api.windows();
  const scale = (state.display && state.display.scaleFactor) || 1;
  const bounds = (state.display && state.display.bounds) || { x: 0, y: 0 };
  const W = viewWidth();
  const H = viewHeight();

  state.windowRects = (list || [])
    .map((win) => {
      const left = win.x / scale - bounds.x;
      const top = win.y / scale - bounds.y;
      const right = left + win.width / scale;
      const bottom = top + win.height / scale;
      const x = Math.max(0, left);
      const y = Math.max(0, top);
      const w = Math.min(W, right) - x;
      const h = Math.min(H, bottom) - y;
      return { x, y, w, h, title: win.title };
    })
    .filter((rect) => rect.w > 40 && rect.h > 40);
}

function pickWindow(x, y) {
  for (const rect of state.windowRects) {
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return rect;
  }
  return null;
}

function updateWindowHighlight(x, y) {
  if (state.mode !== 'window' || state.phase === 'selected') {
    ui.winHighlight.classList.remove('visible');
    return;
  }
  const rect = pickWindow(x, y);
  if (!rect) {
    ui.winHighlight.classList.remove('visible');
    state.hoverWindow = null;
    return;
  }
  state.hoverWindow = rect;
  ui.winHighlight.classList.add('visible');
  setRect(ui.winHighlight, rect.x, rect.y, rect.w, rect.h);
  ui.winTitle.textContent = rect.title || 'Окно';
  ui.winTitle.style.top = rect.y > 30 ? '-26px' : `${rect.h > 30 ? 4 : 4}px`;
}

/* ---------------- события ---------------- */

function onPointerDown(event) {
  if (state.busy || state.editingText) return;
  if (event.target.closest && event.target.closest('#toolbar')) return;
  if (event.button === 2) {
    if (state.sel) discardSelection();
    else api.cancel();
    return;
  }
  if (event.button !== 0) return;

  if (!state.active) activate();

  const p = point(event);
  state.lastPoint = p;

  if (state.phase === 'idle') {
    if (state.mode === 'window') {
      if (Date.now() - state.windowsLoadedAt > 2500) loadWindows();
      const rect = pickWindow(p.x, p.y);
      if (rect) {
        state.sel = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
        finalizeSelection();
        return;
      }
    }
    beginSelection(p);
    return;
  }

  if (state.phase === 'selected') {
    const handle = hitHandle(p.x, p.y);
    if (handle) {
      beginResize(handle, p);
      return;
    }
    if (insideSelection(p.x, p.y)) {
      if (state.tool === 'move') beginMove(p);
      else if (state.tool === 'text') startTextInput(p);
      else beginShape(p);
      return;
    }
    discardSelection();
    beginSelection(p);
  }
}

function onPointerMove(event) {
  if (state.busy) return;
  const p = point(event);
  state.lastPoint = p;

  if (state.mode === 'window' && state.phase === 'idle') {
    if (Date.now() - state.windowsLoadedAt > 2500) loadWindows();
    updateWindowHighlight(p.x, p.y);
  }

  const drag = state.drag;
  if (!drag) {
    updateCursor();
    return;
  }
  if (drag.kind === 'new') updateNewSelection(p);
  else if (drag.kind === 'move') applyMove(p);
  else if (drag.kind === 'resize') applyResize(p);
  else if (drag.kind === 'shape') updateShape(p);
  updateCursor();
}

function onPointerUp(event) {
  if (state.busy) return;
  const drag = state.drag;
  state.drag = null;
  if (!drag) return;
  if (event.button !== 0 && event.button !== -1) return;

  if (drag.kind === 'new') {
    const sel = state.sel;
    if (!sel || sel.w < 6 || sel.h < 6) {
      state.sel = null;
      state.phase = 'idle';
      layout();
      buildToolbar();
      return;
    }
    finalizeSelection();
    return;
  }
  updateCursor();
}

function onKeyDown(event) {
  if (state.editingText) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    if (state.sel) discardSelection();
    else api.cancel();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    if (state.sel) saveImage();
    else saveWholeDisplay();
    return;
  }

  if (event.code === 'Space' && !state.sel) {
    event.preventDefault();
    saveWholeDisplay();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    state.shapes.pop();
    renderInk();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
    if (state.sel) {
      event.preventDefault();
      copyImage();
    }
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    if (state.sel) {
      event.preventDefault();
      saveImageAs();
    }
    return;
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && state.sel) {
    event.preventDefault();
    discardSelection();
  }
}

/* ---------------- экспорт ---------------- */

async function composeDataURL(useShapes = true) {
  const sel = state.sel;
  if (!sel) return null;
  const sx = scaleX();
  const sy = scaleY();
  const outW = Math.max(1, Math.round(sel.w * sx));
  const outH = Math.max(1, Math.round(sel.h * sy));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');

  if (state.image) {
    ctx.drawImage(state.image, sel.x * sx, sel.y * sy, sel.w * sx, sel.h * sy, 0, 0, outW, outH);
  } else {
    ctx.fillStyle = '#101422';
    ctx.fillRect(0, 0, outW, outH);
  }

  if (useShapes && state.shapes.length) {
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    drawShapes(ctx, state.shapes);
  }

  return canvas.toDataURL('image/png');
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => ui.toast.classList.remove('visible'), 2600);
}

async function saveImage() {
  if (state.busy || !state.sel) return;
  state.busy = true;
  try {
    const dataURL = await composeDataURL();
    const result = await api.save(dataURL);
    if (!result || !result.ok) {
      state.busy = false;
      showToast((result && result.error) || 'Не удалось сохранить скриншот');
    }
  } catch (error) {
    state.busy = false;
    showToast(error.message);
  }
}

async function saveImageAs() {
  if (state.busy || !state.sel) return;
  state.busy = true;
  try {
    const dataURL = await composeDataURL();
    const result = await api.saveAs(dataURL);
    if (!result || !result.ok) {
      state.busy = false;
      showToast((result && result.error) || 'Не удалось сохранить скриншот');
    } else if (result.canceled) {
      state.busy = false;
    }
  } catch (error) {
    state.busy = false;
    showToast(error.message);
  }
}

async function copyImage() {
  if (state.busy || !state.sel) return;
  state.busy = true;
  try {
    const dataURL = await composeDataURL();
    const result = await api.copy(dataURL);
    if (!result || !result.ok) {
      state.busy = false;
      showToast((result && result.error) || 'Не удалось скопировать');
    }
  } catch (error) {
    state.busy = false;
    showToast(error.message);
  }
}

function saveWholeDisplay() {
  if (state.busy) return;
  const previous = state.sel;
  const previousShapes = state.shapes;
  state.sel = { x: 0, y: 0, w: viewWidth(), h: viewHeight() };
  state.shapes = [];
  state.busy = true;
  composeDataURL(false)
    .then((dataURL) => api.save(dataURL))
    .then((result) => {
      if (!result || !result.ok) {
        state.busy = false;
        state.sel = previous;
        state.shapes = previousShapes;
        layout();
        showToast((result && result.error) || 'Не удалось сохранить скриншот');
      }
    })
    .catch((error) => {
      state.busy = false;
      state.sel = previous;
      state.shapes = previousShapes;
      layout();
      showToast(error.message);
    });
}

/* ---------------- запуск ---------------- */

async function loadImage(dataURL) {
  return new Promise((resolve) => {
    if (!dataURL) return resolve(null);
    const img = new Image();
    img.onload = () => {
      state.image = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}

async function init() {
  const data = await api.init();
  if (!data || !data.display) {
    // Если данные не пришли — закрываемся, чтобы не блокировать экран.
    api.cancel();
    return;
  }

  state.display = data.display;
  state.displays = data.displays || [];
  state.mode = data.mode === 'window' ? 'window' : 'region';
  state.active = Boolean(data.active);
  state.autoSave = Boolean(data.settings && data.settings.autoSave);
  state.dpr = window.devicePixelRatio || 1;
  state.lineWidth = WIDTHS[1];

  if (data.image) ui.shot.style.backgroundImage = `url("${data.image}")`;
  await loadImage(data.image);

  document.body.classList.toggle('passive', !state.active);
  layout();
  buildToolbar();

  if (state.mode === 'window') loadWindows();

  api.onDeactivate(() => deactivate());

  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('resize', layout);
}

init();
