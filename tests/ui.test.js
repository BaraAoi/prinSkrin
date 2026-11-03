'use strict';

/**
 * Smoke-тест рендереров без Electron: jsdom + заглушки canvas и IPC.
 * Запуск: node tests/ui.test.js
 */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const root = require('path').resolve(__dirname, '..');
let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ok   ${message}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${message}`);
  }
}

function fakeContext() {
  const noop = () => {};
  return {
    setTransform: noop,
    clearRect: noop,
    drawImage: noop,
    fillRect: noop,
    strokeRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    stroke: noop,
    fill: noop,
    fillText: noop,
    save: noop,
    restore: noop,
    measureText: () => ({ width: 10 }),
  };
}

function makeDom(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/<script[^>]*><\/script>/g, '');
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    failures += 1;
    console.error('  FAIL jsdomError:', error.message);
  });
  virtualConsole.on('error', (...args) => console.error('  [renderer error]', ...args));
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: `file://${path.dirname(htmlPath)}/index.html`,
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  window.HTMLCanvasElement.prototype.getContext = () => fakeContext();
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AAAA';
  Object.defineProperty(window.HTMLElement.prototype, "scrollHeight", { configurable: true, get() { return 40; } });
  return dom;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
async function testSettings() {
  console.log('\n=== окно настроек ===');
  const dom = makeDom(path.join(root, 'src/renderer/settings/settings.html'));
  const { window } = dom;
  const calls = [];

  const settings = {
    saveDir: 'C:\\Users\\me\\Pictures\\prinSkrin',
    fileNamePattern: 'prinSkrin {yyyy}-{MM}-{dd} {HH}-{mm}-{ss}',
    format: 'png',
    jpegQuality: 92,
    defaultMode: 'region',
    monitorId: 'cursor',
    hotkey: 'PrintScreen',
    autoSave: false,
    copyToClipboard: true,
    notifications: true,
    launchAtLogin: false,
  };

  window.prinskrin = {
    get: async () => ({
      settings,
      displays: [
        { id: '1', label: 'Экран 1', size: { width: 1920, height: 1080 }, primary: true },
        { id: '2', label: 'Экран 2', size: { width: 1280, height: 1024 }, primary: false },
      ],
      hotkey: { registered: true, accelerator: 'PrintScreen' },
      version: '1.0.0',
      platform: 'win32',
    }),
    update: async (patch) => {
      calls.push(['update', patch]);
      const merged = { ...settings, ...patch };
      return { ok: true, settings: merged, hotkey: { registered: true, accelerator: patch.hotkey || settings.hotkey } };
    },
    reset: async () => ({ ok: true, settings, hotkey: { registered: true, accelerator: 'PrintScreen' } }),
    browse: async () => ({ ok: true, path: 'D:\\Screens' }),
    openFolder: async () => ({ ok: true }),
    capture: async () => ({ ok: true }),
    close: async () => ({ ok: true }),
    onChange: () => {},
  };

  window.eval(fs.readFileSync(path.join(root, 'src/renderer/settings/settings.js'), 'utf8'));
  await sleep(60);
  const doc = window.document;

  assert(doc.getElementById('saveDir').value.endsWith('prinSkrin'), 'папка заполнена');
  assert(doc.getElementById('namePreview').textContent.startsWith('prinSkrin '), 'пример имени файла построен');
  assert(doc.querySelectorAll('#monitorSelect option').length === 3, 'в списке мониторов 3 пункта');
  assert(doc.querySelector('.mode[data-mode="region"]').classList.contains('active'), 'по умолчанию активен режим «Выделение»');

  doc.querySelector('#formatGroup button[data-format="jpeg"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert(doc.querySelector('#formatGroup button[data-format="jpeg"]').classList.contains('active'), 'переключение на JPEG работает');
  assert(doc.getElementById('namePreview').textContent.endsWith('.jpg'), 'пример имени стал .jpg');

  doc.querySelector('.mode[data-mode="window"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert(doc.querySelector('.mode[data-mode="window"]').classList.contains('active'), 'выбор режима «Окно» работает');

  doc.getElementById('browseBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(30);
  assert(doc.getElementById('saveDir').value === 'D:\\Screens', 'кнопка «Обзор…» подставляет папку');

  doc.querySelector('.chip[data-hotkey="F8"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(40);
  const hotkeyCall = calls.find((call) => call[0] === 'update' && call[1].hotkey === 'F8');
  assert(Boolean(hotkeyCall), 'пресет горячей клавиши F8 применяется');
  assert(doc.getElementById('hotkeyInput').value === 'F8', 'поле горячей клавиши показывает F8');

  doc.getElementById('saveBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(40);
  const saved = calls.filter((call) => call[0] === 'update').pop();
  assert(Boolean(saved), 'кнопка «Сохранить» вызывает update');
  assert(saved && saved[1].format === 'jpeg', 'формат JPEG попал в сохранение');
  assert(saved && saved[1].defaultMode === 'window', 'режим «Окно» попал в сохранение');
  assert(saved && saved[1].monitorId === 'cursor', 'значение дисплея попал в сохранение');
  assert(doc.getElementById('status').textContent.includes('сохранены'), 'статус сообщает об успехе');

  dom.window.close();
}

/* ------------------------------------------------------------------ */
async function testOverlay() {
  console.log('\n=== оверлей ===');
  const dom = makeDom(path.join(root, 'src/renderer/overlay/overlay.html'));
  const { window } = dom;
  const calls = [];

  window.innerWidth = 1280;
  window.innerHeight = 800;

  window.prinskrin = {
    init: async () => ({
      display: {
        id: '1',
        label: 'Экран 1',
        bounds: { x: 0, y: 0, width: 1280, height: 800 },
        size: { width: 1280, height: 800 },
        scaleFactor: 1,
        primary: true,
      },
      displays: [
        { id: '1', label: 'Экран 1', bounds: { x: 0, y: 0, width: 1280, height: 800 }, size: { width: 1280, height: 800 }, scaleFactor: 1 },
        { id: '2', label: 'Экран 2', bounds: { x: 1280, y: 0, width: 1024, height: 768 }, size: { width: 1024, height: 768 }, scaleFactor: 1 },
      ],
      image: '',
      mode: 'region',
      active: true,
      settings: { autoSave: false, copyToClipboard: true, format: 'png' },
    }),
    windows: async () => {
      calls.push(['windows']);
      return [
        { hwnd: '1', x: 100, y: 80, width: 600, height: 400, pid: 123, title: 'Блокнот' },
        { hwnd: '2', x: 500, y: 300, width: 500, height: 300, pid: 124, title: 'Калькулятор' },
      ];
    },
    save: async (dataURL) => {
      calls.push(['save', dataURL]);
      return { ok: true, filePath: 'C:\\shot.png' };
    },
    saveAs: async (dataURL) => {
      calls.push(['saveAs', dataURL]);
      return { ok: true, filePath: 'C:\\shot2.png' };
    },
    copy: async (dataURL) => {
      calls.push(['copy', dataURL]);
      return { ok: true };
    },
    captureDisplay: async (id) => {
      calls.push(['captureDisplay', id]);
      return { ok: true };
    },
    openSettings: async () => {
      calls.push(['openSettings']);
      return true;
    },
    cancel: async () => {
      calls.push(['cancel']);
      return true;
    },
    claim: async () => true,
    ready: () => calls.push(['ready']),
    onDeactivate: () => {},
  };

  window.eval(fs.readFileSync(path.join(root, 'src/renderer/overlay/overlay.js'), 'utf8'));
  await sleep(80);
  const doc = window.document;
  const toolbar = doc.getElementById('toolbar');

  assert(calls.some((call) => call[0] === 'ready'), 'рендерер сигналит о готовности');
  assert(toolbar.style.display !== 'none', 'панель отображается');
  assert(toolbar.textContent.includes('Выделение'), 'есть кнопка «Выделение»');
  assert(toolbar.textContent.includes('Весь экран'), 'есть кнопка «Весь экран»');
  assert(toolbar.textContent.includes('Окно'), 'есть кнопка «Окно»');
  assert(toolbar.textContent.includes('Экран 1') && toolbar.textContent.includes('Экран 2'), 'есть кнопки дисплеев (2 монитора)');

  // выбираем второй дисплей
  const monitorButton = [...toolbar.querySelectorAll('button')].find((button) => button.textContent.includes('Экран 2'));
  monitorButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(30);
  assert(calls.some((call) => call[0] === 'captureDisplay' && call[1] === '2'), 'клик по «Экран 2» просит снимок второго дисплея');

  // выделение мышью
  const pointer = (type, x, y, extra = {}) =>
    doc.body.dispatchEvent(
      new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, ...extra }),
    );

  pointer('pointerdown', 200, 150);
  pointer('pointermove', 700, 500);
  pointer('pointerup', 700, 500);
  await sleep(30);

  const sel = doc.getElementById('sel');
  assert(sel.classList.contains('visible'), 'рамка выделения появилась');
  assert(sel.style.width === '500px' && sel.style.height === '350px', `рамка 500×350 (получено ${sel.style.width}×${sel.style.height})`);
  assert(doc.getElementById('sizeBadge').textContent === '500 × 350', 'подпись размера 500 × 350');
  assert(toolbar.textContent.includes('Сохранить'), 'появились инструменты редактора');
  assert(toolbar.textContent.includes('Копировать'), 'есть кнопка «Копировать»');

  // рисуем карандашом
  const penButton = [...toolbar.querySelectorAll('button')].find((button) => button.title === 'Карандаш');
  penButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  pointer('pointerdown', 300, 200);
  pointer('pointermove', 420, 260);
  pointer('pointerup', 420, 260);
  await sleep(20);
  assert(true, 'рисование не падает');

  // сохранение
  const saveButton = [...toolbar.querySelectorAll('button')].find((button) => button.textContent.includes('Сохранить'));
  saveButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(50);
  const saved = calls.find((call) => call[0] === 'save');
  assert(Boolean(saved), 'кнопка «Сохранить» отправляет изображение');
  assert(saved && saved[1].startsWith('data:image/png'), 'изображение передаётся как PNG data URL');

  dom.window.close();
}

/* ------------------------------------------------------------------ */
async function testOverlayWindowMode() {
  console.log('\n=== оверлей: режим «Окно» ===');
  const dom = makeDom(path.join(root, 'src/renderer/overlay/overlay.html'));
  const { window } = dom;
  const calls = [];
  window.innerWidth = 1280;
  window.innerHeight = 800;

  window.prinskrin = {
    init: async () => ({
      display: { id: '1', label: 'Экран 1', bounds: { x: 0, y: 0, width: 1280, height: 800 }, size: { width: 1280, height: 800 }, scaleFactor: 2 },
      displays: [{ id: '1', label: 'Экран 1', bounds: { x: 0, y: 0, width: 1280, height: 800 }, size: { width: 1280, height: 800 }, scaleFactor: 2 }],
      image: '',
      mode: 'window',
      active: true,
      settings: { autoSave: false },
    }),
    windows: async () => [
      { hwnd: '1', x: 200, y: 200, width: 1200, height: 800, pid: 5, title: 'Блокнот' },
    ],
    save: async (dataURL) => {
      calls.push(['save', dataURL]);
      return { ok: true };
    },
    saveAs: async () => ({ ok: true }),
    copy: async () => ({ ok: true }),
    captureDisplay: async () => ({ ok: true }),
    openSettings: async () => true,
    cancel: async () => true,
    claim: async () => true,
    ready: () => {},
    onDeactivate: () => {},
  };

  window.eval(fs.readFileSync(path.join(root, 'src/renderer/overlay/overlay.js'), 'utf8'));
  await sleep(80);
  const doc = window.document;

  const pointer = (type, x, y) =>
    doc.body.dispatchEvent(new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));

  // окно 1200x800 при scale 2 => 600x400 DIP в точке (100,100)
  pointer('pointermove', 150, 150);
  await sleep(30);
  assert(doc.getElementById('winHighlight').classList.contains('visible'), 'окно под курсором подсвечивается');
  assert(doc.getElementById('winTitle').textContent === 'Блокнот', 'подпись окна «Блокнот»');

  pointer('pointerdown', 150, 150);
  await sleep(40);
  assert(doc.getElementById('sel').classList.contains('visible'), 'клик по окну создаёт выделение');
  assert(doc.getElementById('sel').style.width === '600px', `выделение 600 DIP по ширине (получено ${doc.getElementById('sel').style.width})`);

  dom.window.close();
}

(async () => {
  await testSettings();
  await testOverlay();
  await testOverlayWindowMode();
  console.log(`\nИтого проблем: ${failures}`);
  process.exit(failures ? 1 : 0);
})();
