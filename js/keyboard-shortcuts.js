/**
 * Artifex - 全局快捷键系统
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
(function () {
    'use strict';

    document.addEventListener('keydown', function (e) {
        var isCtrl = e.ctrlKey || e.metaKey;
        var target = e.target;
        var isInput =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        // 非修饰键场景下，输入框内不拦截
        if (isInput && !isCtrl) return;

        // Ctrl+S / Cmd+S — 保存
        if (isCtrl && e.key === 's') {
            e.preventDefault();
            var saveBtn = document.querySelector(
                '#save-changes-btn, #save-project-btn, #save-edit-btn, .save-btn'
            );
            if (saveBtn) saveBtn.click();
            return;
        }

        // Ctrl+Z / Cmd+Z — 撤销（资产编辑器）
        if (isCtrl && !e.shiftKey && e.key === 'z') {
            // 如果在输入框内，让浏览器原生撤销生效
            if (isInput) return;
            e.preventDefault();
            var undoBtn = document.querySelector(
                '#aeUndoBtn, .ae-action-btn[data-action="undo"]'
            );
            if (undoBtn) undoBtn.click();
            return;
        }

        // Ctrl+Shift+Z / Cmd+Shift+Z — 重做（资产编辑器）
        if (isCtrl && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
            if (isInput) return;
            e.preventDefault();
            var redoBtn = document.querySelector(
                '#aeRedoBtn, .ae-action-btn[data-action="redo"]'
            );
            if (redoBtn) redoBtn.click();
            return;
        }

        // Space — 切换预览（图片生成器，仅非输入状态）
        if (e.key === ' ' && !isCtrl && !isInput) {
            e.preventDefault();
            var previewBtn = document.querySelector(
                '#togglePreviewBtn, #previewToggle'
            );
            if (previewBtn) {
                previewBtn.click();
            }
            return;
        }

        // Escape — 关闭模态框 / 下拉菜单
        if (e.key === 'Escape') {
            // 关闭 tech-select 下拉
            document
                .querySelectorAll('.tech-select.is-open, .pm-tech-select.is-open')
                .forEach(function (wrap) {
                    if (typeof wrap.__closeTechSelect === 'function')
                        wrap.__closeTechSelect();
                    else if (typeof wrap.__closePmTechSelect === 'function')
                        wrap.__closePmTechSelect();
                    else wrap.classList.remove('is-open');
                });
            // 关闭可见 modal
            var closeBtn = document.querySelector(
                '.modal:not(.hidden) .close-modal, .modal.show .close-modal, .overlay.show .close-btn'
            );
            if (closeBtn) closeBtn.click();
            return;
        }

        // Ctrl+Enter / Cmd+Enter — 提交 / 生成
        if (isCtrl && e.key === 'Enter') {
            e.preventDefault();
            var generateBtn = document.querySelector(
                '#generateBtn, #actionGroupGenerateBtn, .generate-btn:not([disabled])'
            );
            if (generateBtn) generateBtn.click();
            return;
        }
    });
})();
