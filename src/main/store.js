'use strict';

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const listeners = new Set();
let cache = null;
let firstRun = false;

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function defaultSaveDir() {
  try {
    return path.join(app.getPath('pictures'), 'prinSkrin');
  } catch {
    return path.join(app.getPath('userData'), 'screenshots');
  }
}

function defaults() {
  return {
    // Куда и как сохраняем
    saveDir: defaultSaveDir(),
    fileNamePattern: 'prinSkrin {yyyy}-{MM}-{dd} {HH}-{mm}-{ss}',
    format: 'png', // png | jpeg
    jpegQuality: 92,

    // Захват
    defaultMode: 'region', // region | screen | window | monitor
    monitorId: 'cursor', // 'cursor' или id дисплея строкой
    autoSave: false, // сохранять сразу после выделения, без панели инструментов

    // Клавиша
    hotkey: 'PrintScreen',

    // Поведение
    copyToClipboard: true,
    notifications: true,
    launchAtLogin: false,
  };
}

function sanitize(patch, base) {
  const next = { ...base, ...patch };

  if (typeof next.saveDir !== 'string' || !next.saveDir.trim()) next.saveDir = defaultSaveDir();
  next.saveDir = path.normalize(next.saveDir.trim());

  if (typeof next.fileNamePattern !== 'string' || !next.fileNamePattern.trim()) {
    next.fileNamePattern = defaults().fileNamePattern;
  }
  next.fileNamePattern = next.fileNamePattern.trim();

  if (!['png', 'jpeg'].includes(next.format)) next.format = 'png';
  next.jpegQuality = Math.min(100, Math.max(30, parseInt(next.jpegQuality, 10) || 92));

  if (!['region', 'screen', 'window', 'monitor'].includes(next.defaultMode)) next.defaultMode = 'region';
  if (typeof next.monitorId !== 'string') next.monitorId = String(next.monitorId || 'cursor');
  if (typeof next.hotkey !== 'string' || !next.hotkey.trim()) next.hotkey = 'PrintScreen';

  next.autoSave = Boolean(next.autoSave);
  next.copyToClipboard = Boolean(next.copyToClipboard);
  next.notifications = Boolean(next.notifications);
  next.launchAtLogin = Boolean(next.launchAtLogin);

  return next;
}

function load() {
  if (cache) return cache;
  let stored = {};
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    stored = JSON.parse(raw) || {};
  } catch {
    firstRun = true;
  }
  cache = sanitize(stored, defaults());
  return cache;
}

function save() {
  const dir = path.dirname(settingsPath());
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(cache, null, 2), 'utf8');
  } catch (error) {
    console.error('[prinSkrin] не удалось сохранить настройки:', error.message);
  }
}

function get() {
  return { ...load() };
}

function patch(partial) {
  load();
  cache = sanitize(partial || {}, cache);
  save();
  const snapshot = get();
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('[prinSkrin] listener:', error);
    }
  }
  return snapshot;
}

function reset() {
  cache = sanitize({}, defaults());
  save();
  const snapshot = get();
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch { /* ignore */ }
  }
  return snapshot;
}

function onChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isFirstRun() {
  load();
  return firstRun;
}

function markConfigured() {
  firstRun = false;
}

module.exports = { get, patch, reset, onChange, isFirstRun, markConfigured, settingsPath, defaults };
