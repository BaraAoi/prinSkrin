'use strict';

/**
 * Интеграционный тест main-процесса: захват экрана, оверлеи, сохранение.
 * Electron полностью заглушён.
 */
const Module = require('module');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');

const ROOT = require('path').resolve(__dirname, '..');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'prinskrin-ud-'));
const pictures = fs.mkdtempSync(path.join(os.tmpdir(), 'prinskrin-p-'));
const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prinskrin-s-'));

let failures = 0;
function assert(condition, message) {
  if (condition) console.log(`  ok   ${message}`);
  else {
    failures += 1;
    console.error(`  FAIL ${message}`);
  }
}

/* ------------------------- моки electron ------------------------- */

let winIdSeq = 0;
const allWindows = [];

class FakeWebContents extends EventEmitter {
  constructor(win) {
    super();
    this.id = ++winIdSeq + 1000;
    this.win = win;
    this.sent = [];
  }
  send(channel, payload) {
    this.sent.push([channel, payload]);
  }
  on() {}
}

class FakeBrowserWindow extends EventEmitter {
  constructor(options = {}) {
    super();
    this.id = ++winIdSeq;
    this.options = options;
    this.webContents = new FakeWebContents(this);
    this.destroyed = false;
    this.shown = false;
    this.alwaysOnTop = null;
    this.bounds = { x: options.x, y: options.y, width: options.width, height: options.height };
    allWindows.push(this);
  }
  static fromWebContents(contents) {
    return allWindows.find((win) => win.webContents === contents) || null;
  }
  static getAllWindows() {
    return allWindows.filter((win) => !win.destroyed);
  }
  loadFile() {
    return Promise.resolve();
  }
  isDestroyed() {
    return this.destroyed;
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit('closed');
  }
  show() {
    this.shown = true;
  }
  showInactive() {
    this.shown = true;
  }
  focus() {}
  moveTop() {}
  setAlwaysOnTop(value, level) {
    this.alwaysOnTop = { value, level };
  }
  setMenu() {}
  setSkipTaskbar() {}
  setVisibleOnAllWorkspaces() {}
  isMinimized() {
    return false;
  }
}

const displays = [
  { id: 7, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, size: { width: 1920, height: 1080 }, scaleFactor: 1, rotation: 0, internal: false },
  { id: 9, bounds: { x: 1920, y: 0, width: 1280, height: 1024 }, size: { width: 1280, height: 1024 }, scaleFactor: 1, rotation: 0, internal: false },
];

const screenMock = {
  getAllDisplays: () => displays,
  getPrimaryDisplay: () => displays[0],
  getCursorScreenPoint: () => ({ x: 100, y: 100 }),
  getDisplayNearestPoint: () => displays[0],
  getDisplayMatching: () => displays[0],
};

const thumbnails = new Map(
  displays.map((display) => [
    String(display.id),
    {
      toDataURL: () => `data:image/png;base64,SHOT-${display.id}`,
      isEmpty: () => false,
      toPNG: () => Buffer.from(`SHOT-PNG-${display.id}`),
      toJPEG: () => Buffer.from(`SHOT-JPG-${display.id}`),
    },
  ]),
);

const desktopCapturerMock = {
  getSources: async () => [
    { display_id: '7', thumbnail: thumbnails.get('7') },
    { display_id: '9', thumbnail: thumbnails.get('9') },
  ],
};

const ipcHandlers = new Map();
const ipcListeners = new Map();
const ipcMainMock = {
  handle: (channel, fn) => ipcHandlers.set(channel, fn),
  on: (channel, fn) => ipcListeners.set(channel, fn),
  removeHandler: (channel) => ipcHandlers.delete(channel),
};

let savedBuffers = [];
const fakeElectron = {
  app: {
    getPath: (name) => (name === 'pictures' ? pictures : userData),
    getName: () => 'prinSkrin',
    getVersion: () => '1.0.0',
  },
  BrowserWindow: FakeBrowserWindow,
  desktopCapturer: desktopCapturerMock,
  screen: screenMock,
  ipcMain: ipcMainMock,
  nativeImage: {
    createFromDataURL: () => ({
      isEmpty: () => false,
      toPNG: () => {
        const buffer = Buffer.from('PNG-SAVED');
        savedBuffers.push(buffer);
        return buffer;
      },
      toJPEG: () => {
        const buffer = Buffer.from('JPG-SAVED');
        savedBuffers.push(buffer);
        return buffer;
      },
    }),
  },
  clipboard: { writeImage: () => {} },
  dialog: {
    showSaveDialog: async () => ({ canceled: true }),
    showOpenDialog: async () => ({ canceled: true }),
  },
  shell: { showItemInFolder: () => {}, openPath: async () => '' },
  Notification: class {
    constructor(options) {
      this.options = options;
    }
    on() {}
    show() {}
    static isSupported() {
      return true;
    }
  },
};

const originalLoad = Module._load;
Module._load = function patched(request, parent, isMain) {
  if (request === 'electron') return fakeElectron;
  return originalLoad.call(this, request, parent, isMain);
};

const store = require(path.join(ROOT, 'src/main/store.js'));
const capture = require(path.join(ROOT, 'src/main/capture.js'));

async function invoke(channel, sender, ...args) {
  const handler = ipcHandlers.get(channel);
  if (!handler) throw new Error(`нет обработчика ${channel}`);
  return handler({ sender }, ...args);
}

async function main() {
  store.patch({
    saveDir,
    format: 'png',
    defaultMode: 'region',
    monitorId: 'cursor',
    copyToClipboard: false,
    notifications: false,
    fileNamePattern: 'shot-{yyyy}{MM}{dd}-{HH}{mm}{ss}-{counter}',
  });

  capture.registerIpc();

  console.log('\n=== каталог дисплеев ===');
  const catalog = capture.displayCatalog();
  assert(catalog.length === 2, 'найдено 2 дисплея');
  assert(catalog[0].label === 'Экран 1' && catalog[1].label === 'Экран 2', 'дисплеи подписаны по порядку');
  assert(catalog[0].bounds.width === 1920, 'границы дисплея переданы');

  console.log('\n=== режим «Выделение» (оверлей) ===');
  allWindows.length = 0;
  const started = await capture.startCapture();
  assert(started.ok === true, 'захват стартовал');
  assert(capture.overlaysOpen() === true, 'сессия оверлея активна');
  assert(allWindows.length === 2, 'создан оверлей на каждый монитор');
  assert(allWindows[0].bounds.width === 1920 && allWindows[1].bounds.x === 1920, 'оверлеи накрывают свои дисплеи');
  assert(allWindows[0].alwaysOnTop && allWindows[0].alwaysOnTop.value === true, 'оверлей поверх всех окон');
  assert(allWindows[0].shown === true, 'оверлеи показаны');

  const win = allWindows[1];
  const init = await invoke('overlay:init', win.webContents);
  assert(init && init.display.id === '9', 'init вернул нужный дисплей');
  assert(init.image.startsWith('data:image/png'), 'в init есть снимок экрана');
  assert(init.active === false, 'второй монитор неактивен');
  assert(init.displays.length === 2, 'в init передан список всех дисплеев');

  const activeInit = await invoke('overlay:init', allWindows[0].webContents);
  assert(activeInit.active === true, 'первый монитор активен');

  // сигнал готовности
  const readyListener = ipcListeners.get('overlay:ready');
  assert(typeof readyListener === 'function', 'обработчик overlay:ready зарегистрирован');
  readyListener({ sender: allWindows[0].webContents });
  readyListener({ sender: allWindows[1].webContents });

  // claim деактивирует остальные окна
  await invoke('overlay:claim', allWindows[0].webContents);
  assert(win.webContents.sent.some(([channel]) => channel === 'overlay:deactivate'), 'второй монитор получил deactivate');

  // сохранение из оверлея
  const saveResult = await invoke('overlay:save', allWindows[0].webContents, 'data:image/png;base64,AAAA');
  assert(saveResult.ok === true, 'сохранение из оверлея успешно');
  assert(fs.existsSync(saveResult.filePath), 'файл скриншота создан');
  assert(fs.readFileSync(saveResult.filePath).toString() === 'PNG-SAVED', 'записан PNG');
  assert(capture.overlaysOpen() === false, 'после сохранения оверлеи закрыты');
  assert(allWindows.every((w) => w.destroyed), 'все окна оверлея уничтожены');

  console.log('\n=== мгновенный снимок всего экрана ===');
  allWindows.length = 0;
  store.patch({ defaultMode: 'screen' });
  const instant = await capture.startCapture();
  assert(instant.ok === true, `снимок без оверлея выполнен${instant.error ? ` (${instant.error})` : ''}`);
  assert(instant.mode === 'screen', 'режим screen');
  assert(fs.existsSync(instant.filePath), 'файл создан');
  assert(allWindows.length === 0, 'окна оверлея не создавались');

  console.log('\n=== снимок выбранного дисплея ===');
  store.patch({ defaultMode: 'monitor', monitorId: '9' });
  const monitorShot = await capture.startCapture();
  assert(monitorShot.ok === true, 'снимок дисплея выполнен');
  assert(fs.existsSync(monitorShot.filePath), 'файл дисплея создан');

  console.log('\n=== выбор дисплея кнопкой в оверлее ===');
  allWindows.length = 0;
  store.patch({ defaultMode: 'region' });
  await capture.startCapture();
  const shot = await invoke('overlay:capture-display', allWindows[0].webContents, '2');
  assert(shot.ok === true, 'кнопка «Экран 2» сохранила снимок');
  assert(capture.overlaysOpen() === false, 'оверлей закрылся');

  console.log('\n=== отмена ===');
  allWindows.length = 0;
  await capture.startCapture();
  const cancelResult = await invoke('overlay:cancel', allWindows[0].webContents);
  assert(cancelResult === true, 'cancel вернул true');
  assert(capture.overlaysOpen() === false, 'оверлей закрыт по Esc');
  assert(allWindows.every((w) => w.destroyed), 'окна уничтожены');

  console.log('\n=== «Сохранить как…» (диалог отменён) ===');
  allWindows.length = 0;
  await capture.startCapture();
  const saveAsResult = await invoke('overlay:save-as', allWindows[0].webContents, 'data:image/png;base64,AAAA');
  assert(saveAsResult.ok === true && saveAsResult.canceled === true, 'отмена диалога не закрывает оверлей');
  assert(capture.overlaysOpen() === true, 'оверлей остался открытым');
  assert(allWindows[0].alwaysOnTop.value === true, 'режим «поверх всех» восстановлен');
  await invoke('overlay:cancel', allWindows[0].webContents);

  console.log('\n=== копирование в буфер ===');
  allWindows.length = 0;
  await capture.startCapture();
  const copyResult = await invoke('overlay:copy', allWindows[0].webContents, 'data:image/png;base64,AAAA');
  assert(copyResult.ok === true, 'копирование выполнено');
  assert(capture.overlaysOpen() === false, 'после копирования оверлей закрыт');

  console.log(`\nИтого проблем: ${failures}`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
