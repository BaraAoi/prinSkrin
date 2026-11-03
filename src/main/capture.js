'use strict';

const { BrowserWindow, desktopCapturer, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const store = require('./store');
const saver = require('./saver');
const windowList = require('./windowList');

/** Активная сессия захвата */
let session = null;
/** winId -> displayId */
const overlayWindows = new Map();
/** displayId -> resolve() ожидания первой отрисовки */
const readyResolvers = new Map();
let lastError = null;

function displayCatalog() {
  const primary = screen.getPrimaryDisplay();
  const raw = screen.getAllDisplays().map((display) => ({
    id: String(display.id),
    bounds: { ...display.bounds },
    size: { ...display.size },
    scaleFactor: display.scaleFactor,
    primary: display.id === primary.id,
  }));

  raw.sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y);
  return raw.map((display, index) => ({ ...display, index, label: `Экран ${index + 1}` }));
}

async function collectShots(displays) {
  const maxWidth = Math.max(...displays.map((d) => Math.round(d.size.width * d.scaleFactor)), 8);
  const maxHeight = Math.max(...displays.map((d) => Math.round(d.size.height * d.scaleFactor)), 8);

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: maxWidth, height: maxHeight },
    fetchWindowIcons: false,
  });

  const byDisplay = new Map();
  for (const source of sources) {
    if (source.display_id && displays.some((d) => d.id === String(source.display_id))) {
      byDisplay.set(String(source.display_id), source.thumbnail);
    }
  }
  // Резервный путь: сопоставление по порядку
  sources.forEach((source, index) => {
    const display = displays[index];
    if (display && !byDisplay.has(display.id)) byDisplay.set(display.id, source.thumbnail);
  });
  return byDisplay;
}

function showError(message) {
  lastError = message;
  saver.notify('Не удалось сделать скриншот', message);
}

function closeOverlays() {
  const collection = session
    ? [...session.windows.values()]
    : BrowserWindow.getAllWindows().filter((win) => overlayWindows.has(win.id));

  session = null;
  overlayWindows.clear();

  for (const win of collection) {
    try {
      if (!win.isDestroyed()) win.destroy();
    } catch { /* ignore */ }
  }
}

function overlaysOpen() {
  return Boolean(session);
}

async function openOverlays({ displays, shots, mode, cursorId, settings }) {
  session = {
    displays,
    shots,
    mode,
    cursorId,
    windows: new Map(),
    startedAt: Date.now(),
  };

  const preload = path.join(__dirname, '..', 'preload', 'overlay.js');
  const overlayHtml = path.join(__dirname, '..', 'renderer', 'overlay', 'overlay.html');

  const loads = [];
  const paints = [];
  for (const display of displays) {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      show: false,
      roundedCorners: false,
      enableLargerThanScreen: true,
      acceptFirstMouse: true,
      focusable: true,
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
        spellcheck: false,
      },
    });

    win.setAlwaysOnTop(true, 'screen-saver');
    win.setMenu(null);
    win.setSkipTaskbar(true);

    overlayWindows.set(win.id, display.id);
    session.windows.set(display.id, win);
    win.on('closed', () => {
      overlayWindows.delete(win.id);
      if (session && [...session.windows.values()].every((w) => w.isDestroyed())) {
        session = null;
      }
    });
    win.webContents.on('render-process-gone', () => closeOverlays());

    loads.push(win.loadFile(overlayHtml));
    paints.push(
      new Promise((resolve) => {
        readyResolvers.set(display.id, resolve);
        setTimeout(resolve, 2000);
      }),
    );
  }

  await Promise.all(loads);
  if (!session) return { ok: false, reason: 'closed' };

  // Ждём, пока рендерер нарисует снимок экрана, чтобы не было мигания.
  await Promise.race([Promise.all(paints), new Promise((resolve) => setTimeout(resolve, 2200))]);
  readyResolvers.clear();

  if (!session) return { ok: false, reason: 'closed' };

  const active = session.windows.get(cursorId);
  for (const win of session.windows.values()) {
    if (win.isDestroyed()) continue;
    if (win === active) {
      win.show();
    } else {
      win.showInactive();
    }
  }
  if (active && !active.isDestroyed()) {
    active.focus();
    active.moveTop();
  }

  return { ok: true, mode };
}

/**
 * Главная точка входа: горячая клавиша, трей, кнопка в настройках.
 */
async function startCapture(forcedMode) {
  if (session) return { ok: false, reason: 'busy' };

  const settings = store.get();
  const mode = forcedMode || settings.defaultMode;
  const displays = displayCatalog();
  const cursorDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const cursorId = String(cursorDisplay.id);

  let shots;
  try {
    shots = await collectShots(displays);
  } catch (error) {
    showError(`desktopCapturer: ${error.message}`);
    return { ok: false, error: error.message };
  }

  if (!shots.size) {
    showError('Система не вернула изображение экрана.');
    return { ok: false, error: 'no sources' };
  }

  // Мгновенные режимы — без оверлея
  if (mode === 'screen' || mode === 'monitor') {
    let targetId = cursorId;
    if (mode === 'monitor' && settings.monitorId !== 'cursor') {
      const requested = displays.find((d) => d.id === String(settings.monitorId));
      if (requested) targetId = requested.id;
    }
    const image = shots.get(targetId) || shots.values().next().value;
    try {
      const filePath = saver.saveImage(image);
      return { ok: true, mode, filePath };
    } catch (error) {
      showError(error.message);
      return { ok: false, error: error.message };
    }
  }

  return openOverlays({ displays, shots, mode, cursorId, settings });
}

function getSessionForWindow(webContents) {
  const win = BrowserWindow.fromWebContents(webContents);
  if (!win) return null;
  const displayId = overlayWindows.get(win.id);
  if (!displayId || !session) return null;
  return { win, displayId, session };
}

function toDataURL(image) {
  try {
    return image.toDataURL();
  } catch {
    return '';
  }
}

function registerIpc() {
  ipcMain.handle('overlay:init', (event) => {
    const context = getSessionForWindow(event.sender);
    if (!context) return null;
    const { displayId, session: active } = context;
    const display = active.displays.find((d) => d.id === displayId);
    const image = active.shots.get(displayId);
    const settings = store.get();

    return {
      display,
      displays: active.displays,
      image: image ? toDataURL(image) : '',
      mode: active.mode,
      active: displayId === active.cursorId,
      settings: {
        autoSave: settings.autoSave,
        copyToClipboard: settings.copyToClipboard,
        format: settings.format,
      },
      platform: process.platform,
    };
  });

  ipcMain.on('overlay:ready', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const displayId = overlayWindows.get(win.id);
    if (!displayId) return;
    const resolve = readyResolvers.get(displayId);
    if (resolve) {
      readyResolvers.delete(displayId);
      resolve();
    }
  });

  ipcMain.handle('overlay:windows', (event) => {
    if (!getSessionForWindow(event.sender)) return [];
    return windowList.listWindows({ maxAge: 0 });
  });

  ipcMain.handle('overlay:claim', (event) => {
    const context = getSessionForWindow(event.sender);
    if (!context || !session) return false;
    for (const [id, win] of session.windows.entries()) {
      if (win.isDestroyed()) continue;
      if (win.webContents.id === event.sender.id) continue;
      win.webContents.send('overlay:deactivate', id);
    }
    return true;
  });

  ipcMain.handle('overlay:save', (event, dataURL) => {
    const context = getSessionForWindow(event.sender);
    if (!context) return { ok: false };
    try {
      const result = saver.saveDataURL(dataURL);
      closeOverlays();
      return { ok: true, filePath: result.filePath };
    } catch (error) {
      console.error('[prinSkrin] save:', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('overlay:save-as', async (event, dataURL) => {
    const context = getSessionForWindow(event.sender);
    if (!context) return { ok: false };
    // На время диалога снимаем «поверх всех окон», иначе окно диалога может
    // оказаться за оверлеем.
    const raised = session ? [...session.windows.values()] : [];
    for (const win of raised) {
      if (!win.isDestroyed()) win.setAlwaysOnTop(false);
    }
    try {
      const result = await saver.saveDataURLAs(dataURL, context.win);
      if (result.canceled) {
        for (const win of raised) {
          if (!win.isDestroyed()) win.setAlwaysOnTop(true, 'screen-saver');
        }
        return { ok: true, canceled: true };
      }
      closeOverlays();
      return { ok: true, filePath: result.filePath };
    } catch (error) {
      for (const win of raised) {
        if (!win.isDestroyed()) win.setAlwaysOnTop(true, 'screen-saver');
      }
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('overlay:copy', (event, dataURL) => {
    const context = getSessionForWindow(event.sender);
    if (!context) return { ok: false };
    try {
      saver.copyDataURL(dataURL);
      closeOverlays();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('overlay:capture-display', (event, displayId) => {
    const context = getSessionForWindow(event.sender);
    if (!context || !session) return { ok: false };
    const target = String(displayId);
    const image = session.shots.get(target) || session.shots.get(context.displayId);
    if (!image) return { ok: false, error: 'Нет снимка этого дисплея' };
    try {
      closeOverlays();
      const filePath = saver.saveImage(image);
      return { ok: true, filePath };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('overlay:open-settings', () => {
    closeOverlays();
    const settingsWindow = require('./settingsWindow');
    settingsWindow.open();
    return true;
  });

  ipcMain.handle('overlay:cancel', () => {
    closeOverlays();
    return true;
  });
}

function nativeImageFromDataURL(dataURL) {
  try {
    return nativeImage.createFromDataURL(dataURL);
  } catch {
    return null;
  }
}

module.exports = {
  startCapture,
  registerIpc,
  closeOverlays,
  overlaysOpen,
  displayCatalog,
  nativeImageFromDataURL,
  get lastError() {
    return lastError;
  },
};
