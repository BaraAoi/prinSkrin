'use strict';

/**
 * Запуск всех автотестов: npm test
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const dir = __dirname;
const files = fs
  .readdirSync(dir)
  .filter((name) => name.endsWith('.test.js'))
  .sort();

let failed = 0;
for (const file of files) {
  console.log(`\n###### ${file} ######`);
  const result = spawnSync(process.execPath, [path.join(dir, file)], { stdio: 'inherit' });
  if (result.status !== 0) failed += 1;
}

console.log(failed ? `\nПровалено файлов: ${failed}` : '\nВсе тесты пройдены.');
process.exit(failed ? 1 : 0);
