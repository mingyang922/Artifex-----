'use strict';
(function redirectToPrimaryPage() {
    const target =
        './ai-generator-new.html' + (window.location.search || '') + (window.location.hash || '');
    window.location.replace(target);
})();
