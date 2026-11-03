'use strict';

const api = window.prinskrin;

const ICONS = {
  region:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><path d="M8.5 8.5h7v7h-7z" stroke-dasharray="2 2"/></svg>',
  screen:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  window:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="14" height="11" rx="2"/><path d="M7 2.5h12.5A1.5 1.5 0 0 1 21 4v11"/></svg>',
  monitor:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="12" height="9" rx="1.6"/><rect x="12" y="11" width="9.5" height="7" rx="1.6"/><path d="M6 20h5"/></svg>',
};

const KEY_NAMES = {
  PrintScreen: 'PrintScreen',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ' ': 'Space',
  Spacebar: 'Space',
  Escape: null,
  Enter: 'Return',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec',
  NumpadEnter: 'Enter',
};

const state = {
  data: null,
  draft: null,
  capturingHotkey: false,
  dirty: false,
};

const el = (id) => document.getElementById(id);

function prettyHotkey(accelerator) {
  if (!accelerator) return 'не назначена';
  return String(accelerator)
    .split('+')
    .map((part) => {
      switch (part) {
        case 'Control':
        case 'Ctrl':
          return 'Ctrl';
        case 'CommandOrControl':
          return 'Ctrl';
        case 'PrintScreen':
          return 'PrtSc';
        case 'Super':
        case 'Meta':
          return 'Win';
        case 'Return':
          return 'Enter';
        default:
          return part;
      }
    })
    .join(' + ');
}

function pad(value, length = 2) {
  return String(value).padStart(length, '0');
}

function previewName(pattern, format) {
  const now = new Date();
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const name = String(pattern || '')
    .replace(/\{counter\}/gi, '1')
    .replace(/\{yyyy\}/gi, String(now.getFullYear()))
    .replace(/\{yy\}/gi, String(now.getFullYear()).slice(-2))
    .replace(/\{MM\}/g, pad(now.getMonth() + 1))
    .replace(/\{dd\}/gi, pad(now.getDate()))
    .replace(/\{HH\}/g, pad(now.getHours()))
    .replace(/\{mm\}/g, pad(now.getMinutes()))
    .replace(/\{ss\}/gi, pad(now.getSeconds()))
    .replace(/\{ms\}/gi, pad(now.getMilliseconds(), 3))
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .trim();
  return `${name || 'prinSkrin'}.${ext}`;
}

function icon(name, target) {
  if (!target) return;
  target.innerHTML = ICONS[name] || '';
}

function setStatus(text, kind) {
  const node = el('status');
  node.textContent = text;
  node.className = `status${kind ? ` ${kind}` : ''}`;
}

function setDirty(value) {
  state.dirty = value;
  if (value) setStatus('Есть несохранённые изменения');
}

function fillForm(data) {
  state.data = data;
  const settings = data.settings;
  state.draft = { ...settings };

  el('appVersion').textContent = `версия ${data.version}`;

  el('saveDir').value = settings.saveDir;
  el('fileNamePattern').value = settings.fileNamePattern;
  el('jpegQuality').value = settings.jpegQuality;
  el('jpegQualityValue').textContent = settings.jpegQuality;
  el('autoSave').checked = settings.autoSave;
  el('copyToClipboard').checked = settings.copyToClipboard;
  el('notifications').checked = settings.notifications;
  el('launchAtLogin').checked = settings.launchAtLogin;

  selectFormat(settings.format);
  selectMode(settings.defaultMode);
  renderMonitors(data.displays, settings.monitorId);
  el('hotkeyInput').value = prettyHotkey(settings.hotkey);
  updatePreview();
  updateHotkeyHint(data.hotkey);

  for (const button of document.querySelectorAll('.mode-icon')) {
    icon(button.dataset.icon, button);
  }

  if (!data.settings.saveDir) {
    setStatus('Выберите папку для скриншотов', 'error');
  }
}

function updateHotkeyHint(hotkey) {
  const node = el('hotkeyHint');
  if (!hotkey) {
    node.className = 'hint';
    node.textContent = 'Нажмите на поле и введите сочетание. Esc — отмена.';
    return;
  }
  if (hotkey.registered) {
    node.className = 'hint ok';
    node.textContent = `Клавиша активна: ${prettyHotkey(hotkey.accelerator)}`;
  } else {
    node.className = 'hint error';
    node.textContent = `Клавиша не назначена: ${hotkey.error || 'ошибка регистрации'}. Выберите другую.`;
  }
}

function selectFormat(format) {
  state.draft.format = format;
  for (const button of document.querySelectorAll('#formatGroup button')) {
    button.classList.toggle('active', button.dataset.format === format);
  }
  el('qualityWrap').classList.toggle('disabled', format !== 'jpeg');
  updatePreview();
}

function selectMode(mode) {
  state.draft.defaultMode = mode;
  for (const button of document.querySelectorAll('#modeGroup .mode')) {
    button.classList.toggle('active', button.dataset.mode === mode);
  }
}

function renderMonitors(displays, selected) {
  const select = el('monitorSelect');
  select.innerHTML = '';
  const cursorOption = document.createElement('option');
  cursorOption.value = 'cursor';
  cursorOption.textContent = 'Экран под курсором';
  select.appendChild(cursorOption);

  for (const display of displays) {
    const option = document.createElement('option');
    option.value = display.id;
    option.textContent = `${display.label} · ${display.size.width}×${display.size.height}${display.primary ? ' (основной)' : ''}`;
    select.appendChild(option);
  }

  const known = displays.some((display) => display.id === String(selected));
  select.value = known ? String(selected) : 'cursor';
  state.draft.monitorId = select.value;
}

function updatePreview() {
  el('namePreview').textContent = previewName(el('fileNamePattern').value, state.draft.format);
}

function collect() {
  return {
    saveDir: el('saveDir').value.trim(),
    fileNamePattern: el('fileNamePattern').value.trim(),
    format: state.draft.format,
    jpegQuality: Number(el('jpegQuality').value),
    defaultMode: state.draft.defaultMode,
    monitorId: el('monitorSelect').value,
    hotkey: state.data.settings.hotkey,
    autoSave: el('autoSave').checked,
    copyToClipboard: el('copyToClipboard').checked,
    notifications: el('notifications').checked,
    launchAtLogin: el('launchAtLogin').checked,
  };
}

async function save() {
  const patch = collect();
  if (!patch.saveDir) {
    setStatus('Укажите папку для сохранения', 'error');
    return;
  }
  el('saveBtn').disabled = true;
  try {
    const result = await api.update(patch);
    if (result && result.settings) {
      state.data.settings = result.settings;
      if (result.hotkey) updateHotkeyHint(result.hotkey);
    }
    if (result && result.ok === false) {
      setStatus(result.error || 'Не удалось сохранить часть настроек', 'error');
    } else {
      state.dirty = false;
      setStatus('Настройки сохранены ✓', 'ok');
    }
  } catch (error) {
    setStatus(`Ошибка: ${error.message}`, 'error');
  } finally {
    el('saveBtn').disabled = false;
  }
}

function keyToAccelerator(event) {
  const parts = [];
  if (event.ctrlKey) parts.push('Control');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Super');

  const raw = event.key;
  let key = null;

  if (Object.prototype.hasOwnProperty.call(KEY_NAMES, raw)) {
    key = KEY_NAMES[raw];
  } else if (/^F\d{1,2}$/.test(raw)) {
    key = raw;
  } else if (/^[a-zA-Z]$/.test(raw)) {
    key = raw.toUpperCase();
  } else if (/^\d$/.test(raw)) {
    key = raw;
  } else if (/^Numpad\d$/.test(event.code)) {
    key = event.code;
  }

  if (!key) return null;

  const needsModifier = key.length === 1 || key === 'Space';
  if (needsModifier && parts.length === 0) return { error: 'Добавьте Ctrl, Alt или Shift' };

  parts.push(key);
  return { accelerator: parts.join('+') };
}

function startHotkeyCapture() {
  if (state.capturingHotkey) return;
  state.capturingHotkey = true;
  const input = el('hotkeyInput');
  input.classList.add('capturing');
  input.value = 'Нажмите сочетание…';
  el('hotkeyHint').className = 'hint';
  el('hotkeyHint').textContent = 'Ожидание клавиш. Esc — отмена, Backspace — очистить.';
}

function stopHotkeyCapture() {
  if (!state.capturingHotkey) return;
  state.capturingHotkey = false;
  const input = el('hotkeyInput');
  input.classList.remove('capturing');
  input.value = prettyHotkey(state.data.settings.hotkey);
  updateHotkeyHint(state.data.hotkey);
}

async function applyHotkey(accelerator) {
  state.capturingHotkey = false;
  el('hotkeyInput').classList.remove('capturing');
  if (!accelerator) {
    el('hotkeyInput').value = prettyHotkey(state.data.settings.hotkey);
    return;
  }
  if (accelerator === state.data.settings.hotkey) {
    el('hotkeyInput').value = prettyHotkey(accelerator);
    updateHotkeyHint(state.data.hotkey);
    return;
  }

  const result = await api.update({ ...collect(), hotkey: accelerator });
  if (result && result.settings) state.data.settings = result.settings;
  if (result && result.hotkey) {
    state.data.hotkey = result.hotkey;
    updateHotkeyHint(result.hotkey);
  }
  el('hotkeyInput').value = prettyHotkey(state.data.settings.hotkey);
  if (result && result.ok === false) {
    setStatus(result.error || 'Не удалось назначить клавишу', 'error');
  } else {
    state.dirty = false;
    setStatus(`Горячая клавиша: ${prettyHotkey(accelerator)}`, 'ok');
  }
}

function bindEvents() {
  el('saveDir').addEventListener('input', () => setDirty(true));
  el('fileNamePattern').addEventListener('input', () => {
    updatePreview();
    setDirty(true);
  });
  el('saveDir').addEventListener('change', () => setDirty(true));

  el('browseBtn').addEventListener('click', async () => {
    const result = await api.browse();
    if (result && result.ok) {
      el('saveDir').value = result.path;
      setDirty(true);
    }
  });

  el('openFolderBtn').addEventListener('click', () => api.openFolder());

  el('formatGroup').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-format]');
    if (!button) return;
    selectFormat(button.dataset.format);
    setDirty(true);
  });

  el('jpegQuality').addEventListener('input', () => {
    el('jpegQualityValue').textContent = el('jpegQuality').value;
    setDirty(true);
  });

  el('modeGroup').addEventListener('click', (event) => {
    const button = event.target.closest('.mode');
    if (!button) return;
    selectMode(button.dataset.mode);
    setDirty(true);
  });

  el('monitorSelect').addEventListener('change', () => setDirty(true));
  el('autoSave').addEventListener('change', () => setDirty(true));
  el('copyToClipboard').addEventListener('change', () => setDirty(true));
  el('notifications').addEventListener('change', () => setDirty(true));
  el('launchAtLogin').addEventListener('change', () => setDirty(true));

  el('hotkeyPresets').addEventListener('click', (event) => {
    const button = event.target.closest('.chip');
    if (!button) return;
    applyHotkey(button.dataset.hotkey);
  });

  el('hotkeyReset').addEventListener('click', () => applyHotkey('PrintScreen'));
  el('hotkeyInput').addEventListener('focus', startHotkeyCapture);
  el('hotkeyInput').addEventListener('click', startHotkeyCapture);

  window.addEventListener('keydown', (event) => {
    if (!state.capturingHotkey) {
      if (document.activeElement === el('hotkeyInput') && event.key !== 'Escape') startHotkeyCapture();
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      stopHotkeyCapture();
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      stopHotkeyCapture();
      setStatus('Для захвата нужна хотя бы одна клавиша — выберите сочетание', 'error');
      return;
    }
    const result = keyToAccelerator(event);
    if (!result) return;
    if (result.error) {
      el('hotkeyHint').className = 'hint error';
      el('hotkeyHint').textContent = result.error;
      return;
    }
    applyHotkey(result.accelerator);
  });

  el('saveBtn').addEventListener('click', save);
  el('resetBtn').addEventListener('click', async () => {
    const result = await api.reset();
    if (result && result.settings) {
      fillForm({ ...state.data, settings: result.settings, hotkey: result.hotkey || state.data.hotkey });
      setStatus('Настройки сброшены', 'ok');
    }
  });

  el('testBtn').addEventListener('click', async () => {
    setStatus('Захват через секунду — приложение скроется…', 'ok');
    await api.capture();
    setStatus('Захват выполнен', 'ok');
  });

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
    }
  });

  api.onChange((payload) => {
    if (!state || !state.data) return;
    if (payload && payload.hotkey && !state.capturingHotkey) {
      state.data.hotkey = payload.hotkey;
      updateHotkeyHint(payload.hotkey);
    }
    if (payload && payload.settings && state.dirty) return;
    if (payload && payload.settings) {
      state.data.settings = payload.settings;
      el('hotkeyInput').value = prettyHotkey(payload.settings.hotkey);
    }
  });
}

async function main() {
  const data = await api.get();
  fillForm(data);
  bindEvents();
  if (data.hotkey && !data.hotkey.registered) {
    setStatus('Выберите другую горячую клавишу — текущая занята', 'error');
  }
}

main();
