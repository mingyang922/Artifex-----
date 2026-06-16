const fs = require('fs');
const path = require('path');
const rootDir = path.join(__dirname, '..');

function fixByContent(relPath, replacements) {
  const fp = path.join(rootDir, relPath);
  let c = fs.readFileSync(fp, 'utf8');
  let changed = 0;
  for (const [search, replace] of replacements) {
    if (c.includes(search)) {
      c = c.replace(search, replace);
      changed++;
    } else {
      console.log(`  NOT FOUND in ${relPath}: "${search.substring(0, 60)}"`);
    }
  }
  if (changed > 0) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log(`FIXED ${relPath}: ${changed}`);
  }
}

// backend/db/users-db.js: profile unused
fixByContent('backend/db/users-db.js', [
  ['let profile = {};', 'let _profile = {};'],
]);

// backend/lib/ws-server.js: req unused
fixByContent('backend/lib/ws-server.js', [
  ['(req, res, next)', '(_req, res, next)'],
]);

// backend/proxy.js: offset unused
fixByContent('backend/proxy.js', [
  ['const offset = (page - 1) * limit;', 'const _offset = (page - 1) * limit;'],
]);

// backend/routes/admin.js: csrfProtection unused
fixByContent('backend/routes/admin.js', [
  ['csrfProtection,', 'csrfProtection: _csrfProtection,'],
]);

// backend/routes/image-proxy.js: callStatus unused
fixByContent('backend/routes/image-proxy.js', [
  ["let callStatus = 'success';", "let _callStatus = 'success';"],
  ["callStatus = 'error'", "_callStatus = 'error'"],
  ["callStatus = 'success'", "_callStatus = 'success'"],
]);

// js/api-utils.js: catch (e)
fixByContent('js/api-utils.js', [
  ['catch (e)', 'catch (_e)'],
]);

// js/dashboard-init.js: catch (e)
fixByContent('js/dashboard-init.js', [
  ['catch (e)', 'catch (_e)'],
]);

// modules/ai-generate/asset-editor.js: catch (e), idx unused
fixByContent('modules/ai-generate/asset-editor.js', [
  ['.forEach((entry, idx) => {', '.forEach((entry, _idx) => {'],
]);

// modules/ai-generate/image-generator.js: aiGenerator, imageGenerator
fixByContent('modules/ai-generate/image-generator.js', [
  ['let aiGenerator;', 'let _aiGenerator;'],
  ['let imageGenerator;', 'let _imageGenerator;'],
]);

// modules/ai-generate/image-storage.js: fallbackErr
fixByContent('modules/ai-generate/image-storage.js', [
  ['catch (fallbackErr)', 'catch (_fallbackErr)'],
]);

// modules/asset-library/asset-library.js: catch (e), init
fixByContent('modules/asset-library/asset-library.js', [
  ['catch (e)', 'catch (_e)'],
  ['function init() {', 'function _init() {'],
]);

// modules/project-management/main.js: projectCards, actionButtons, catch (e)
fixByContent('modules/project-management/main.js', [
  ['const projectCards =', 'const _projectCards ='],
  ['const actionButtons =', 'const _actionButtons ='],
  ['catch (e)', 'catch (_e)'],
]);

// modules/project-management/project-detail.js: getLocalStorageUsageBytes
fixByContent('modules/project-management/project-detail.js', [
  ['function getLocalStorageUsageBytes()', 'function _getLocalStorageUsageBytes()'],
]);

// js/data-portability.js: getLocalStorageUsageBytes
fixByContent('js/data-portability.js', [
  ['function getLocalStorageUsageBytes()', 'function _getLocalStorageUsageBytes()'],
]);

// modules/user-center/password-security.js: password, err
fixByContent('modules/user-center/password-security.js', [
  ['catch (err)', 'catch (_err)'],
  ['validateCurrentPassword(password)', 'validateCurrentPassword(_password)'],
  ['const confirmPassword =', 'const _confirmPassword ='],
]);

// modules/user-center/user-center-init.js: index
fixByContent('modules/user-center/user-center-init.js', [
  ['.map((checkbox, index)', '.map((checkbox, _index)'],
]);

// modules/user-center/user-center-page.js: index, element
fixByContent('modules/user-center/user-center-page.js', [
  ['(checkbox, index)', '(checkbox, _index)'],
  ['.forEach((cleanup, element)', '.forEach((cleanup, _element)'],
]);

console.log('\nDone');
