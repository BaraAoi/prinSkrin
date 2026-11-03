'use strict';

const { app, clipboard, dialog, nativeImage, Notification, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const store = require('./store');

const BAD_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

function pad(value, length = 2) {
  return String(value).padStart(length, '0');
}

function expandPattern(pattern, date) {
  return String(pattern)
    .replace(/\{yyyy\}/gi, String(date.getFullYear()))
    .replace(/\{yy\}/gi, String(date.getFullYear()).slice(-2))
    .replace(/\{MM\}/g, pad(date.getMonth() + 1))
    .replace(/\{dd\}/gi, pad(date.getDate()))
    .replace(/\{HH\}/g, pad(date.getHours()))
    .replace(/\{mm\}/g, pad(date.getMinutes()))
    .replace(/\{ss\}/gi, pad(date.getSeconds()))
    .replace(/\{ms\}/gi, pad(date.getMilliseconds(), 3));
}

function sanitizeName(name) {
  const cleaned = String(name)
    .replace(BAD_CHARS, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
  return cleaned || 'prinSkrin';
}

function uniquePath(dir, baseName, ext) {
  let candidate = path.join(dir, `${baseName}.${ext}`);
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName} (${index}).${ext}`);
    index += 1;
    if (index > 9999) break;
  }
  return candidate;
}

function buildPath(settings, date = new Date()) {
  const dir = settings.saveDir;
  const ext = settings.format === 'jpeg' ? 'jpg' : 'png';
  const pattern = settings.fileNamePattern || 'prinSkrin {yyyy}-{MM}-{dd} {HH}-{mm}-{ss}';

  if (/\{counter\}/i.test(pattern)) {
    let index = 1;
    for (;;) {
      const name = sanitizeName(expandPattern(pattern.replace(/\{counter\}/gi, String(index)), date));
      const candidate = path.join(dir, `${name}.${ext}`);
      if (!fs.existsSync(candidate)) return candidate;
      index += 1;
      if (index > 9999) return uniquePath(dir, name, ext);
    }
  }

  const name = sanitizeName(expandPattern(pattern, date));
  return uniquePath(dir, name, ext);
}

function writeImage(image, settings, targetPath) {
  const filePath = targetPath || buildPath(settings);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const buffer =
    settings.format === 'jpeg' ? image.toJPEG(settings.jpegQuality) : image.toPNG();
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function notify(title, body, filePath) {
  try {
    if (!store.get().notifications) return;
    if (!Notification.isSupported()) return;
    const notification = new Notification({ title, body, icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'), silent: false });
    notification.on('click', () => {
      if (filePath) shell.showItemInFolder(filePath);
    });
    notification.show();
  } catch (error) {
    console.error('[prinSkrin] notification:', error.message);
  }
}

function imageFromDataURL(dataURL) {
  const image = nativeImage.createFromDataURL(dataURL);
  if (image.isEmpty()) throw new Error('Пустое изображение');
  return image;
}

/**
 * Сохранить готовое изображение (data URL PNG) в файл по настройкам.
 */
function saveDataURL(dataURL, { showNotification = true } = {}) {
  const settings = store.get();
  const image = imageFromDataURL(dataURL);
  const filePath = writeImage(image, settings);

  if (settings.copyToClipboard) {
    clipboard.writeImage(image);
  }
  if (showNotification) {
    notify('Скриншот сохранён', path.basename(filePath), filePath);
  }
  return { filePath, image };
}

async function saveDataURLAs(dataURL, parentWindow) {
  const settings = store.get();
  const image = imageFromDataURL(dataURL);
  const ext = settings.format === 'jpeg' ? 'jpg' : 'png';
  const suggested = buildPath(settings);
  const options = {
    title: 'Сохранить скриншот',
    defaultPath: suggested,
    filters: [
      { name: ext === 'png' ? 'PNG изображение' : 'JPEG изображение', extensions: [ext] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
  };
  const result = parentWindow
    ? await dialog.showSaveDialog(parentWindow, options)
    : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return { canceled: true };

  const buffer = settings.format === 'jpeg' ? image.toJPEG(settings.jpegQuality) : image.toPNG();
  fs.mkdirSync(path.dirname(result.filePath), { recursive: true });
  fs.writeFileSync(result.filePath, buffer);

  if (settings.copyToClipboard) clipboard.writeImage(image);
  notify('Скриншот сохранён', path.basename(result.filePath), result.filePath);
  return { canceled: false, filePath: result.filePath };
}

function saveImage(image, { showNotification = true } = {}) {
  const settings = store.get();
  const filePath = writeImage(image, settings);
  if (settings.copyToClipboard) clipboard.writeImage(image);
  if (showNotification) notify('Скриншот сохранён', path.basename(filePath), filePath);
  return filePath;
}

function copyDataURL(dataURL) {
  const image = imageFromDataURL(dataURL);
  clipboard.writeImage(image);
  return true;
}

function ensureSaveDir() {
  const settings = store.get();
  try {
    fs.mkdirSync(settings.saveDir, { recursive: true });
  } catch (error) {
    console.error('[prinSkrin] не удалось создать папку:', error.message);
  }
  return settings.saveDir;
}

function previewName(pattern, format) {
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const date = new Date();
  const name = sanitizeName(
    expandPattern(String(pattern || '').replace(/\{counter\}/gi, '1'), date),
  );
  return `${name}.${ext}`;
}

module.exports = {
  saveDataURL,
  saveDataURLAs,
  saveImage,
  copyDataURL,
  ensureSaveDir,
  previewName,
  buildPath,
  notify,
};
