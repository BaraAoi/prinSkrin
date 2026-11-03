'use strict';

/**
 * Портативная сборка Windows (без установщика):
 *   npm run pack:win
 * Результат: release/prinSkrin-win32-x64/prinSkrin.exe
 *
 * Установщик собирается electron-builder: npm run dist:win
 */
const path = require('path');
const fs = require('fs');

async function main() {
  const packager = require('@electron/packager');
  const root = path.resolve(__dirname, '..');
  const pkg = require(path.join(root, 'package.json'));

  const outDir = path.join(root, 'release');
  fs.mkdirSync(outDir, { recursive: true });

  const appPaths = await packager.default({
    dir: root,
    out: outDir,
    name: 'prinSkrin',
    executableName: 'prinSkrin',
    appVersion: pkg.version,
    platform: 'win32',
    arch: 'x64',
    icon: path.join(root, 'assets', 'icon.ico'),
    overwrite: true,
    prune: true,
    asar: true,
    ignore: [
      /^\/release($|\/)/,
      /^\/\.git($|\/)/,
      /^\/scripts($|\/)/,
      /^\/\.github($|\/)/,
    ],
    win32metadata: {
      CompanyName: 'prinSkrin',
      FileDescription: pkg.description,
      ProductName: 'prinSkrin',
      InternalName: 'prinSkrin',
      OriginalFilename: 'prinSkrin.exe',
      'requested-execution-level': 'asInvoker',
    },
  });

  console.log('\nГотово:');
  for (const appPath of appPaths) {
    console.log(`  ${path.join(appPath, 'prinSkrin.exe')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
