/**
 * 精确修复：逐行读取，按行号精确替换
 */
const fs = require('fs');
const path = require('path');
const rootDir = path.join(__dirname, '..');

function fixLines(relPath, replacements) {
  const fp = path.join(rootDir, relPath);
  const lines = fs.readFileSync(fp, 'utf8').split('\n');
  let changed = 0;
  for (const [lineNum, search, replace] of replacements) {
    const idx = lineNum - 1;
    if (idx < 0 || idx >= lines.length) { console.log(`  SKIP line ${lineNum} in ${relPath}`); continue; }
    if (lines[idx].includes(search)) {
      lines[idx] = lines[idx].replace(search, replace);
      changed++;
    } else {
      console.log(`  MISMATCH line ${lineNum} in ${relPath}: "${search}" not found in "${lines[idx].trim().substring(0, 80)}"`);
    }
  }
  if (changed > 0) {
    fs.writeFileSync(fp, lines.join('\n'), 'utf8');
    console.log(`FIXED ${relPath}: ${changed} changes`);
  }
}

// backend/db/users-db.js
fixLines('backend/db/users-db.js', [
  [365, 'let profile = {};', 'let _profile = {};'],
]);

// backend/lib/ws-server.js
fixLines('backend/lib/ws-server.js', [
  [14, '(req, res, next)', '(_req, res, next)'],
]);

// backend/providers/tencent.js
fixLines('backend/providers/tencent.js', [
  [16, 'function createTencentProvider(runtimeConfig, API_CONFIG,', 'function createTencentProvider(_runtimeConfig, _API_CONFIG,'],
]);

// backend/proxy.js
fixLines('backend/proxy.js', [
  [332, 'let offset = parseInt', 'let _offset = parseInt'],
]);

// backend/routes/admin.js
fixLines('backend/routes/admin.js', [
  [19, 'csrfProtection,', 'csrfProtection: _csrfProtection,'],
]);

// js/dashboard-init.js
fixLines('js/dashboard-init.js', [
  [18, 'function getProjectTypeName(', 'function _getProjectTypeName('],
  [130, 'function (e) {', 'function () {'],
]);

// js/notification-manager.js
fixLines('js/notification-manager.js', [
  [119, "(e) => {", "() => {"],
]);

// modules/admin/admin-init.js
fixLines('modules/admin/admin-init.js', [
  [23, 'const me = await', 'const _me = await'],
]);

// modules/ai-generate/ai-generator-page.js
fixLines('modules/ai-generate/ai-generator-page.js', [
  [55, 'function showApiError(', 'function _showApiError('],
  [57, 'function extractOriginalUrlFromProxy(', 'function _extractOriginalUrlFromProxy('],
  [58, 'async function fetchImageAsBlob(', 'async function _fetchImageAsBlob('],
  [158, 'function readScopedJson(', 'function _readScopedJson('],
  [167, 'function writeScopedJson(', 'function _writeScopedJson('],
  [409, 'function compressDataUrlImage(', 'function _compressDataUrlImage('],
  [458, 'function appendStyleRefToPrompt(', 'function _appendStyleRefToPrompt('],
  [800, 'const generatorViews =', 'const _generatorViews ='],
]);

// modules/ai-generate/asset-editor.js
fixLines('modules/ai-generate/asset-editor.js', [
  [332, '(function (idx) {', '(function (_idx) {'],
  [1429, 'const AIGenerator =', 'const _AIGenerator ='],
  [1431, 'const STYLE_PRESETS_KEY =', 'const _STYLE_PRESETS_KEY ='],
]);

// modules/ai-generate/image-generator.js
fixLines('modules/ai-generate/image-generator.js', [
  [1007, 'const color =', 'const _color ='],
  [1567, 'const aiGenerator =', 'const _aiGenerator ='],
  [1568, 'const imageGenerator =', 'const _imageGenerator ='],
]);

// modules/asset-library/asset-library.js
fixLines('modules/asset-library/asset-library.js', [
  [730, '.forEach(function (e) {', '.forEach(function (_e) {'],
  [971, 'const w =', 'const _w ='],
  [972, 'const h =', 'const _h ='],
  [1226, 'const init =', 'const _init ='],
]);

// modules/project-management/main.js
fixLines('modules/project-management/main.js', [
  [33, 'const projectCards =', 'const _projectCards ='],
  [34, 'const actionButtons =', 'const _actionButtons ='],
]);

// modules/project-management/project-detail.js
fixLines('modules/project-management/project-detail.js', [
  [973, 'function getLocalStorageUsageBytes()', 'function _getLocalStorageUsageBytes()'],
]);

// modules/project-management/index-init.js
fixLines('modules/project-management/index-init.js', [
  [989, 'function showMessageCenter()', 'function _showMessageCenter()'],
]);

// modules/user-center/password-security.js
fixLines('modules/user-center/password-security.js', [
  [281, 'const confirmPassword =', 'const _confirmPassword ='],
  [338, 'function (password) {', 'function (_password) {'],
  [692, 'const passwordSecurityManager =', 'const _passwordSecurityManager ='],
]);

// modules/user-center/user-center-init.js
fixLines('modules/user-center/user-center-init.js', [
  [117, 'function (item, index) {', 'function (item, _index) {'],
]);

// modules/user-center/user-center-page.js
fixLines('modules/user-center/user-center-page.js', [
  [44, 'const menu =', 'const _menu ='],
  [151, 'function (item, index) {', 'function (item, _index) {'],
  [298, 'const exists =', 'const _exists ='],
  [671, 'function (element) {', 'function (_element) {'],
  [746, 'const currentAvatar =', 'const _currentAvatar ='],
  [825, 'const changePasswordForm =', 'const _changePasswordForm ='],
  [826, 'const savePermissionsBtn =', 'const _savePermissionsBtn ='],
  [827, 'const cancelChangesBtn =', 'const _cancelChangesBtn ='],
  [828, 'const cancelPasswordChangeBtn =', 'const _cancelPasswordChangeBtn ='],
  [989, 'function showMessageCenter()', 'function _showMessageCenter()'],
]);

// js/data-portability.js
fixLines('js/data-portability.js', [
  [766, 'function getLocalStorageUsageBytes()', 'function _getLocalStorageUsageBytes()'],
]);

console.log('\nAll done');
