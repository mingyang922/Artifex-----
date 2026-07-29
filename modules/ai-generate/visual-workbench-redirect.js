/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
(function redirectToPrimaryPage() {
    const target = './ai-generator-new.html' + (window.location.search || '') + (window.location.hash || '');
    window.location.replace(target);
})();
