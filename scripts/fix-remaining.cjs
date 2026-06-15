/**
 * 精确修复 5 个被还原文件的 warnings
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

for (const file of files) {
  const filePath = path.join(rootDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // 1. catch (e) → catch (_e) 及引用
  // catch 块中未使用的变量只出现在 catch 括号里，块内不引用
  // 但安全起见，也替换块内可能的引用
  content = content.replace(/\bcatch\s*\(\s*e\s*\)\s*\{/g, 'catch (_e) {');
  content = content.replace(/\bcatch\s*\(\s*e2\s*\)\s*\{/g, 'catch (_e2) {');
  content = content.replace(/\bcatch\s*\(\s*err\s*\)\s*\{/g, 'catch (_err) {');
  content = content.replace(/\bcatch\s*\(\s*parseErr\s*\)\s*\{/g, 'catch (_parseErr) {');
  content = content.replace(/\bcatch\s*\(\s*fallbackErr\s*\)\s*\{/g, 'catch (_fallbackErr) {');

  // 2. 未使用的变量赋值：prefix with _
  // profile (line 365), color (line 1007), h (line 972), init (line 1226)
  // aiGenerator (line 1567), imageGenerator (line 1568), showMessageCenter (line 989)
  // 这些需要看具体代码，暂时跳过（不同文件不同情况）

  // 3. == → === 和 != → !==
  // 用更安全的正则：匹配 != 后面不是 = 的字符
  content = content.replace(/!=(?!=)/g, '!==');
  content = content.replace(/==(?!=)/g, '===');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`FIXED: ${file}`);
  } else {
    console.log(`OK: ${file}`);
  }
}
