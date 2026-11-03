'use strict';

const { app, Menu, Tray, shell } = require('electron');
const path = require('path');
const store = require('./store');
const saver = require('./saver');

let tray = null;
let callbacks = { capture: () => {}, settings: () => {}, quit: () => {} };

const ICON = path.join(__dirname, '..', '..', 'assets', 'tray.png');

function buildMenu() {
  const settings = store.get();
  const hotkeyLabel = settings.hotkey.replace('PrintScreen', 'PrtSc').replace(/\+/g, ' + ');

  return Menu.buildFromTemplate([
    {
      label: 'Сделать скриншот',
      accelerator: settings.hotkey,
      click: () => callbacks.capture(),
    },
    {
      label: 'Настройки…',
      click: () => callbacks.settings(),
    },
    {
      label: 'Открыть папку скриншотов',
      click: () => shell.openPath(saver.ensureSaveDir()),
    },
    { type: 'separator' },
    {
      label: `Захват по клавише ${hotkeyLabel}`,
      enabled: false,
    },
    {
      label: 'Запускать при входе в Windows',
      type: 'checkbox',
      checked: Boolean(settings.launchAtLogin),
      click: (item) => {
        const next = store.patch({ launchAtLogin: item.checked });
        require('./settingsWindow').applyAutostart(next.launchAtLogin);
        require('./settingsWindow').broadcast();
      },
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => callbacks.quit(),
    },
  ]);
}

function refresh() {
  if (!tray || tray.isDestroyed()) return;
  tray.setContextMenu(buildMenu());
  const hotkeyLabel = store.get().hotkey.replace('PrintScreen', 'PrtSc').replace(/\+/g, ' + ');
  tray.setToolTip(`prinSkrin — скриншот по ${hotkeyLabel}`);
}

function create(handlers) {
  callbacks = { ...callbacks, ...handlers };
  tray = new Tray(ICON);
  tray.setToolTip('prinSkrin — PrtSc, чтобы сделать скриншот');
  tray.setContextMenu(buildMenu());
  tray.on('click', () => callbacks.capture());
  tray.on('double-click', () => callbacks.settings());
  return tray;
}

function getTray() {
  return tray;
}

function destroy() {
  if (tray && !tray.isDestroyed()) tray.destroy();
  tray = null;
}

module.exports = { create, refresh, destroy, getTray };
