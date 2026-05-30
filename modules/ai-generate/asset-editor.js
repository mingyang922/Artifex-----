/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.0.0 */
'use strict';
class AssetEditor {
    constructor() {
        this.canvas = document.getElementById('aeCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.ctx.imageSmoothingEnabled = false;
        this.gridCanvas = document.getElementById('aeGridCanvas');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.overlay = document.getElementById('aeOverlay');
        this.oCtx = this.overlay.getContext('2d');
        this.wrap = document.getElementById('aeCanvasWrap');
        this.emptyHint = document.getElementById('aeCanvasEmpty');
        this.tool = 'move';
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.brushSize = 4;
        this.brushOpacity = 1;
        this.foreColor = '#00f0ff';
        this.fillTolerance = 32;
        this.history = [];
        this.historyIdx = -1;
        this.maxHistory = 40;
        this.isDragging = false;
        this.isDrawing = false;
        this.lastPx = 0;
        this.lastPy = 0;
        this.selection = null;
        this.imageLoaded = false;
        this.init();
    }

    init() {
        this.bindTools();
        this.bindCanvas();
        this.bindSliders();
        this.bindActions();
        this.bindAI();
        this.loadAssetLibrary();
        this.bindUpload();
        this.bindDragDrop();
        this.bindKeyboard();
    }

    /* ── 素材库加载 ── */
    async loadAssetLibrary() {
        const list = document.getElementById('aeAssetList');
        if (!list) return;
        let assets = [];
        try {
            const resp = await fetch('/api/asset-library', { credentials: 'include' });
            if (resp.ok) {
                const data = await resp.json();
                if (data.ok && Array.isArray(data.items)) {
                    assets = data.items.map((item) => {
                        let category = '其他';
                        let fileName = item.desc || '';
                        try {
                            const tagsObj = JSON.parse(item.tags || '{}');
                            if (tagsObj.category) category = tagsObj.category;
                            if (tagsObj.fileName) fileName = tagsObj.fileName;
                        } catch (_) {}
                        return { id: item.id, name: item.name || '', dataURL: item.content || '', type: item.type || 'image', category, fileName };
                    });
                }
            }
        } catch (_) {}
        // Fallback to localStorage if server returned nothing
        if (assets.length === 0) {
            try {
                const lib = JSON.parse(localStorage.getItem(aiStorageKey('assetLibrary_v1')) || '{}');
                assets = Array.isArray(lib.assets) ? lib.assets : [];
            } catch (_) {}
        }
        const imgs = JSON.parse(localStorage.getItem('generatedImages') || '[]');
        imgs.forEach((img) => {
            if (img.imageUrl && !assets.find((a) => a.dataURL === img.imageUrl)) {
                assets.push({ id: img.id, name: img.name || 'AI图片', dataURL: img.imageUrl, type: 'image' });
            }
        });
        if (assets.length === 0) {
            list.innerHTML =
                '<div class="ae-empty-hint">暂无素材，请先在「图片生成」或「角色动作组」中生成并保存到素材库。</div>';
            return;
        }
        list.innerHTML = '';
        assets.slice(0, 50).forEach((a) => {
            const src = a.dataURL || a.imageUrl || '';
            if (!src || (!src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('blob:'))) return;
            const imgEl = document.createElement('img');
            imgEl.className = 'ae-asset-thumb';
            imgEl.title = a.name || '';
            imgEl.src = src.startsWith('http') ? getProxyImageUrl(src) : src;
            imgEl.addEventListener('click', () => this.loadImage(imgEl.src));
            list.appendChild(imgEl);
        });
        if (!list.children.length) {
            list.innerHTML = '<div class="ae-empty-hint">素材库中暂无可用图片。</div>';
        }
    }

    /* ── 加载图片到画布 ── */
    loadImage(src, opts = {}) {
        const options = opts || {};
        const allowDirectFallback = options.allowDirectFallback !== false;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const w = img.naturalWidth,
                h = img.naturalHeight;
            this.canvas.width = w;
            this.canvas.height = h;
            this.overlay.width = w;
            this.overlay.height = h;
            this.gridCanvas.width = w;
            this.gridCanvas.height = h;
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.clearRect(0, 0, w, h);
            this.ctx.drawImage(img, 0, 0);
            this.oCtx.clearRect(0, 0, w, h);
            this.gridCtx.clearRect(0, 0, w, h);
            this.selection = null;
            this.imageLoaded = true;
            this.emptyHint.style.display = 'none';
            const sizeEl = document.getElementById('aeCanvasSize');
            if (sizeEl) sizeEl.textContent = w + ' × ' + h;
            this.pushHistory();
            this.fitZoom();
        };
        img.onerror = () => {
            if (allowDirectFallback) {
                const directUrl = extractOriginalUrlFromProxy(src);
                if (directUrl && /^https?:\/\//i.test(directUrl)) {
                    themedWarn('图片代理访问受限，已自动切换为直连加载');
                    this.loadImage(directUrl, { allowDirectFallback: false });
                    return;
                }
            }
            showApiError({ message: '图片加载失败，可能是图片源拒绝访问（403）或链接已失效。' }, 502, '资产微调');
        };
        img.src = src;
    }

    /* ── 上传 ── */
    bindUpload() {
        const inp = document.getElementById('aeLocalUpload');
        if (inp)
            inp.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => this.loadImage(reader.result);
                reader.readAsDataURL(file);
            });
    }

    bindDragDrop() {
        this.wrap.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        this.wrap.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files && e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => this.loadImage(reader.result);
                reader.readAsDataURL(file);
            }
        });
    }

    /* ── 工具栏 ── */
    bindTools() {
        document.querySelectorAll('.ae-tool-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ae-tool-btn').forEach((b) => b.classList.remove('ae-tool-active'));
                btn.classList.add('ae-tool-active');
                this.tool = btn.dataset.tool;
                this.wrap.style.cursor = this.getCursor();
            });
        });
    }

    getCursor() {
        const map = {
            move: 'grab',
            brush: 'none',
            eraser: 'none',
            select: 'crosshair',
            fill: 'crosshair',
            eyedropper: 'crosshair',
        };
        return map[this.tool] || 'default';
    }

    bindSliders() {
        const link = (id, valId, cb) => {
            const el = document.getElementById(id);
            const vEl = document.getElementById(valId);
            if (!el) return;
            el.addEventListener('input', () => {
                if (vEl) vEl.textContent = el.value;
                cb(Number(el.value));
            });
        };
        link('aeBrushSize', 'aeBrushSizeVal', (v) => {
            this.brushSize = v;
        });
        link('aeBrushOpacity', 'aeBrushOpacityVal', (v) => {
            this.brushOpacity = v / 100;
        });
        link('aeFillTolerance', 'aeFillToleranceVal', (v) => {
            this.fillTolerance = v;
        });
        link('aeAdjBrightness', 'aeAdjBrVal', () => {});
        link('aeAdjContrast', 'aeAdjCVal', () => {});
        link('aeAdjSaturation', 'aeAdjSVal', () => {});
        const colorEl = document.getElementById('aeForeColor');
        if (colorEl)
            colorEl.addEventListener('input', () => {
                this.foreColor = colorEl.value;
            });
    }

    /* ── 画布交互 ── */
    bindCanvas() {
        this.wrap.addEventListener('mousedown', (e) => this.onPointerDown(e));
        this.wrap.addEventListener('mousemove', (e) => this.onPointerMove(e));
        this.wrap.addEventListener('mouseup', (e) => this.onPointerUp(e));
        this.wrap.addEventListener('mouseleave', (e) => {
            this.onPointerUp(e);
            this.oCtx.clearRect(0, 0, this.overlay.width, this.overlay.height);
            if (this.selection) this.drawSelection();
            const coordEl = document.getElementById('aeCoordInfo');
            const rgbaEl = document.getElementById('aePixelRGBA');
            if (coordEl) coordEl.textContent = 'X: —  Y: —';
            if (rgbaEl) {
                rgbaEl.textContent = 'RGBA: —';
                rgbaEl.style.color = '#7090a8';
            }
        });
        this.wrap.addEventListener(
            'wheel',
            (e) => {
                e.preventDefault();
                const dir = e.deltaY < 0 ? 1 : -1;
                this.setZoom(this.zoom * (1 + dir * 0.1));
            },
            { passive: false }
        );
    }

    /* 屏幕坐标 → 画布像素坐标（取整） */
    canvasPixel(e) {
        const bg = document.getElementById('aeCanvasBg');
        const r = bg.getBoundingClientRect();
        const x = Math.floor((e.clientX - r.left) / this.zoom);
        const y = Math.floor((e.clientY - r.top) / this.zoom);
        return { x, y };
    }

    /* 更新状态栏：像素坐标 + RGBA */
    updateStatusBar(px, py) {
        const coordEl = document.getElementById('aeCoordInfo');
        const rgbaEl = document.getElementById('aePixelRGBA');
        if (coordEl) coordEl.textContent = 'X: ' + px + '  Y: ' + py;
        if (rgbaEl && px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
            const d = this.ctx.getImageData(px, py, 1, 1).data;
            rgbaEl.textContent = 'R:' + d[0] + ' G:' + d[1] + ' B:' + d[2] + ' A:' + d[3];
            rgbaEl.style.color = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
        }
    }

    onPointerDown(e) {
        if (!this.imageLoaded) return;
        const p = this.canvasPixel(e);
        this.lastPx = p.x;
        this.lastPy = p.y;
        this.updateStatusBar(p.x, p.y);
        if (this.tool === 'move') {
            this.isDragging = true;
            this.wrap.style.cursor = 'grabbing';
            return;
        }
        if (this.tool === 'eyedropper') {
            this.pickColor(p.x, p.y);
            return;
        }
        if (this.tool === 'fill') {
            this.floodFill(p.x, p.y);
            return;
        }
        if (this.tool === 'select') {
            this.selection = { x: p.x, y: p.y, x2: p.x, y2: p.y };
            this.isDrawing = true;
            return;
        }
        this.isDrawing = true;
        this.stampBrush(p.x, p.y);
    }

    onPointerMove(e) {
        if (!this.imageLoaded) return;
        const p = this.canvasPixel(e);
        this.updateStatusBar(p.x, p.y);
        this.drawCursorPreview(p.x, p.y);
        if (this.isDragging) {
            this.panX += e.movementX;
            this.panY += e.movementY;
            this.applyTransform();
            return;
        }
        if (!this.isDrawing) return;
        if (this.tool === 'select') {
            this.selection.x2 = p.x;
            this.selection.y2 = p.y;
            this.drawSelection();
            return;
        }
        this.bresenhamLine(this.lastPx, this.lastPy, p.x, p.y);
        this.lastPx = p.x;
        this.lastPy = p.y;
    }

    onPointerUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.wrap.style.cursor = this.getCursor();
            return;
        }
        if (this.isDrawing && this.tool !== 'select') {
            this.pushHistory();
        }
        if (this.isDrawing && this.tool === 'select' && this.selection) {
            const s = this.selection;
            const nx = Math.min(s.x, s.x2),
                ny = Math.min(s.y, s.y2);
            const nw = Math.abs(s.x2 - s.x),
                nh = Math.abs(s.y2 - s.y);
            if (nw < 2 || nh < 2) {
                this.selection = null;
            } else {
                this.selection = { x: nx, y: ny, w: nw, h: nh };
            }
            this.drawSelection();
        }
        this.isDrawing = false;
    }

    /** 在 overlay 上绘制画笔光标预览，精确显示将要操作的像素区域 */
    drawCursorPreview(cx, cy) {
        const oc = this.oCtx;
        const ow = this.overlay.width,
            oh = this.overlay.height;
        oc.clearRect(0, 0, ow, oh);
        if (this.selection && !this.isDrawing) this.drawSelection();
        if (this.tool === 'move' || this.tool === 'fill' || this.tool === 'eyedropper') return;
        if (this.tool === 'select' && this.isDrawing) return;
        const sz = this.brushSize;
        const half = Math.floor(sz / 2);
        if (this.tool === 'brush' || this.tool === 'eraser') {
            oc.save();
            oc.strokeStyle = this.tool === 'eraser' ? 'rgba(255,80,80,0.7)' : 'rgba(0,240,255,0.7)';
            oc.lineWidth = 0.5;
            if (sz <= 2) {
                oc.strokeRect(cx - half + 0.5, cy - half + 0.5, sz, sz);
            } else {
                for (let dy = -half; dy < sz - half; dy++) {
                    for (let dx = -half; dx < sz - half; dx++) {
                        if (dx * dx + dy * dy > half * half) continue;
                        oc.fillStyle = this.tool === 'eraser' ? 'rgba(255,80,80,0.15)' : 'rgba(0,240,255,0.15)';
                        oc.fillRect(cx + dx, cy + dy, 1, 1);
                    }
                }
                oc.beginPath();
                oc.arc(cx + 0.5, cy + 0.5, half, 0, Math.PI * 2);
                oc.stroke();
            }
            oc.restore();
        } else if (this.tool === 'select' && !this.isDrawing) {
            oc.save();
            oc.strokeStyle = 'rgba(0,240,255,0.5)';
            oc.lineWidth = 0.5;
            oc.setLineDash([2, 2]);
            oc.beginPath();
            oc.moveTo(cx + 0.5, 0);
            oc.lineTo(cx + 0.5, oh);
            oc.moveTo(0, cy + 0.5);
            oc.lineTo(ow, cy + 0.5);
            oc.stroke();
            oc.restore();
        }
    }

    /* ── 像素级绘制 ── */

    /** 在画布上设置单个像素的 RGBA */
    setPixel(imgData, x, y, r, g, b, a) {
        if (x < 0 || y < 0 || x >= imgData.width || y >= imgData.height) return;
        const i = (y * imgData.width + x) * 4;
        const d = imgData.data;
        if (a >= 255) {
            d[i] = r;
            d[i + 1] = g;
            d[i + 2] = b;
            d[i + 3] = 255;
        } else {
            const sa = a / 255;
            const da = d[i + 3] / 255;
            const oa = sa + da * (1 - sa);
            if (oa === 0) return;
            d[i] = Math.round((r * sa + d[i] * da * (1 - sa)) / oa);
            d[i + 1] = Math.round((g * sa + d[i + 1] * da * (1 - sa)) / oa);
            d[i + 2] = Math.round((b * sa + d[i + 2] * da * (1 - sa)) / oa);
            d[i + 3] = Math.round(oa * 255);
        }
    }

    /** 在画布上擦除单个像素（降低 alpha） */
    erasePixel(imgData, x, y, strength) {
        if (x < 0 || y < 0 || x >= imgData.width || y >= imgData.height) return;
        const i = (y * imgData.width + x) * 4;
        imgData.data[i + 3] = Math.max(0, imgData.data[i + 3] - Math.round(strength * 255));
    }

    /** 用当前画笔大小在 (cx,cy) 处印一个方形/圆形像素块 */
    stampBrush(cx, cy) {
        const w = this.canvas.width,
            h = this.canvas.height;
        const sz = this.brushSize;
        const half = Math.floor(sz / 2);
        const rgb = this.hexToRgb(this.foreColor);
        const a = Math.round(this.brushOpacity * 255);
        const isEraser = this.tool === 'eraser';
        const imgData = this.ctx.getImageData(0, 0, w, h);
        for (let dy = -half; dy < sz - half; dy++) {
            for (let dx = -half; dx < sz - half; dx++) {
                const px = cx + dx,
                    py = cy + dy;
                if (sz > 2) {
                    const dist = dx * dx + dy * dy;
                    if (dist > half * half) continue;
                }
                if (isEraser) this.erasePixel(imgData, px, py, this.brushOpacity);
                else this.setPixel(imgData, px, py, rgb.r, rgb.g, rgb.b, a);
            }
        }
        this.ctx.putImageData(imgData, 0, 0);
    }

    /** Bresenham 直线算法 — 在两点间逐像素绘制 */
    bresenhamLine(x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0),
            dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1,
            sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        const w = this.canvas.width,
            h = this.canvas.height;
        const sz = this.brushSize;
        const half = Math.floor(sz / 2);
        const rgb = this.hexToRgb(this.foreColor);
        const a = Math.round(this.brushOpacity * 255);
        const isEraser = this.tool === 'eraser';
        const imgData = this.ctx.getImageData(0, 0, w, h);
        const stamp = (cx, cy) => {
            for (let ddy = -half; ddy < sz - half; ddy++) {
                for (let ddx = -half; ddx < sz - half; ddx++) {
                    const px = cx + ddx,
                        py = cy + ddy;
                    if (sz > 2 && ddx * ddx + ddy * ddy > half * half) continue;
                    if (isEraser) this.erasePixel(imgData, px, py, this.brushOpacity);
                    else this.setPixel(imgData, px, py, rgb.r, rgb.g, rgb.b, a);
                }
            }
        };
        while (true) {
            stamp(x0, y0);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
        this.ctx.putImageData(imgData, 0, 0);
    }

    drawSelection() {
        this.oCtx.clearRect(0, 0, this.overlay.width, this.overlay.height);
        if (!this.selection) return;
        const s = this.selection;
        const sx = s.w !== undefined ? s.x : Math.min(s.x, s.x2);
        const sy = s.w !== undefined ? s.y : Math.min(s.y, s.y2);
        const sw = s.w !== undefined ? s.w : Math.abs(s.x2 - s.x);
        const sh = s.h !== undefined ? s.h : Math.abs(s.y2 - s.y);
        this.oCtx.save();
        this.oCtx.strokeStyle = '#00f0ff';
        this.oCtx.lineWidth = 1;
        this.oCtx.setLineDash([4, 3]);
        this.oCtx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);
        this.oCtx.fillStyle = 'rgba(0,240,255,0.06)';
        this.oCtx.fillRect(sx, sy, sw, sh);
        this.oCtx.restore();
    }

    pickColor(px, py) {
        if (px < 0 || py < 0 || px >= this.canvas.width || py >= this.canvas.height) return;
        const d = this.ctx.getImageData(px, py, 1, 1).data;
        const hex = '#' + [d[0], d[1], d[2]].map((c) => c.toString(16).padStart(2, '0')).join('');
        this.foreColor = hex;
        const el = document.getElementById('aeForeColor');
        if (el) el.value = hex;
    }

    floodFill(sx, sy) {
        const w = this.canvas.width,
            h = this.canvas.height;
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
        const imgData = this.ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const idx = (sy * w + sx) * 4;
        const tr = data[idx],
            tg = data[idx + 1],
            tb = data[idx + 2],
            ta = data[idx + 3];
        const c = this.hexToRgb(this.foreColor);
        const fa = Math.round(this.brushOpacity * 255);
        if (tr === c.r && tg === c.g && tb === c.b && ta === fa) return;
        const tol = this.fillTolerance * 4;
        const visited = new Uint8Array(w * h);
        const stack = [sx, sy];
        const match = (i) =>
            Math.abs(data[i] - tr) +
                Math.abs(data[i + 1] - tg) +
                Math.abs(data[i + 2] - tb) +
                Math.abs(data[i + 3] - ta) <=
            tol;
        while (stack.length > 0) {
            const y = stack.pop(),
                x = stack.pop();
            const pi = y * w + x;
            if (x < 0 || y < 0 || x >= w || y >= h || visited[pi]) continue;
            const ii = pi * 4;
            if (!match(ii)) continue;
            visited[pi] = 1;
            data[ii] = c.r;
            data[ii + 1] = c.g;
            data[ii + 2] = c.b;
            data[ii + 3] = fa;
            stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
        }
        this.ctx.putImageData(imgData, 0, 0);
        this.pushHistory();
    }

    hexToRgb(hex) {
        return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
    }

    /* ── 历史记录（使用 ImageData 避免 toDataURL 开销） ── */
    pushHistory() {
        const snap = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history = this.history.slice(0, this.historyIdx + 1);
        this.history.push(snap);
        if (this.history.length > this.maxHistory) this.history.shift();
        this.historyIdx = this.history.length - 1;
    }

    undo() {
        if (this.historyIdx <= 0) return;
        this.historyIdx--;
        this.restoreHistory();
    }

    redo() {
        if (this.historyIdx >= this.history.length - 1) return;
        this.historyIdx++;
        this.restoreHistory();
    }

    restoreHistory() {
        const snap = this.history[this.historyIdx];
        if (!snap) return;
        this.ctx.putImageData(snap, 0, 0);
    }

    /* ── 缩放 + 像素网格 ── */
    setZoom(z) {
        this.zoom = Math.max(0.1, Math.min(32, z));
        this.applyTransform();
        const lbl = document.getElementById('aeZoomLabel');
        if (lbl) lbl.textContent = Math.round(this.zoom * 100) + '%';
    }

    fitZoom() {
        const wr = this.wrap.getBoundingClientRect();
        const z = Math.min((wr.width - 40) / this.canvas.width, (wr.height - 60) / this.canvas.height, 1);
        this.panX = 0;
        this.panY = 0;
        this.setZoom(z);
    }

    applyTransform() {
        const bg = document.getElementById('aeCanvasBg');
        bg.style.transform = `translate(${this.panX}px,${this.panY}px) scale(${this.zoom})`;
        if (this._gridRaf) cancelAnimationFrame(this._gridRaf);
        this._gridRaf = requestAnimationFrame(() => this.drawPixelGrid());
    }

    drawPixelGrid() {
        const gc = this.gridCtx;
        const w = this.gridCanvas.width,
            h = this.gridCanvas.height;
        gc.clearRect(0, 0, w, h);
        if (!this.imageLoaded) return;

        const wrapRect = this.wrap.getBoundingClientRect();
        const bg = document.getElementById('aeCanvasBg');
        const bgRect = bg.getBoundingClientRect();
        const vx0 = Math.max(0, Math.floor((wrapRect.left - bgRect.left) / this.zoom));
        const vy0 = Math.max(0, Math.floor((wrapRect.top - bgRect.top) / this.zoom));
        const vx1 = Math.min(w, Math.ceil((wrapRect.right - bgRect.left) / this.zoom));
        const vy1 = Math.min(h, Math.ceil((wrapRect.bottom - bgRect.top) / this.zoom));

        /* --- 辅助参考网格：始终显示，间距随缩放自适应 --- */
        let step = 0;
        if (this.zoom >= 0.15) step = 128;
        if (this.zoom >= 0.4) step = 64;
        if (this.zoom >= 0.8) step = 32;
        if (this.zoom >= 1.5) step = 16;
        if (this.zoom >= 3) step = 8;
        if (step > 0) {
            const sx0 = Math.floor(vx0 / step) * step;
            const sy0 = Math.floor(vy0 / step) * step;
            gc.save();
            gc.strokeStyle = 'rgba(255,255,255,0.05)';
            gc.lineWidth = 0.5;
            gc.beginPath();
            for (let x = sx0; x <= vx1; x += step) {
                gc.moveTo(x + 0.5, vy0);
                gc.lineTo(x + 0.5, vy1);
            }
            for (let y = sy0; y <= vy1; y += step) {
                gc.moveTo(vx0, y + 0.5);
                gc.lineTo(vx1, y + 0.5);
            }
            gc.stroke();
            gc.restore();
        }

        /* --- 像素级网格：zoom >= 4x 时显示 --- */
        if (this.zoom >= 4 && vx1 - vx0 <= 512 && vy1 - vy0 <= 512) {
            gc.save();
            gc.strokeStyle = 'rgba(255,255,255,0.12)';
            gc.lineWidth = 0.5;
            gc.beginPath();
            for (let x = vx0; x <= vx1; x++) {
                gc.moveTo(x + 0.5, vy0);
                gc.lineTo(x + 0.5, vy1);
            }
            for (let y = vy0; y <= vy1; y++) {
                gc.moveTo(vx0, y + 0.5);
                gc.lineTo(vx1, y + 0.5);
            }
            gc.stroke();
            gc.restore();
        }
    }

    bindActions() {
        const $ = (id) => document.getElementById(id);
        $('aeUndo')?.addEventListener('click', () => this.undo());
        $('aeRedo')?.addEventListener('click', () => this.redo());
        $('aeZoomIn')?.addEventListener('click', () => this.setZoom(this.zoom * 1.25));
        $('aeZoomOut')?.addEventListener('click', () => this.setZoom(this.zoom / 1.25));
        $('aeZoomFit')?.addEventListener('click', () => this.fitZoom());
        $('aeExportPng')?.addEventListener('click', () => this.exportPng());
        $('aeSaveToLib')?.addEventListener('click', () => this.saveToLib());
        $('aeAdjApply')?.addEventListener('click', () => this.applyColorAdj());
        $('aeAdjReset')?.addEventListener('click', () => this.resetColorAdj());
    }

    bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            const ae = document.activeElement;
            if (ae && ae.closest && ae.closest('.tech-ui-overlay')) return;
            if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT')) return;
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
                return;
            }
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.redo();
                return;
            }
            const keys = { v: 'move', b: 'brush', e: 'eraser', m: 'select', g: 'fill', i: 'eyedropper' };
            if (keys[e.key]) {
                document
                    .querySelectorAll('.ae-tool-btn')
                    .forEach((b) => b.classList.toggle('ae-tool-active', b.dataset.tool === keys[e.key]));
                this.tool = keys[e.key];
                this.wrap.style.cursor = this.getCursor();
            }
        });
    }

    /* ── 色彩调整 ── */
    applyColorAdj() {
        if (!this.imageLoaded) return;
        const br = Number(document.getElementById('aeAdjBrightness')?.value || 0);
        const co = Number(document.getElementById('aeAdjContrast')?.value || 0);
        const sa = Number(document.getElementById('aeAdjSaturation')?.value || 0);
        const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const d = imgData.data;
        const cf = (259 * (co + 255)) / (255 * (259 - co));
        for (let i = 0; i < d.length; i += 4) {
            let r = d[i],
                g = d[i + 1],
                b = d[i + 2];
            r += br;
            g += br;
            b += br;
            r = cf * (r - 128) + 128;
            g = cf * (g - 128) + 128;
            b = cf * (b - 128) + 128;
            const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
            const sf = 1 + sa / 100;
            r = gray + sf * (r - gray);
            g = gray + sf * (g - gray);
            b = gray + sf * (b - gray);
            d[i] = Math.max(0, Math.min(255, r));
            d[i + 1] = Math.max(0, Math.min(255, g));
            d[i + 2] = Math.max(0, Math.min(255, b));
        }
        this.ctx.putImageData(imgData, 0, 0);
        this.pushHistory();
    }

    resetColorAdj() {
        ['aeAdjBrightness', 'aeAdjContrast', 'aeAdjSaturation'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = 0;
        });
        ['aeAdjBrVal', 'aeAdjCVal', 'aeAdjSVal'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        if (this.historyIdx >= 0) this.restoreHistory();
    }

    /* ── 导出 ── */
    exportPng() {
        if (!this.imageLoaded) {
            themedWarn('请先加载一张图片');
            return;
        }
        const a = document.createElement('a');
        a.href = this.canvas.toDataURL('image/png');
        a.download = 'asset_edited_' + Date.now() + '.png';
        a.click();
    }

    async saveToLib() {
        if (!this.imageLoaded) {
            themedWarn('请先加载一张图片');
            return;
        }
        try {
            const dataURL = this.canvas.toDataURL('image/png');
            const fileName = 'edited_' + Date.now() + '.png';
            const body = {
                name: '微调资产_' + new Date().toLocaleString('zh-CN'),
                type: 'image/png',
                content: dataURL,
                desc: fileName,
                source: 'asset-editor',
                tags: JSON.stringify({ category: 'AI生成', fileName: fileName }),
            };
            const resp = await fetchWithCsrf('/api/asset-library', {
                method: 'POST',
                body: JSON.stringify(body),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error || '保存失败');
            }
            themedSuccess('已保存到素材库');
        } catch (e) {
            console.warn('保存到服务器素材库失败，回退到 localStorage：', e);
            let state = { categories: [], assets: [] };
            try {
                state = JSON.parse(localStorage.getItem(aiStorageKey('assetLibrary_v1')) || '{}');
            } catch (_) {}
            state.categories = Array.isArray(state.categories) ? state.categories : [];
            state.assets = Array.isArray(state.assets) ? state.assets : [];
            if (!state.categories.includes('AI生成')) state.categories.unshift('AI生成');
            state.assets.unshift({
                id: 'ae_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                name: '微调资产_' + new Date().toLocaleString('zh-CN'),
                fileName: 'edited_' + Date.now() + '.png',
                category: 'AI生成',
                type: 'image/png',
                dataURL: this.canvas.toDataURL('image/png'),
                favorite: false,
                createdAt: Date.now(),
                source: 'asset-editor',
            });
            localStorage.setItem(aiStorageKey('assetLibrary_v1'), JSON.stringify(state));
            themedSuccess('已保存到素材库（本地备份）');
        }
        this.loadAssetLibrary();
    }

    /* ── AI 辅助 ── */
    bindAI() {
        const $ = (id) => document.getElementById(id);
        const link = (id, valId) => {
            const el = $(id),
                vEl = $(valId);
            if (el && vEl)
                el.addEventListener('input', () => {
                    vEl.textContent = el.value;
                });
        };
        link('aeInpaintStrength', 'aeInpaintStrVal');
        $('aeInpaintBtn')?.addEventListener('click', () => this.aiInpaint());
        $('aeOutpaintBtn')?.addEventListener('click', () => this.aiOutpaint());
        $('aeStyleBtn')?.addEventListener('click', () => this.aiStyleTransfer());
    }

    getCanvasDataUrl() {
        return this.canvas.toDataURL('image/png');
    }

    getMaskDataUrl(useFullCanvas = false) {
        if (!this.selection && !useFullCanvas) return null;
        const c = document.createElement('canvas');
        c.width = this.canvas.width;
        c.height = this.canvas.height;
        const cx = c.getContext('2d');
        cx.fillStyle = '#000';
        cx.fillRect(0, 0, c.width, c.height);
        cx.fillStyle = '#fff';
        if (this.selection) {
            const s = this.selection;
            cx.fillRect(Math.min(s.x, s.x + s.w), Math.min(s.y, s.y + s.h), Math.abs(s.w), Math.abs(s.h));
        } else {
            // 未框选时兜底整图重绘，避免按钮"无响应"体验
            cx.fillRect(0, 0, c.width, c.height);
        }
        return c.toDataURL('image/png');
    }

    getInpaintRegion() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (!this.selection) return { x: 0, y: 0, w, h, isWhole: true };
        const sx = Math.min(this.selection.x, this.selection.x + this.selection.w);
        const sy = Math.min(this.selection.y, this.selection.y + this.selection.h);
        const sw = Math.abs(this.selection.w);
        const sh = Math.abs(this.selection.h);
        return {
            x: Math.max(0, Math.min(w - 1, sx)),
            y: Math.max(0, Math.min(h - 1, sy)),
            w: Math.max(1, Math.min(w, sw)),
            h: Math.max(1, Math.min(h, sh)),
            isWhole: false,
        };
    }

    parseInpaintIntent(prompt = '') {
        const p = String(prompt || '').toLowerCase();
        if (/抠图|抠空|去背景|透明背景|remove background|transparent/i.test(p)) return 'remove_bg';
        if (/星空|夜空|银河|星河|宇宙|space|galaxy|starry/i.test(p)) return 'starry';
        if (/卡通|二次元|动漫|anime|cartoon/i.test(p)) return 'cartoon';
        if (/柔化|磨皮|平滑|smooth|soft/i.test(p)) return 'smooth';
        return 'general';
    }

    // 稳定局部重绘：本地必定生效，不依赖后端
    runLocalInpaintStable(prompt = '', strength = 0.65) {
        if (!this.imageLoaded) return { ok: false, message: '未加载图片' };
        const w = this.canvas.width;
        const h = this.canvas.height;
        const region = this.getInpaintRegion();
        const intent = this.parseInpaintIntent(prompt);
        const blurRadius = Math.max(1, Math.min(4, Math.round(1 + strength * 3)));
        const feather = Math.max(8, Math.min(64, Math.round(Math.min(region.w, region.h) * (0.08 + 0.2 * strength))));
        const noiseAmp = Math.max(6, Math.min(30, Math.round(8 + strength * 22)));

        const imgData = this.ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const src = new Uint8ClampedArray(data);
        const idx = (x, y) => (y * w + x) * 4;
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const edgeMin = (x, y) =>
            Math.min(x - region.x, y - region.y, region.x + region.w - 1 - x, region.y + region.h - 1 - y);
        const pseudoRand = (x, y) => {
            const n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
            return (n % 1000) / 1000;
        };

        // 用边缘像素估算背景色（给 remove_bg 模式用）
        let bgR = 0,
            bgG = 0,
            bgB = 0,
            bgCount = 0;
        for (let x = region.x; x < region.x + region.w; x += Math.max(1, Math.floor(region.w / 48))) {
            const top = idx(x, region.y);
            const bot = idx(x, region.y + region.h - 1);
            bgR += src[top] + src[bot];
            bgG += src[top + 1] + src[bot + 1];
            bgB += src[top + 2] + src[bot + 2];
            bgCount += 2;
        }
        for (let y = region.y; y < region.y + region.h; y += Math.max(1, Math.floor(region.h / 48))) {
            const lef = idx(region.x, y);
            const rig = idx(region.x + region.w - 1, y);
            bgR += src[lef] + src[rig];
            bgG += src[lef + 1] + src[rig + 1];
            bgB += src[lef + 2] + src[rig + 2];
            bgCount += 2;
        }
        if (bgCount > 0) {
            bgR /= bgCount;
            bgG /= bgCount;
            bgB /= bgCount;
        }

        for (let y = region.y; y < region.y + region.h; y++) {
            for (let x = region.x; x < region.x + region.w; x++) {
                let sumR = 0,
                    sumG = 0,
                    sumB = 0,
                    sumA = 0,
                    cnt = 0;
                for (let oy = -blurRadius; oy <= blurRadius; oy++) {
                    for (let ox = -blurRadius; ox <= blurRadius; ox++) {
                        const nx = clamp(x + ox, 0, w - 1);
                        const ny = clamp(y + oy, 0, h - 1);
                        const j = idx(nx, ny);
                        sumR += src[j];
                        sumG += src[j + 1];
                        sumB += src[j + 2];
                        sumA += src[j + 3];
                        cnt++;
                    }
                }

                const i = idx(x, y);
                const baseR = src[i],
                    baseG = src[i + 1],
                    baseB = src[i + 2],
                    baseA = src[i + 3];
                const avgR = sumR / cnt,
                    avgG = sumG / cnt,
                    avgB = sumB / cnt,
                    avgA = sumA / cnt;
                const edge = edgeMin(x, y);
                const featherW = clamp(edge / feather, 0, 1);
                const mix = 1 - featherW; // 越靠近中心，重绘越强
                const n = (pseudoRand(x, y) - 0.5) * noiseAmp;

                let outR = avgR;
                let outG = avgG;
                let outB = avgB;
                let outA = avgA;

                if (intent === 'starry') {
                    const t = (y - region.y) / Math.max(1, region.h - 1);
                    const skyR = 18 + t * 20;
                    const skyG = 30 + t * 28;
                    const skyB = 72 + t * 90;
                    outR = avgR * 0.25 + skyR * 0.75 + n * 0.5;
                    outG = avgG * 0.25 + skyG * 0.75 + n * 0.5;
                    outB = avgB * 0.25 + skyB * 0.75 + n * 0.7;
                    if (pseudoRand(x * 7, y * 11) < 0.0015 + strength * 0.005) {
                        outR = 230;
                        outG = 235;
                        outB = 255;
                    }
                } else if (intent === 'remove_bg') {
                    const dist = Math.abs(baseR - bgR) + Math.abs(baseG - bgG) + Math.abs(baseB - bgB);
                    const nearBg = dist < 58 + strength * 60;
                    outR = avgR * 0.7 + baseR * 0.3;
                    outG = avgG * 0.7 + baseG * 0.3;
                    outB = avgB * 0.7 + baseB * 0.3;
                    outA = nearBg ? baseA * (0.08 + (1 - mix) * 0.22) : baseA;
                } else if (intent === 'cartoon') {
                    const q = 36;
                    outR = Math.round((avgR + n) / q) * q;
                    outG = Math.round((avgG + n) / q) * q;
                    outB = Math.round((avgB + n) / q) * q;
                } else if (intent === 'smooth') {
                    outR = avgR * 0.85 + baseR * 0.15 + n * 0.3;
                    outG = avgG * 0.85 + baseG * 0.15 + n * 0.3;
                    outB = avgB * 0.85 + baseB * 0.15 + n * 0.3;
                } else {
                    outR = avgR * 0.7 + baseR * 0.3 + n * 0.5 + 4;
                    outG = avgG * 0.7 + baseG * 0.3 + n * 0.45 + 3;
                    outB = avgB * 0.7 + baseB * 0.3 + n * 0.4 + 2;
                }

                data[i] = clamp(baseR * featherW + outR * mix, 0, 255);
                data[i + 1] = clamp(baseG * featherW + outG * mix, 0, 255);
                data[i + 2] = clamp(baseB * featherW + outB * mix, 0, 255);
                data[i + 3] = clamp(baseA * featherW + outA * mix, 0, 255);
            }
        }

        this.ctx.putImageData(imgData, 0, 0);
        this.pushHistory();
        if (this.selection) this.drawSelection();
        return { ok: true, region, intent };
    }

    normalizeJimengCanvasSize() {
        const width = Number(this.canvas.width) || 1024;
        const height = Number(this.canvas.height) || 1024;
        const minPixels = 921600; // 与后端 validateJimengSize 保持一致
        let outW = Math.max(256, width);
        let outH = Math.max(256, height);
        const pixels = outW * outH;
        if (pixels < minPixels) {
            const scale = Math.sqrt(minPixels / pixels);
            outW = Math.round(outW * scale);
            outH = Math.round(outH * scale);
        }
        outW = Math.min(4096, outW);
        outH = Math.min(4096, outH);
        return `${outW}x${outH}`;
    }

    async callAiImageProxy(prompt, extra) {
        const endpoint = API_BASE + '/api/image-proxy';
        const payload = {
            prompt: prompt,
            provider: 'jimeng',
            mode: 'img2img',
            image: this.getCanvasDataUrl(),
            size: this.normalizeJimengCanvasSize(),
            strength: extra.strength || 0.65,
            // 优先请求 base64，避免外链图片被源站 403 拒绝
            jimeng: { response_format: 'b64_json', require_exact_size: false, extra_body: extra.extra_body || {} },
        };
        if (extra.mask) payload.mask = extra.mask;
        const controller = new AbortController();
        const timeoutMs = 90000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let res;
        try {
            res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
        } catch (err) {
            if (err && err.name === 'AbortError') {
                const timeoutErr = new Error(
                    `请求超时（${Math.round(timeoutMs / 1000)}秒），请重试或降低图片尺寸后再试`
                );
                timeoutErr._alreadyShown = false;
                throw timeoutErr;
            }
            throw err;
        } finally {
            clearTimeout(timer);
        }
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            showApiError(errData, res.status, '资产微调 AI');
            const err = new Error(errData.message || `HTTP ${res.status}`);
            err._alreadyShown = true;
            throw err;
        }
        const data = await res.json();
        return data.image_url;
    }

    async aiInpaint() {
        if (!this.imageLoaded) {
            themedWarn('请先加载图片');
            return;
        }
        const prompt = document.getElementById('aeInpaintPrompt')?.value?.trim();
        if (!prompt) {
            themedWarn('请填写重绘描述');
            return;
        }
        const strength = (Number(document.getElementById('aeInpaintStrength')?.value) || 65) / 100;
        const btn = document.getElementById('aeInpaintBtn');
        const oldText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 重绘中…';
        }

        // 第 1 阶段（必成功）：本地稳定重绘，保证"点了就有效果"
        const localResult = this.runLocalInpaintStable(prompt, strength);
        if (!localResult.ok) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = oldText || '<i class="fas fa-wand-magic-sparkles"></i> AI 局部重绘';
            }
            themedError(localResult.message || '局部重绘失败');
            return;
        }

        themedSuccess(localResult.region.isWhole ? '局部重绘已执行（整图模式）' : '局部重绘已执行（选区模式）');

        // 第 2 阶段（可选增强）：异步尝试即梦，失败不影响本地结果
        const inpaintPrompt = localResult.region.isWhole
            ? `${prompt}。请对整张图重绘，保留主体构图自然。`
            : `${prompt}。仅修改当前选区，选区外保持不变。`;
        const remoteStrength = Math.max(0.45, Math.min(0.85, strength));
        const jobId = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        this._latestInpaintJobId = jobId;

        try {
            const url = await this.callAiImageProxy(inpaintPrompt, { strength: remoteStrength });
            if (this._latestInpaintJobId === jobId && typeof url === 'string' && url) {
                const urlWithCb = /^https?:\/\//i.test(url)
                    ? `${url}${url.includes('?') ? '&' : '?'}_cb=${Date.now()}`
                    : url;
                this.loadImage(getProxyImageUrl(urlWithCb));
                themedSuccess('即梦重绘结果已覆盖本地重绘');
            }
        } catch (e) {
            console.warn('即梦重绘升级失败，已保留本地重绘结果:', e);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> AI 局部重绘';
            }
        }
    }

    async aiOutpaint() {
        if (!this.imageLoaded) {
            themedWarn('请先加载图片');
            return;
        }
        const dir = document.getElementById('aeOutpaintDir')?.value || 'all';
        const px = Number(document.getElementById('aeOutpaintPx')?.value) || 256;
        if (px < 64 || px > 1024) {
            themedError('扩展像素需在 64 - 1024 之间');
            return;
        }
        const prompt = '扩展画面边缘，保持内容连贯自然，风格一致';
        const btn = document.getElementById('aeOutpaintBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI 处理中…';
        try {
            const url = await this.callAiImageProxy(prompt, {
                strength: 0.7,
                extra_body: { reference_mode: 'outpaint', outpaint_direction: dir, outpaint_pixels: px },
            });
            this.loadImage(getProxyImageUrl(url));
            themedSuccess('扩图完成');
        } catch (e) {
            if (!e || !e._alreadyShown) {
                showApiError(e?.message || '扩图失败', 0, '资产微调 AI');
            }
            console.error(e);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i> AI 扩图';
        }
    }

    async aiStyleTransfer() {
        if (!this.imageLoaded) {
            themedWarn('请先加载图片');
            return;
        }
        const style = document.getElementById('aeStyleTransfer')?.value;
        if (!style) {
            themedWarn('请选择目标风格');
            return;
        }
        const styleNames = {
            pixel_art: '像素风格',
            watercolor: '水彩风格',
            oil_painting: '油画风格',
            anime: '日式动漫风格',
            chibi: 'Q版卡通风格',
            realistic: '写实风格',
            flat_vector: '扁平矢量风格',
        };
        const prompt = `将图片转换为${styleNames[style] || style}，保留原始内容和构图`;
        const btn = document.getElementById('aeStyleBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI 处理中…';
        try {
            const url = await this.callAiImageProxy(prompt, {
                strength: 0.55,
                extra_body: { reference_mode: 'style_transfer', target_style: style },
            });
            this.loadImage(getProxyImageUrl(url));
            themedSuccess('风格迁移完成');
        } catch (e) {
            if (!e || !e._alreadyShown) {
                showApiError(e?.message || '风格迁移失败', 0, '资产微调 AI');
            }
            console.error(e);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-palette"></i> AI 风格迁移';
        }
    }
}

// 兼容旧代码引用
const AIGenerator = AssetEditor;

const STYLE_PRESETS_KEY = 'style_presets_v1';

/** 将 data URL 缩放压缩，用于上传 API 或本地预设（减小体积） */
