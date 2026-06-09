/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';

    var APP_VERSION = (typeof window !== 'undefined' && window.API_CONFIG && window.API_CONFIG.version) || '1.3.3';

    var BOOT_LINES = [
        { text: '> ARTIFEX ENGINE v' + APP_VERSION, color: '#00f0ff' },
        { text: '> 加载资源管线...', color: 'rgba(0, 240, 255, 0.7)' },
        { text: '> 初始化 AI 模块...', color: 'rgba(0, 240, 255, 0.7)' },
        { text: '> 连接生成服务...', color: 'rgba(139, 92, 246, 0.8)' },
        { text: '> 加载素材库...', color: 'rgba(0, 240, 255, 0.7)' },
        { text: '> 准备画布引擎...', color: 'rgba(139, 92, 246, 0.8)' },
    ];

    function createBootScreen() {
        var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (motionQuery.matches) return;
        if (sessionStorage.getItem('artifex-boot-seen')) return;
        sessionStorage.setItem('artifex-boot-seen', '1');

        // 加载字体
        var fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Rajdhani:wght@400;500;600&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        var overlay = document.createElement('div');
        overlay.id = 'boot-sequence';
        overlay.style.cssText =
            'position:fixed;inset:0;z-index:99999;background:#0a0e18;display:flex;align-items:center;justify-content:center;cursor:pointer;';

        // 背景渐变
        var bg = document.createElement('div');
        bg.style.cssText =
            'position:absolute;inset:0;opacity:0.4;' +
            'background:radial-gradient(ellipse 60% 50% at 30% 40%, rgba(0,240,255,0.12), transparent),' +
            'radial-gradient(ellipse 50% 60% at 70% 30%, rgba(139,92,246,0.1), transparent);';
        overlay.appendChild(bg);

        var box = document.createElement('div');
        box.style.cssText = 'position:relative;max-width:480px;padding:40px;';

        // 品牌标题
        var brand = document.createElement('div');
        brand.style.cssText =
            'font-family:"Orbitron","Segoe UI",sans-serif;font-size:28px;font-weight:700;' +
            'color:#00f0ff;letter-spacing:6px;text-transform:uppercase;margin-bottom:8px;' +
            'text-shadow:0 0 20px rgba(0,240,255,0.4), 0 0 40px rgba(0,240,255,0.15);';
        brand.textContent = 'ARTIFEX';
        box.appendChild(brand);

        // 副标题
        var sub = document.createElement('div');
        sub.style.cssText =
            'font-family:"Rajdhani","Segoe UI",sans-serif;font-size:14px;font-weight:500;' +
            'color:rgba(139,92,246,0.8);letter-spacing:3px;margin-bottom:32px;';
        sub.textContent = '游戏美术协作与 AI 资产生成平台';
        box.appendChild(sub);

        // 进度条
        var bar = document.createElement('div');
        bar.style.cssText =
            'width:100%;height:2px;background:rgba(0,240,255,0.08);border-radius:1px;margin-bottom:28px;overflow:hidden;';
        var barFill = document.createElement('div');
        barFill.style.cssText =
            'height:100%;width:0%;background:linear-gradient(90deg,#00f0ff,#8b5cf6);border-radius:1px;transition:width 0.25s ease;';
        bar.appendChild(barFill);
        box.appendChild(bar);

        // 终端行容器
        var terminal = document.createElement('div');
        terminal.style.cssText =
            'font-family:"Rajdhani","Segoe UI",sans-serif;font-size:14px;font-weight:500;line-height:2;letter-spacing:0.5px;';
        box.appendChild(terminal);

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var lineIndex = 0;
        var skip = false;

        function skipBoot() {
            if (skip) return;
            skip = true;
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';
            setTimeout(function () { overlay.remove(); }, 500);
        }

        overlay.addEventListener('click', skipBoot);
        document.addEventListener('keydown', function onKey(e) {
            if (e.key === 'Escape' || e.key === ' ') {
                skipBoot();
                document.removeEventListener('keydown', onKey);
            }
        });

        function showNextLine() {
            if (skip || lineIndex >= BOOT_LINES.length) {
                barFill.style.width = '100%';
                // 完成后显示就绪提示
                var ready = document.createElement('div');
                ready.style.cssText =
                    'margin-top:16px;font-family:"Orbitron","Segoe UI",sans-serif;font-size:11px;' +
                    'color:rgba(0,240,255,0.5);letter-spacing:2px;opacity:0;transition:opacity 0.4s ease;';
                ready.textContent = '▸ SYSTEM READY';
                terminal.appendChild(ready);
                requestAnimationFrame(function () { ready.style.opacity = '1'; });
                setTimeout(skipBoot, 600);
                return;
            }
            var entry = BOOT_LINES[lineIndex];
            var line = document.createElement('div');
            line.style.cssText =
                'color:' + entry.color + ';opacity:0;transition:opacity 0.2s ease;white-space:pre;font-size:13px;';
            line.textContent = entry.text;
            terminal.appendChild(line);
            requestAnimationFrame(function () { line.style.opacity = '1'; });
            barFill.style.width = Math.round(((lineIndex + 1) / (BOOT_LINES.length + 1)) * 100) + '%';
            lineIndex++;
            setTimeout(showNextLine, 150 + Math.random() * 100);
        }

        setTimeout(showNextLine, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createBootScreen);
    } else {
        createBootScreen();
    }
