'use strict';

/**
 * Быстрая проверка проекта: синтаксис JS + наличие ключевых файлов.
 * Запуск: npm run check
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let failed = 0;

function walk(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'release' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, callback);
    else callback(full);
  }
}

walk(path.join(root, 'src'), (file) => {
  if (!file.endsWith('.js')) return;
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`ok   ${path.relative(root, file)}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${path.relative(root, file)}`);
    console.error(String(error.stderr || error.message));
  }
});

const required = [
  'src/main/main.js',
  'src/main/capture.js',
  'src/main/settingsWindow.js',
  'src/main/tray.js',
  'src/main/store.js',
  'src/main/saver.js',
  'src/main/windowList.js',
  'src/preload/overlay.js',
  'src/preload/settings.js',
  'src/renderer/overlay/overlay.html',
  'src/renderer/overlay/overlay.js',
  'src/renderer/overlay/overlay.css',
  'src/renderer/settings/settings.html',
  'src/renderer/settings/settings.js',
  'src/renderer/settings/settings.css',
  'assets/icon.ico',
  'assets/icon.png',
  'assets/tray.png',
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    failed += 1;
    console.error(`MISS ${relative}`);
  }
}

if (failed) {
  console.error(`\nПроблем: ${failed}`);
  process.exit(1);
}
console.log('\nВсё в порядке.');
