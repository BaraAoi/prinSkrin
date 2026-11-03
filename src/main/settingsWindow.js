'use strict';

const { app, BrowserWindow, dialog, ipcMain, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store');
const saver = require('./saver');

let settingsWin = null;
let hotkeyStatus = { registered: true, accelerator: null };
let onHotkeyChange = null;
let onCaptureRequest = null;

const ICON = path.join(__dirname, '..', '..', 'assets', 'icon.png');

function payload() {
  return {
    settings: store.get(),
    displays: screen.getAllDisplays().map((display, index) => ({
      id: String(display.id),
      label: `Экран ${index + 1}`,
      size: { ...display.size },
      scaleFactor: display.scaleFactor,
      primary: display.id === screen.getPrimaryDisplay().id,
    })),
    hotkey: hotkeyStatus,
    version: app.getVersion(),
    platform: process.platform,
    saveDirExists: fs.existsSync(store.get().saveDir),
    fileNamePreview: saver.previewName(store.get().fileNamePattern, store.get().format),
    lastError: null,
  };
}

function createWindow() {
  settingsWin = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 760,
    minHeight: 580,
    title: 'prinSkrin — настройки',
    icon: ICON,
    backgroundColor: '#f4f6fb',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'settings.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  settingsWin.setMenu(null);
  settingsWin.loadFile(path.join(__dirname, '..', 'renderer', 'settings', 'settings.html'));

  settingsWin.once('ready-to-show', () => {
    if (!settingsWin) return;
    settingsWin.show();
    settingsWin.focus();
  });

  settingsWin.on('closed', () => {
    settingsWin = null;
  });
}

function open() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    if (settingsWin.isMinimized()) settingsWin.restore();
    settingsWin.show();
    settingsWin.focus();
    return settingsWin;
  }
  createWindow();
  return settingsWin;
}

function close() {
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.close();
}

function broadcast() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.webContents.send('settings:changed', payload());
  }
}

function hideBriefly(ms = 900) {
  if (!settingsWin || settingsWin.isDestroyed() || !settingsWin.isVisible()) return;
  settingsWin.hide();
  setTimeout(() => {
    if (settingsWin && !settingsWin.isDestroyed()) settingsWin.showInactive();
  }, ms);
}

function registerIpc({ setHotkey, getHotkeyStatus }) {
  onHotkeyChange = setHotkey;
  hotkeyStatus = getHotkeyStatus();

  ipcMain.handle('settings:get', () => payload());

  ipcMain.handle('settings:update', (event, partial) => {
    const patch = { ...(partial || {}) };

    if (typeof patch.hotkey === 'string' && patch.hotkey !== store.get().hotkey) {
      const result = onHotkeyChange(patch.hotkey);
      if (!result.ok) {
        delete patch.hotkey;
        const applied = Object.keys(patch).length ? store.patch(patch) : store.get();
        hotkeyStatus = getHotkeyStatus();
        broadcast();
        return { ok: false, error: `Клавишу «${patch.hotkey}» не удалось назначить: ${result.error}`, settings: applied };
      }
      hotkeyStatus = getHotkeyStatus();
    }

    const next = store.patch(patch);
    if (typeof patch.launchAtLogin === 'boolean') applyAutostart(next.launchAtLogin);
    if (patch.saveDir) saver.ensureSaveDir();
    hotkeyStatus = getHotkeyStatus();
    broadcast();
    return { ok: true, settings: next, hotkey: hotkeyStatus };
  });

  ipcMain.handle('settings:reset', () => {
    const next = store.reset();
    onHotkeyChange(next.hotkey);
    applyAutostart(next.launchAtLogin);
    hotkeyStatus = getHotkeyStatus();
    broadcast();
    return { ok: true, settings: next, hotkey: hotkeyStatus };
  });

  ipcMain.handle('settings:browse', async () => {
    const options = {
      title: 'Куда сохранять скриншоты',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: store.get().saveDir,
    };
    const result = settingsWin
      ? await dialog.showOpenDialog(settingsWin, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths.length) return { ok: false };
    return { ok: true, path: result.filePaths[0] };
  });

  ipcMain.handle('settings:open-folder', () => {
    const dir = saver.ensureSaveDir();
    shell.openPath(dir);
    return { ok: true, path: dir };
  });

  ipcMain.handle('settings:open-file', (event, filePath) => {
    if (filePath && fs.existsSync(filePath)) shell.showItemInFolder(filePath);
    return { ok: true };
  });

  ipcMain.handle('settings:capture', async () => {
    hideBriefly(1200);
    await new Promise((resolve) => setTimeout(resolve, 220));
    if (onCaptureRequest) await onCaptureRequest();
    return { ok: true };
  });

  ipcMain.handle('settings:close', () => {
    close();
    return { ok: true };
  });

  ipcMain.handle('settings:latest-error', () => ({ ok: true }));
}

function applyAutostart(enabled) {
  if (process.platform !== 'win32') return;
  if (!app.isPackaged) return;
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      path: process.execPath,
      args: ['--tray'],
    });
  } catch (error) {
    console.error('[prinSkrin] автозапуск:', error.message);
  }
}

function setCaptureHandler(handler) {
  onCaptureRequest = handler;
}

function getWindow() {
  return settingsWin;
}

module.exports = {
  open,
  close,
  registerIpc,
  broadcast,
  applyAutostart,
  setCaptureHandler,
  hideBriefly,
  getWindow,
  setHotkeyStatus(status) {
    hotkeyStatus = status;
  },
};
