/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.0.0 */
/**
 * ParticleNetwork — Canvas 粒子连线背景
 * 用法：window.ParticleNetwork.init({ container: document.body })
 */
(function () {
    'use strict';

    const DEFAULTS = {
        particleCount: 80,
        particleColor: 'rgba(0, 240, 255, 0.35)',
        lineColor: 'rgba(0, 240, 255, 0.12)',
        lineDistance: 140,
        particleSize: 1.8,
        speed: 0.3,
        mouseRadius: 160,
        mouseBoost: 2.5,
    };

    function init(userOpts) {
        const opts = Object.assign({}, DEFAULTS, userOpts);
        const container = opts.container || document.body;

        // 尊重用户"减少动画"偏好
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (motionQuery.matches) return { destroy: function () {} };

        const canvas = document.createElement('canvas');
        canvas.className = 'particle-network-canvas';
        canvas.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
        container.insertBefore(canvas, container.firstChild);

        const ctx = canvas.getContext('2d');
        let width, height, particles, animId;
        let mouse = { x: -9999, y: -9999 };

        // ── 粒子类 ──
        function Particle() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * opts.speed;
            this.vy = (Math.random() - 0.5) * opts.speed;
            this.r = opts.particleSize * (0.6 + Math.random() * 0.8);
        }

        Particle.prototype.step = function () {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;

            // 鼠标吸引力
            var dx = mouse.x - this.x;
            var dy = mouse.y - this.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < opts.mouseRadius && dist > 0) {
                var force = (1 - dist / opts.mouseRadius) * opts.mouseBoost * 0.02;
                this.vx += (dx / dist) * force;
                this.vy += (dy / dist) * force;
            }
            // 速度衰减
            this.vx *= 0.99;
            this.vy *= 0.99;
        };

        Particle.prototype.draw = function () {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = opts.particleColor;
            ctx.fill();
        };

        // ── 初始化粒子 ──
        function createParticles() {
            var count = Math.min(opts.particleCount, Math.floor((width * height) / 12000));
            particles = [];
            for (var i = 0; i < count; i++) {
                particles.push(new Particle());
            }
        }

        // ── 绘制连线 ──
        function drawLines() {
            for (var i = 0; i < particles.length; i++) {
                for (var j = i + 1; j < particles.length; j++) {
                    var dx = particles[i].x - particles[j].x;
                    var dy = particles[i].y - particles[j].y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < opts.lineDistance) {
                        var alpha = 1 - dist / opts.lineDistance;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = opts.lineColor.replace(/[\d.]+\)$/, (alpha * 0.6).toFixed(2) + ')');
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }
            // 鼠标与附近粒子连线
            for (var k = 0; k < particles.length; k++) {
                var mdx = mouse.x - particles[k].x;
                var mdy = mouse.y - particles[k].y;
                var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < opts.mouseRadius) {
                    var malpha = 1 - mdist / opts.mouseRadius;
                    ctx.beginPath();
                    ctx.moveTo(particles[k].x, particles[k].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = 'rgba(0, 240, 255, ' + (malpha * 0.25).toFixed(2) + ')';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }

        // ── 主循环 ──
        function frame() {
            ctx.clearRect(0, 0, width, height);
            for (var i = 0; i < particles.length; i++) {
                particles[i].step();
                particles[i].draw();
            }
            drawLines();
            animId = requestAnimationFrame(frame);
        }

        // ── 尺寸适配 ──
        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            if (!particles || particles.length === 0) createParticles();
        }

        // ── 鼠标监听 ──
        function onMouseMove(e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        }
        function onMouseLeave() {
            mouse.x = -9999;
            mouse.y = -9999;
        }

        resize();
        createParticles();
        window.addEventListener('resize', resize);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseleave', onMouseLeave);
        frame();

        // 动态减少动画时停止
        function onMotionChange(e) {
            if (e.matches) destroy();
        }
        motionQuery.addEventListener('change', onMotionChange);

        function destroy() {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseleave', onMouseLeave);
            motionQuery.removeEventListener('change', onMotionChange);
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        }

        return { destroy: destroy };
    }

    window.ParticleNetwork = { init: init };
})();
