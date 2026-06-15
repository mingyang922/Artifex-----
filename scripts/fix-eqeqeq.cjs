/**
 * 批量修复 eqeqeq warnings：!= → !==, == → ===
 * 只替换不紧跟 = 的情况（避免把 !== 改成 !=== ）
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const files = [
  'backend/db/users-db.js',
  'backend/providers/jimeng.js',
  'backend/sd-webui-helper.js',
  'js/html-utils.js',
  'modules/asset-library/asset-library.js',
];

let totalFixes = 0;

for (const file of files) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) { console.log(`SKIP: ${file}`); continue; }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fixes = 0;

  // != → !== (但不影响 !==)
  content = content.replace(/!=([^=])/g, (_, ch) => { fixes++; return '!==' + ch; });
  // == → === (但不影响 ===)
  content = content.replace(/==([^=])/g, (_, ch) => { fixes++; return '===' + ch; });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixes += fixes;
    console.log(`FIXED ${file}: ${fixes} fixes`);
  } else {
    console.log(`OK: ${file}`);
  }
}
console.log(`\nTotal: ${totalFixes}`);
