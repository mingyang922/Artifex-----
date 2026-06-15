const fs = require('fs');
const path = require('path');
const rootDir = path.join(__dirname, '..');

// === 修复 eqeqeq ===
const eqeqeqFiles = [
  'backend/db/users-db.js',
  'backend/providers/jimeng.js',
  'backend/sd-webui-helper.js',
  'js/html-utils.js',
  'modules/asset-library/asset-library.js',
];

for (const file of eqeqeqFiles) {
  const fp = path.join(rootDir, file);
  let c = fs.readFileSync(fp, 'utf8');
  const orig = c;

  // 逐字符扫描，只替换独立的 != 和 ==
  let result = '';
  for (let i = 0; i < c.length; i++) {
    if (c[i] === '!' && c[i + 1] === '=' && c[i + 2] !== '=') {
      result += '!==';
      i++; // skip next =
    } else if (c[i] === '=' && c[i + 1] === '=' && c[i + 2] !== '=' && (i === 0 || c[i - 1] !== '!') && (i === 0 || c[i - 1] !== '=')) {
      result += '===';
      i++;
    } else {
      result += c[i];
    }
  }

  if (result !== orig) {
    fs.writeFileSync(fp, result, 'utf8');
    console.log(`EQEQEQ FIXED: ${file}`);
  }
}

// === 修复 catch 变量 ===
const catchFiles = [
  'backend/db/users-db.js',
  'backend/lib/utils.js',
  'backend/providers/jimeng.js',
  'backend/routes/auth.js',
  'backend/routes/image-proxy.js',
  'modules/asset-library/asset-library.js',
  'modules/ai-generate/image-generator.js',
];

for (const file of catchFiles) {
  const fp = path.join(rootDir, file);
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');
  const orig = c;

  // 只改 catch 括号中明确未使用的变量（ESLint 报的那些）
  c = c.replace(/\bcatch\s*\(\s*e\s*\)\s*\{/g, 'catch (_e) {');
  c = c.replace(/\bcatch\s*\(\s*e2\s*\)\s*\{/g, 'catch (_e2) {');
  c = c.replace(/\bcatch\s*\(\s*fallbackErr\s*\)\s*\{/g, 'catch (_fallbackErr) {');

  if (c !== orig) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log(`CATCH FIXED: ${file}`);
  }
}
console.log('Done');
