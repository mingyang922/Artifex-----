const fs = require('fs');
const path = require('path');
const rootDir = path.join(__dirname, '..');

function fixByContent(relPath, replacements) {
  const fp = path.join(rootDir, relPath);
  let c = fs.readFileSync(fp, 'utf8');
  let changed = 0;
  for (const [search, replace] of replacements) {
    if (c.includes(search)) {
      c = c.split(search).join(replace);
      changed++;
    }
  }
  if (changed > 0) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log(`FIXED ${relPath}: ${changed}`);
  }
}

fixByContent('backend/lib/ws-server.js', [
  ['(ws, req)', '(ws, _req)'],
]);

fixByContent('backend/proxy.js', [
  ['const offset = (page - 1) * limit;', 'const _offset = (page - 1) * limit;'],
]);

fixByContent('backend/routes/admin.js', [
  ['isAdminUser, csrfProtection }', 'isAdminUser, csrfProtection: _csrfProtection }'],
]);

fixByContent('modules/ai-generate/asset-editor.js', [
  ['onPointerUp(e)', 'onPointerUp(_e)'],
  ['palette.forEach((color, idx)', 'palette.forEach((color, _idx)'],
]);

fixByContent('modules/asset-library/asset-library.js', [
  ['(e) => handleFiles(e.target.files)', '(_e) => handleFiles(_e.target.files)'],
]);

fixByContent('modules/project-management/main.js', [
  ['const projectCards = ', 'const _projectCards = '],
  ['const actionButtons = ', 'const _actionButtons = '],
]);

fixByContent('modules/project-management/project-detail.js', [
  ['function getLocalStorageUsageBytes()', 'function _getLocalStorageUsageBytes()'],
]);

console.log('Done');
