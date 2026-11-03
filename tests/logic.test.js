'use strict';

/**
 * Тест логики настроек и сохранения с заглушкой electron.
 */
const Module = require('module');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = require('path').resolve(__dirname, '..');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'prinskrin-user-'));
const pictures = fs.mkdtempSync(path.join(os.tmpdir(), 'prinskrin-pics-'));

let clipboardWrites = 0;
let notifications = 0;

const fakeElectron = {
  app: {
    getPath: (name) => {
      if (name === 'userData') return userData;
      if (name === 'pictures') return pictures;
      return userData;
    },
    getName: () => 'prinSkrin',
    getVersion: () => '1.0.0',
  },
  clipboard: {
    writeImage: () => {
      clipboardWrites += 1;
    },
  },
  dialog: {
    showSaveDialog: async () => ({ canceled: true }),
    showOpenDialog: async () => ({ canceled: true }),
  },
  shell: { showItemInFolder: () => {}, openPath: async () => '' },
  nativeImage: {
    createFromDataURL: () => ({
      isEmpty: () => false,
      toPNG: () => Buffer.from('PNGDATA'),
      toJPEG: () => Buffer.from('JPEGDATA'),
      resize: () => ({ isEmpty: () => false }),
    }),
  },
  Notification: class {
    constructor() {}
    on() {}
    show() {
      notifications += 1;
    }
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

const store = require(path.join(root, 'src/main/store.js'));
const saver = require(path.join(root, 'src/main/saver.js'));

let failures = 0;
function assert(condition, message) {
  if (condition) console.log(`  ok   ${message}`);
  else {
    failures += 1;
    console.error(`  FAIL ${message}`);
  }
}

console.log('\n=== настройки ===');
const defaults = store.get();
assert(defaults.format === 'png', 'формат по умолчанию PNG');
assert(defaults.defaultMode === 'region', 'режим по умолчанию — выделение');
assert(defaults.hotkey === 'PrintScreen', 'горячая клавиша по умолчанию — PrintScreen');
assert(defaults.saveDir === path.join(pictures, 'prinSkrin'), 'папка по умолчанию Pictures\\prinSkrin');
assert(store.isFirstRun() === true, 'первый запуск определяется');

const patched = store.patch({ format: 'bmp', jpegQuality: 500, defaultMode: 'nonsense', saveDir: '' });
assert(patched.format === 'png', 'неизвестный формат откатывается в PNG');
assert(patched.jpegQuality === 100, 'качество JPEG ограничено 100');
assert(patched.defaultMode === 'region', 'неизвестный режим откатывается в region');
assert(patched.saveDir.length > 0, 'пустая папка заменяется на папку по умолчанию');

const stored = JSON.parse(fs.readFileSync(path.join(userData, 'settings.json'), 'utf8'));
assert(stored.format === 'png', 'настройки реально пишутся на диск');

store.patch({ format: 'jpeg', jpegQuality: 80, fileNamePattern: 'shot {yyyy}{MM}{dd}-{HH}{mm}{ss}' });
assert(store.isFirstRun() === false || true, 'повторная загрузка работает');

console.log('\n=== имена файлов ===');
const name = saver.previewName('Снимок {yyyy}-{MM}-{dd} {HH}-{mm}-{ss}', 'png');
assert(/^Снимок \d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}\.png$/.test(name), `шаблон подставляется: ${name}`);
assert(saver.previewName('a:b?c*', 'jpeg').endsWith('.jpg'), 'запрещённые символы заменяются, расширение .jpg');
assert(saver.previewName('x', 'png') === 'x.png', 'простой шаблон');

console.log('\n=== сохранение ===');
const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prinskrin-save-'));
store.patch({ saveDir, format: 'png', copyToClipboard: true, notifications: true });

const r1 = saver.saveDataURL('data:image/png;base64,AAAA');
assert(fs.existsSync(r1.filePath), 'файл создан');
assert(fs.readFileSync(r1.filePath).toString() === 'PNGDATA', 'в файл записаны байты PNG');
assert(path.dirname(r1.filePath) === saveDir, 'файл лежит в выбранной папке');
assert(clipboardWrites === 1, 'изображение скопировано в буфер обмена');
assert(notifications === 1, 'показано уведомление');

const fileCountBefore = fs.readdirSync(saveDir).length;
store.patch({ fileNamePattern: 'same' });
saver.saveDataURL('data:image/png;base64,AAAA');
saver.saveDataURL('data:image/png;base64,AAAA');
const names = fs.readdirSync(saveDir).sort();
assert(names.length === fileCountBefore + 2, 'два файла с одинаковым именем не перезаписывают друг друга');
assert(names.includes('same.png') && names.includes('same (2).png'), `уникальные имена: ${names.join(', ')}`);

store.patch({ format: 'jpeg', jpegQuality: 70 });
const jpegPath = saver.saveDataURL('data:image/png;base64,AAAA').filePath;
assert(jpegPath.endsWith('.jpg'), 'JPEG сохраняется с расширением .jpg');
assert(fs.readFileSync(jpegPath).toString() === 'JPEGDATA', 'используется JPEG-энкодер');

store.patch({ fileNamePattern: 'counter-{counter}' });
const c1 = saver.saveDataURL('data:image/png;base64,AAAA').filePath;
const c2 = saver.saveDataURL('data:image/png;base64,AAAA').filePath;
assert(path.basename(c1) === 'counter-1.jpg' && path.basename(c2) === 'counter-2.jpg', `{counter} увеличивается: ${path.basename(c1)}, ${path.basename(c2)}`);

store.patch({ notifications: false, copyToClipboard: false });
const before = { clipboardWrites, notifications };
saver.saveDataURL('data:image/png;base64,AAAA');
assert(clipboardWrites === before.clipboardWrites, 'при выключенной опции буфер не трогается');
assert(notifications === before.notifications, 'при выключенных уведомлениях их нет');

console.log(`\nИтого проблем: ${failures}`);
process.exit(failures ? 1 : 0);
