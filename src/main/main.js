'use strict';

const { app, BrowserWindow, globalShortcut, Menu, Notification } = require('electron');
const path = require('path');

const store = require('./store');
const saver = require('./saver');
const capture = require('./capture');
const tray = require('./tray');
const settingsWindow = require('./settingsWindow');

const APP_ID = 'com.prinskrin.app';
let quitting = false;
let capturing = false;

let hotkeyState = { registered: false, accelerator: null, error: null };

function notify(title, body) {
  try {
    if (!Notification.isSupported()) return;
    new Notification({
      title,
      body,
      icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    }).show();
  } catch { /* ignore */ }
}

function setHotkey(accelerator) {
  const previous = hotkeyState.accelerator;

  if (previous) {
    try {
      globalShortcut.unregister(previous);
    } catch { /* ignore */ }
  }

  try {
    const ok = globalShortcut.register(accelerator, () => {
      triggerCapture();
    });
    if (!ok) {
      hotkeyState = { registered: false, accelerator: previous, error: 'клавиша занята другой программой' };
      if (previous) {
        try {
          globalShortcut.register(previous, () => triggerCapture());
        } catch { /* ignore */ }
      }
      return { ok: false, error: 'клавиша занята другой программой' };
    }
  } catch (error) {
    hotkeyState = { registered: false, accelerator: previous, error: error.message };
    if (previous) {
      try {
        globalShortcut.register(previous, () => triggerCapture());
      } catch { /* ignore */ }
    }
    return { ok: false, error: error.message || 'некорректное сочетание клавиш' };
  }

  hotkeyState = { registered: true, accelerator, error: null };
  return { ok: true, accelerator };
}

function getHotkeyStatus() {
  return { ...hotkeyState };
}

async function triggerCapture(mode) {
  if (capturing) return null;
  capturing = true;
  try {
    const result = await capture.startCapture(mode);
    if (result && result.ok === false && result.error) {
      notify('Не удалось сделать скриншот', result.error);
    }
    return result;
  } catch (error) {
    console.error('[prinSkrin] capture:', error);
    notify('Ошибка захвата экрана', error.message);
    return null;
  } finally {
    capturing = false;
  }
}

function parseArgs(argv) {
  return (argv || []).slice(1).filter((arg) => typeof arg === 'string' && arg.startsWith('--'));
}

function handleLaunch(argv) {
  const flags = parseArgs(argv);

  if (flags.includes('--capture')) {
    triggerCapture();
    return;
  }
  if (isSilentLaunch(flags)) {
    return;
  }
  settingsWindow.open();
}

function isSilentLaunch(flags) {
  return flags.includes('--tray') || flags.includes('--silent');
}

function bootstrap() {
  app.setAppUserModelId(APP_ID);
  Menu.setApplicationMenu(null);

  app.whenReady().then(() => {
    store.load();
    saver.ensureSaveDir();

    capture.registerIpc();
    settingsWindow.registerIpc({ setHotkey, getHotkeyStatus });
    settingsWindow.setCaptureHandler(() => triggerCapture());
    tray.create({
      capture: () => triggerCapture(),
      settings: () => settingsWindow.open(),
      quit: () => {
        quitting = true;
        app.quit();
      },
    });

    store.onChange(() => {
      tray.refresh();
      settingsWindow.broadcast();
    });

    const hotkeyResult = setHotkey(store.get().hotkey);
    if (!hotkeyResult.ok) {
      notify(
        'prinSkrin: клавиша не назначена',
        `Не удалось занять ${store.get().hotkey}. Откройте настройки и выберите другое сочетание.`,
      );
    }

    settingsWindow.applyAutostart(store.get().launchAtLogin);
    handleLaunch(process.argv);
  });

  app.on('second-instance', (event, argv) => {
    if (capture.overlaysOpen()) return;
    const flags = parseArgs(argv);
    if (flags.includes('--capture')) {
      triggerCapture();
      return;
    }
    if (isSilentLaunch(flags)) return;
    settingsWindow.open();
  });

  app.on('window-all-closed', () => {
    if (quitting) app.quit();
  });

  app.on('before-quit', () => {
    quitting = true;
    capture.closeOverlays();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    tray.destroy();
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  bootstrap();
}
