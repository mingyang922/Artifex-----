/**
 * Artifex Region Themes Engine - 地区文化主题引擎
 * 管理主题切换、粒子系统、装饰层、字体加载、持久化
 */
'use strict';

(function () {
    /* ═══════════════════════════════════════════════
       主题注册表
       ═══════════════════════════════════════════════ */
    const THEMES = {
        off: {
            id: 'off',
            name: { zh: '赛博朋克', zht: '賽博朋克', en: 'Cyberpunk', ja: 'サイバーパンク', ko: '사이버펑크' },
            class: '',
            colors: { accent: '#00f0ff', secondary: '#8b5cf6' },
            meta: '#00f0ff',
            font: null,
            initParticles: null,
            gradientCSS: '',
            decorSVG: null,
        },
        china: {
            id: 'china',
            name: { zh: '华夏丹青', zht: '華夏丹青', en: 'Ink Wash', ja: '水墨画', ko: '수묵화' },
            class: 'theme-china',
            colors: { accent: '#e5383b', secondary: '#daa520' },
            meta: '#e5383b',
            font: [
                { family: 'ZCOOL XiaoWei', url: 'https://fonts.loli.net/css2?family=ZCOOL+XiaoWei&display=swap' },
                { family: 'Noto Serif SC', url: 'https://fonts.loli.net/css2?family=Noto+Serif+SC:wght@400;700&display=swap' },
            ],
            initParticles: initChinaParticles,
            getDecorSVG: getChinaDecorSVG,
        },
        japan: {
            id: 'japan',
            name: { zh: '和風物語', zht: '和風物語', en: 'Ukiyo-e', ja: '和風物語', ko: '우키요에' },
            class: 'theme-japan',
            colors: { accent: '#e8607a', secondary: '#5b7fa5' },
            meta: '#e8607a',
            font: [
                { family: 'Shippori Mincho', url: 'https://fonts.loli.net/css2?family=Shippori+Mincho:wght@400;600;700&display=swap' },
                { family: 'Noto Sans JP', url: 'https://fonts.loli.net/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
            ],
            initParticles: initJapanParticles,
            getDecorSVG: getJapanDecorSVG,
        },
        korea: {
            id: 'korea',
            name: { zh: '韩流霓虹', zht: '韓流霓虹', en: 'K-Neon', ja: 'K-ネオン', ko: 'K-네온' },
            class: 'theme-korea',
            colors: { accent: '#c8a0f0', secondary: '#f080a8' },
            meta: '#c8a0f0',
            font: [
                { family: 'Black Han Sans', url: 'https://fonts.loli.net/css2?family=Black+Han+Sans&display=swap' },
                { family: 'Noto Sans KR', url: 'https://fonts.loli.net/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap' },
            ],
            initParticles: initKoreaParticles,
            getDecorSVG: getKoreaDecorSVG,
        },
        uk: {
            id: 'uk',
            name: { zh: '英伦油画', zht: '英倫油畫', en: 'Oil Painting', ja: '油絵', ko: '유화' },
            class: 'theme-uk',
            colors: { accent: '#c9956b', secondary: '#d4a855' },
            meta: '#c9956b',
            font: [
                { family: 'Playfair Display', url: 'https://fonts.loli.net/css2?family=Playfair+Display:wght@400;600;700&display=swap' },
                { family: 'Lora', url: 'https://fonts.loli.net/css2?family=Lora:wght@400;500;600;700&display=swap' },
                { family: 'Cormorant Garamond', url: 'https://fonts.loli.net/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap' },
            ],
            initParticles: initUKParticles,
            getDecorSVG: getUKDecorSVG,
        },
        tc: {
            id: 'tc',
            name: { zh: '華夏雅韻', zht: '華夏雅韻', en: 'Classical CN', ja: '古典中華', ko: '고전중화' },
            class: 'theme-tc',
            colors: { accent: '#e8a838', secondary: '#38bdf8' },
            meta: '#e8a838',
            font: [
                { family: 'Ma Shan Zheng', url: 'https://fonts.loli.net/css2?family=Ma+Shan+Zheng&display=swap' },
                { family: 'Noto Serif SC', url: 'https://fonts.loli.net/css2?family=Noto+Serif+SC:wght@400;700&display=swap' },
            ],
            initParticles: initTCParticles,
            getDecorSVG: getTCDecorSVG,
        },
    };

    /* ═══════════════════════════════════════════════
       状态
       ═══════════════════════════════════════════════ */
    const STORAGE_KEY = 'artifex-region-theme';
    let currentMode = 'off';
    try { currentMode = localStorage.getItem(STORAGE_KEY) || 'off'; } catch (e) { /* Safari private */ }
    let currentTheme = null;
    let tspInstance = null;      // tsParticles 实例
    let decorLayer = null;
    let decorClearTimer = null;
    let decorActiveTimer = null;
    let loadedFonts = new Set();
    let particleGeneration = 0; // 防止异步竞态
    const decorSVGCache = {}; // 缓存 SVG 字符串

    /* ═══════════════════════════════════════════════
       初始化
       ═══════════════════════════════════════════════ */
    function init() {
        createContainers();
        applyMode(currentMode, false);

        // 监听语言变化
        window.addEventListener('languageChanged', function (e) {
            if (currentMode === 'auto') {
                applyAutoTheme(false);
            }
        });

        // 监听跨标签页同步
        window.addEventListener('storage', function (e) {
            if (e.key === STORAGE_KEY && e.newValue !== currentMode) {
                currentMode = e.newValue || 'off';
                applyMode(currentMode, true);
            }
        });
    }

    /* ═══════════════════════════════════════════════
       创建 DOM 容器
       ═══════════════════════════════════════════════ */
    function createContainers() {
        // tsParticles 容器（tsParticles 会自动创建 canvas）
        if (!document.getElementById('theme-particle-canvas')) {
            var tspDiv = document.createElement('div');
            tspDiv.id = 'theme-particle-canvas';
            tspDiv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;';
            document.body.appendChild(tspDiv);
        }
        // 装饰层
        if (!decorLayer) {
            decorLayer = document.createElement('div');
            decorLayer.className = 'theme-decor-layer';
            decorLayer.id = 'theme-decor-layer';
            document.body.appendChild(decorLayer);
        }
    }

    /* ═══════════════════════════════════════════════
       主题应用
       ═══════════════════════════════════════════════ */
    function applyMode(mode, animate) {
        currentMode = mode;
        try { localStorage.setItem(STORAGE_KEY, mode); } catch (e) { /* quota or private */ }

        if (mode === 'auto') {
            applyAutoTheme(animate);
        } else if (THEMES[mode]) {
            applyTheme(THEMES[mode], animate);
        } else {
            applyTheme(THEMES.off, animate);
        }
    }

    function applyAutoTheme(animate) {
        var lang = (window.i18n && window.i18n.getLanguage()) || localStorage.getItem('artifex-lang') || 'zh';
        var country = getUserCountry();
        var theme = resolveTheme(lang, country);
        applyTheme(theme, animate);
    }

    function resolveTheme(lang, country) {
        var c = (country || '').toLowerCase();
        if (lang === 'zh' && (c === 'cn' || c === '')) return THEMES.china;
        if (lang === 'ja') return THEMES.japan;
        if (lang === 'ko') return THEMES.korea;
        if (lang === 'en') return THEMES.uk;
        if (lang === 'zht') return THEMES.tc;
        // zh without cn country → china as default
        if (lang === 'zh') return THEMES.china;
        return THEMES.off;
    }

    function getUserCountry() {
        try {
            var config = JSON.parse(localStorage.getItem('userConfig'));
            return (config && config.personalInfo && config.personalInfo.country) || '';
        } catch (e) {
            return '';
        }
    }

    function applyTheme(theme, animate) {
        if (currentTheme && currentTheme.id === theme.id) return;

        var html = document.documentElement;
        var useGSAP = animate && typeof gsap !== 'undefined';

        // GSAP 过渡动画（先取消旧动画）
        if (useGSAP) {
            gsap.killTweensOf(document.body);
            gsap.to(document.body, {
                opacity: 0.85, duration: 0.25, ease: 'power1.in',
                onComplete: function () { applyThemeCore(theme, html); gsap.to(document.body, { opacity: 1, duration: 0.4, ease: 'power1.out' }); }
            });
        } else {
            applyThemeCore(theme, html);
        }
    }

    function applyThemeCore(theme, html) {
        // 移除旧主题类
        if (currentTheme && currentTheme.class) {
            html.classList.remove(currentTheme.class);
        }

        // 停止旧粒子
        stopParticles();

        // 清除旧装饰
        if (decorClearTimer) { clearTimeout(decorClearTimer); decorClearTimer = null; }
        if (decorLayer) {
            decorLayer.classList.remove('active');
            decorClearTimer = setTimeout(function () {
                if (decorLayer) decorLayer.innerHTML = '';
                decorClearTimer = null;
            }, 800);
        }

        // 应用新主题
        currentTheme = theme;

        if (theme.class) {
            html.classList.add(theme.class);
        }

        // 赛博朋克专属元素控制
        toggleCyberpunkEffects(!theme.class);

        // 加载字体
        if (theme.font) loadFonts(theme.font);

        // 更新装饰层
        if (decorActiveTimer) { clearTimeout(decorActiveTimer); decorActiveTimer = null; }
        var decorSVG = null;
        if (theme.getDecorSVG) {
            var cacheKey = theme.id;
            decorSVG = decorSVGCache[cacheKey] || (decorSVGCache[cacheKey] = theme.getDecorSVG());
        }
        if (decorSVG && decorLayer) {
            decorLayer.innerHTML = decorSVG;
            decorLayer.classList.add('active');
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(decorLayer, { opacity: 0 }, { opacity: 1, duration: 1, delay: 0.1, ease: 'power1.out' });
            }
        }

        // 启动 tsParticles 粒子
        if (theme.initParticles) {
            setTimeout(function () { theme.initParticles(); }, 150);
        }

        // 更新 meta theme-color
        updateMetaThemeColor(theme.meta);

        // 派发事件
        window.dispatchEvent(new CustomEvent('regionThemeChanged', {
            detail: { theme: theme.id, mode: currentMode }
        }));
    }

    /* ═══════════════════════════════════════════════
       字体加载
       ═══════════════════════════════════════════════ */
    function loadFonts(fonts) {
        fonts.forEach(function (f) {
            if (loadedFonts.has(f.family)) return;
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = f.url;
            document.head.appendChild(link);
            loadedFonts.add(f.family);
        });
    }

    /* ═══════════════════════════════════════════════
       Meta theme-color
       ═══════════════════════════════════════════════ */
    function updateMetaThemeColor(color) {
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', color);
    }

    /* ═══════════════════════════════════════════════
       赛博朋克专属元素控制
       非赛博朋克主题时禁用：指针光晕、外部粒子网络
       ═══════════════════════════════════════════════ */
    function toggleCyberpunkEffects(enable) {
        // 指针光晕
        var glows = document.querySelectorAll('.pointer-glow, .pointer-glow--lag');
        glows.forEach(function (el) {
            el.style.display = enable ? '' : 'none';
        });

        // 外部粒子网络（ParticleNetwork 创建的全屏画布）
        // 标记：主题粒子画布有 id='theme-particle-canvas'
        var allCanvases = document.querySelectorAll('canvas');
        allCanvases.forEach(function (c) {
            if (c.id === 'theme-particle-canvas') return;
            // 非主题画布 + 全屏固定定位 = 外部粒子网络
            var pos = window.getComputedStyle(c).position;
            if (pos === 'fixed') {
                c.style.display = enable ? '' : 'none';
            }
        });

        // PageEffects 指针跟踪
        if (!enable && window.PageEffects) {
            document.body.classList.remove('pointer-glow-active');
        }

        // 延迟再检查一次（某些粒子库延迟初始化）
        if (!enable) {
            setTimeout(function () {
                var lateCanvases = document.querySelectorAll('canvas');
                lateCanvases.forEach(function (c) {
                    if (c.id === 'theme-particle-canvas') return;
                    var pos = window.getComputedStyle(c).position;
                    if (pos === 'fixed') {
                        c.style.display = 'none';
                    }
                });
            }, 500);
        }
    }

    /* ═══════════════════════════════════════════════
       粒子系统 - tsParticles 驱动
       ═══════════════════════════════════════════════ */
    function stopParticles() {
        if (tspInstance) {
            tspInstance.destroy();
            tspInstance = null;
        }
    }

    async function startThemeParticles(config) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (typeof tsParticles === 'undefined') return;
        particleGeneration++;
        var myGen = particleGeneration;

        try {
            var instance = await tsParticles.load({
                id: 'theme-particle-canvas',
                options: config,
            });
            // 检查是否已被更新的主题取代
            if (myGen !== particleGeneration) {
                instance.destroy(); // 销毁过期实例
                return;
            }
            tspInstance = instance;
        } catch (e) {
            // tsParticles 初始化失败时静默降级
        }
    }

    /* ── 华夏丹青：墨滴晕散 ── */
    function initChinaParticles() {
        startThemeParticles({
            fullScreen: { enable: false },
            particles: {
                number: { value: 30, density: { enable: true, width: 1920, height: 1080 } },
                color: { value: ['#3c3228', '#4a3c2e', '#5a4a38'] },
                shape: { type: 'circle' },
                opacity: { value: { min: 0.1, max: 0.4 }, animation: { enable: true, speed: 0.02, minimumValue: 0.05 } },
                size: { value: { min: 1, max: 4 }, animation: { enable: true, speed: 0.5, minimumValue: 0.5 } },
                move: {
                    enable: true, speed: 0.3, direction: 'top', random: true, straight: false,
                    outModes: { default: 'out' },
                },
                twinkle: { particles: { enable: true, frequency: 0.05, color: { value: '#3c3228' }, opacity: 0.15 } },
            },
            background: { color: 'transparent' },
            detectRetina: true,
        });
    }

    /* ── 和風物語：樱花飘落（黄昏暖色调，UI下方层） ── */
    function initJapanParticles() {
        if (typeof tsParticles !== 'undefined' && tsParticles.addShape && !window._sakuraShapeAdded) {
            tsParticles.addShape('sakura', function (context, particle, radius) {
                context.beginPath();
                var s = radius;
                for (var i = 0; i < 5; i++) {
                    var angle = (i * 72 - 90) * Math.PI / 180;
                    var px = Math.cos(angle) * s;
                    var py = Math.sin(angle) * s;
                    if (i === 0) context.moveTo(px, py);
                    else context.lineTo(px, py);
                    var midAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
                    var mx = Math.cos(midAngle) * s * 0.4;
                    var my = Math.sin(midAngle) * s * 0.4;
                    context.lineTo(mx, my);
                }
                context.closePath();
                context.fill();
            });
            window._sakuraShapeAdded = true;
        }

        startThemeParticles({
            fullScreen: { enable: false },
            particles: {
                number: { value: 20, density: { enable: true, width: 1920, height: 1080 } },
                color: { value: ['rgba(232,96,122,0.7)', 'rgba(240,128,144,0.6)', 'rgba(232,144,106,0.5)', 'rgba(255,180,180,0.6)'] },
                shape: { type: 'sakura' },
                opacity: { value: { min: 0.15, max: 0.45 } },
                size: { value: { min: 8, max: 16 } },
                rotate: {
                    value: { min: 0, max: 360 },
                    animation: { enable: true, speed: 0.5, sync: false },
                    direction: 'random',
                },
                move: {
                    enable: true, speed: { min: 0.15, max: 0.4 },
                    direction: 'bottom', random: true, straight: false,
                    outModes: { default: 'out' },
                    wobble: { enable: true, distance: 4, speed: 1 },
                },
            },
            background: { color: 'transparent' },
            detectRetina: true,
        });
    }

    /* ── 韩流霓虹：星光闪烁 ── */
    function initKoreaParticles() {
        startThemeParticles({
            fullScreen: { enable: false },
            particles: {
                number: { value: 50, density: { enable: true, width: 1920, height: 1080 } },
                color: { value: ['#c8a0f0', '#f080a8', '#a0c8f0'] },
                shape: { type: 'circle' },
                opacity: {
                    value: { min: 0.2, max: 0.8 },
                    animation: { enable: true, speed: 0.03, minimumValue: 0.1, sync: false },
                },
                size: { value: { min: 1, max: 3 } },
                move: {
                    enable: true, speed: 0.15, direction: 'none', random: true,
                    outModes: { default: 'out' },
                },
                twinkle: {
                    particles: { enable: true, frequency: 0.06, color: { value: '#c8a0f0' }, opacity: 0.5 },
                    lines: { enable: false },
                },
                shadow: {
                    enable: true, color: '#c8a0f0', blur: 8,
                },
            },
            background: { color: 'transparent' },
            detectRetina: true,
        });
    }

    /* ── 英伦油画：金色光尘 ── */
    function initUKParticles() {
        startThemeParticles({
            fullScreen: { enable: false },
            particles: {
                number: { value: 35, density: { enable: true, width: 1920, height: 1080 } },
                color: { value: ['#d4a855', '#c9956b', '#e0b868'] },
                shape: { type: 'circle' },
                opacity: {
                    value: { min: 0.15, max: 0.5 },
                    animation: { enable: true, speed: 0.015, minimumValue: 0.08, sync: false },
                },
                size: { value: { min: 0.5, max: 2 } },
                move: {
                    enable: true, speed: { min: 0.1, max: 0.3 },
                    direction: 'top', random: true, straight: false,
                    outModes: { default: 'out' },
                },
                twinkle: { particles: { enable: true, frequency: 0.04, opacity: 0.4 } },
            },
            background: { color: 'transparent' },
            detectRetina: true,
        });
    }

    /* ── 華夏雅韻：萤火暖光 ── */
    function initTCParticles() {
        startThemeParticles({
            fullScreen: { enable: false },
            particles: {
                number: { value: 25, density: { enable: true, width: 1920, height: 1080 } },
                color: { value: ['#e8a838', '#f0c060', '#d09020'] },
                shape: { type: 'circle' },
                opacity: {
                    value: { min: 0.15, max: 0.55 },
                    animation: { enable: true, speed: 0.012, minimumValue: 0.08, sync: false },
                },
                size: { value: { min: 1.5, max: 3.5 }, animation: { enable: true, speed: 0.3, minimumValue: 0.8 } },
                move: {
                    enable: true, speed: { min: 0.15, max: 0.4 },
                    direction: 'none', random: true, straight: false,
                    outModes: { default: 'out' },
                },
                twinkle: { particles: { enable: true, frequency: 0.03, opacity: 0.5 } },
                shadow: {
                    enable: true, color: '#e8a838', blur: 8,
                },
            },
            background: { color: 'transparent' },
            detectRetina: true,
        });
    }

    /* ═══════════════════════════════════════════════
       装饰 SVG（建筑剪影、特色景观）
       ═══════════════════════════════════════════════ */

    // 华夏丹青 - 飞檐宝塔 + 远山
    function getChinaDecorSVG() {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.12">' +
            // 远山
            '<path d="M0 750 Q200 600 400 680 Q600 550 800 650 Q1000 500 1200 620 Q1400 540 1600 660 Q1800 580 1920 700 L1920 1080 L0 1080Z" fill="rgba(100,80,60,0.4)"/>' +
            // 宝塔
            '<g transform="translate(300,520)" opacity="0.5">' +
            '<rect x="15" y="80" width="30" height="60" fill="rgba(80,60,40,0.6)"/>' +
            '<polygon points="0,80 60,80 30,50" fill="rgba(80,60,40,0.5)"/>' +
            '<polygon points="5,50 55,50 30,25" fill="rgba(80,60,40,0.4)"/>' +
            '<polygon points="10,25 50,25 30,5" fill="rgba(80,60,40,0.3)"/>' +
            '</g>' +
            // 飞檐亭阁
            '<g transform="translate(1400,560)" opacity="0.4">' +
            '<rect x="10" y="40" width="80" height="50" fill="rgba(80,60,40,0.5)"/>' +
            '<path d="M-10 40 Q50 10 110 40" stroke="rgba(80,60,40,0.6)" fill="none" stroke-width="3"/>' +
            '<path d="M-5 38 Q50 15 105 38" fill="rgba(80,60,40,0.4)"/>' +
            '</g>' +
            '</svg>';
    }

    // 和風物語 - 黄昏富士山全景插画
    function getJapanDecorSVG() {
        var uid = Date.now();
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">' +
            '<defs>' +
            // 天空渐变
            '<linearGradient id="jSky' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#e8a0b0"/>' +
            '<stop offset="20%" stop-color="#f0b8a0"/>' +
            '<stop offset="35%" stop-color="#f8c8a0"/>' +
            '<stop offset="50%" stop-color="#e8b0a8"/>' +
            '<stop offset="70%" stop-color="#c098b8"/>' +
            '<stop offset="85%" stop-color="#8878a8"/>' +
            '<stop offset="100%" stop-color="#5a4878"/>' +
            '</linearGradient>' +
            // 富士山渐变
            '<linearGradient id="jFuji' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#8a7aa0"/>' +
            '<stop offset="40%" stop-color="#6a5a80"/>' +
            '<stop offset="70%" stop-color="#5a4a6a"/>' +
            '<stop offset="100%" stop-color="#4a3a5a"/>' +
            '</linearGradient>' +
            // 夕阳照射面
            '<linearGradient id="jFujiLight' + uid + '" x1="0.3" y1="0" x2="0.8" y2="1">' +
            '<stop offset="0%" stop-color="rgba(240,180,140,0.3)"/>' +
            '<stop offset="100%" stop-color="rgba(200,120,100,0.1)"/>' +
            '</linearGradient>' +
            '</defs>' +

            // 天空
            '<rect width="1920" height="1080" fill="url(#jSky' + uid + ')"/>' +

            // 太阳光晕
            '<circle cx="1250" cy="280" r="200" fill="rgba(255,220,180,0.25)"/>' +
            '<circle cx="1250" cy="280" r="120" fill="rgba(255,230,200,0.2)"/>' +
            '<circle cx="1250" cy="280" r="60" fill="rgba(255,240,220,0.15)"/>' +

            // 远山（淡紫灰）
            '<path d="M0 620 Q200 560 400 590 Q600 540 800 570 Q1000 530 1200 560 Q1400 520 1600 550 Q1800 510 1920 540 L1920 750 L0 750Z" fill="rgba(100,80,120,0.3)"/>' +

            // 富士山主体
            '<path d="M700 700 L960 280 L1220 700Z" fill="url(#jFuji' + uid + ')"/>' +
            // 富士山夕阳面
            '<path d="M960 280 L1220 700 L1050 700 L960 380Z" fill="url(#jFujiLight' + uid + ')"/>' +
            // 雪顶
            '<path d="M900 340 L960 280 L1020 340 L1000 360 L980 345 L960 360 L940 345 L920 360Z" fill="rgba(255,255,255,0.7)"/>' +
            '<path d="M920 340 L960 280 L1000 340 L990 350 L970 340 L950 350 L930 340Z" fill="rgba(255,255,255,0.5)"/>' +

            // 樱花林远景（底部）
            '<ellipse cx="300" cy="750" rx="180" ry="40" fill="rgba(200,80,100,0.25)"/>' +
            '<ellipse cx="600" cy="760" rx="150" ry="35" fill="rgba(200,80,100,0.2)"/>' +
            '<ellipse cx="1100" cy="755" rx="160" ry="38" fill="rgba(200,80,100,0.22)"/>' +
            '<ellipse cx="1500" cy="760" rx="140" ry="32" fill="rgba(200,80,100,0.18)"/>' +

            // 日式建筑轮廓（底部中央）
            '<g opacity="0.4">' +
            //  pagoda
            '<rect x="880" y="720" width="60" height="50" fill="#3a2840"/>' +
            '<polygon points="870,720 910,690 950,720" fill="#4a3850"/>' +
            '<polygon points="875,700 910,675 945,700" fill="#4a3850"/>' +
            '<polygon points="880,680 910,660 940,680" fill="#4a3850"/>' +
            // 小屋
            '<rect x="780" y="740" width="40" height="30" fill="#3a2840"/>' +
            '<polygon points="775,740 800,720 825,740" fill="#4a3850"/>' +
            '<rect x="1020" y="740" width="40" height="30" fill="#3a2840"/>' +
            '<polygon points="1015,740 1040,720 1065,740" fill="#4a3850"/>' +
            '</g>' +

            // 红色长桥
            '<g opacity="0.35">' +
            '<path d="M600 780 Q750 750 900 780 Q1050 750 1200 780" stroke="#c85050" stroke-width="4" fill="none"/>' +
            '<path d="M600 785 Q750 755 900 785 Q1050 755 1200 785" stroke="#c85050" stroke-width="2" fill="none"/>' +
            // 桥柱
            '<line x1="700" y1="770" x2="700" y2="800" stroke="#c85050" stroke-width="2"/>' +
            '<line x1="850" y1="760" x2="850" y2="800" stroke="#c85050" stroke-width="2"/>' +
            '<line x1="1000" y1="760" x2="1000" y2="800" stroke="#c85050" stroke-width="2"/>' +
            '<line x1="1150" y1="770" x2="1150" y2="800" stroke="#c85050" stroke-width="2"/>' +
            '</g>' +

            // 底部地面
            '<rect x="0" y="800" width="1920" height="280" fill="rgba(40,25,50,0.6)"/>' +

            // 左侧樱花树枝
            '<g opacity="0.7">' +
            '<path d="M-20 200 Q80 250 120 350 Q140 400 100 480" stroke="#5a3a30" stroke-width="6" fill="none"/>' +
            '<path d="M80 280 Q120 260 160 290" stroke="#5a3a30" stroke-width="3" fill="none"/>' +
            '<path d="M100 350 Q60 330 40 360" stroke="#5a3a30" stroke-width="3" fill="none"/>' +
            // 樱花
            '<circle cx="160" cy="280" r="12" fill="rgba(232,96,122,0.6)"/>' +
            '<circle cx="145" cy="270" r="10" fill="rgba(240,128,144,0.5)"/>' +
            '<circle cx="175" cy="275" r="8" fill="rgba(232,96,122,0.4)"/>' +
            '<circle cx="40" cy="350" r="11" fill="rgba(232,96,122,0.55)"/>' +
            '<circle cx="55" cy="340" r="9" fill="rgba(240,128,144,0.45)"/>' +
            '<circle cx="30" cy="345" r="7" fill="rgba(232,96,122,0.4)"/>' +
            '<circle cx="90" cy="420" r="14" fill="rgba(232,96,122,0.5)"/>' +
            '<circle cx="110" cy="410" r="10" fill="rgba(240,128,144,0.4)"/>' +
            '<circle cx="75" cy="430" r="8" fill="rgba(232,96,122,0.35)"/>' +
            '<circle cx="120" cy="470" r="12" fill="rgba(232,96,122,0.45)"/>' +
            '<circle cx="100" cy="480" r="9" fill="rgba(240,128,144,0.35)"/>' +
            '</g>' +

            // 右侧樱花树枝
            '<g opacity="0.65">' +
            '<path d="M1940 250 Q1850 300 1820 400 Q1800 470 1850 550" stroke="#5a3a30" stroke-width="6" fill="none"/>' +
            '<path d="M1860 320 Q1820 300 1790 330" stroke="#5a3a30" stroke-width="3" fill="none"/>' +
            '<path d="M1830 420 Q1870 400 1900 430" stroke="#5a3a30" stroke-width="3" fill="none"/>' +
            // 樱花
            '<circle cx="1790" cy="320" r="12" fill="rgba(232,96,122,0.55)"/>' +
            '<circle cx="1805" cy="310" r="10" fill="rgba(240,128,144,0.45)"/>' +
            '<circle cx="1775" cy="315" r="8" fill="rgba(232,96,122,0.4)"/>' +
            '<circle cx="1900" cy="420" r="11" fill="rgba(232,96,122,0.5)"/>' +
            '<circle cx="1885" cy="410" r="9" fill="rgba(240,128,144,0.4)"/>' +
            '<circle cx="1910" cy="430" r="7" fill="rgba(232,96,122,0.35)"/>' +
            '<circle cx="1840" cy="490" r="13" fill="rgba(232,96,122,0.5)"/>' +
            '<circle cx="1860" cy="480" r="10" fill="rgba(240,128,144,0.4)"/>' +
            '<circle cx="1825" cy="500" r="8" fill="rgba(232,96,122,0.35)"/>' +
            '<circle cx="1850" cy="540" r="11" fill="rgba(232,96,122,0.45)"/>' +
            '<circle cx="1870" cy="530" r="8" fill="rgba(240,128,144,0.35)"/>' +
            '</g>' +

            // 左上角小花枝
            '<g opacity="0.4">' +
            '<path d="M0 0 Q60 40 80 100" stroke="#5a3a30" stroke-width="3" fill="none"/>' +
            '<circle cx="80" cy="95" r="8" fill="rgba(232,96,122,0.5)"/>' +
            '<circle cx="70" cy="85" r="6" fill="rgba(240,128,144,0.4)"/>' +
            '<circle cx="90" cy="90" r="5" fill="rgba(232,96,122,0.35)"/>' +
            '</g>' +

            '</svg>';
    }

    // 韩流霓虹 - 景福宫轮廓 + 圆窗
    function getKoreaDecorSVG() {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.1">' +
            // 景福宫轮廓（简化）
            '<g transform="translate(1300,500)" opacity="0.35">' +
            '<rect x="20" y="50" width="160" height="80" fill="rgba(167,139,250,0.3)"/>' +
            '<path d="M10 50 Q100 10 190 50" stroke="rgba(167,139,250,0.4)" fill="none" stroke-width="3"/>' +
            '<rect x="70" y="70" width="60" height="60" fill="rgba(167,139,250,0.2)"/>' +
            '</g>' +
            // 圆窗（韩式传统窗）
            '<g transform="translate(200,600)" opacity="0.3">' +
            '<circle cx="50" cy="50" r="45" stroke="rgba(244,114,182,0.4)" fill="none" stroke-width="3"/>' +
            '<line x1="50" y1="5" x2="50" y2="95" stroke="rgba(244,114,182,0.3)" stroke-width="2"/>' +
            '<line x1="5" y1="50" x2="95" y2="50" stroke="rgba(244,114,182,0.3)" stroke-width="2"/>' +
            '</g>' +
            '</svg>';
    }

    // 英伦油画 - 大本钟 + 塔桥
    function getUKDecorSVG() {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.12">' +
            // 大本钟
            '<g transform="translate(100,350)" opacity="0.4">' +
            '<rect x="20" y="0" width="60" height="200" fill="rgba(201,149,107,0.35)"/>' +
            '<rect x="15" y="-20" width="70" height="25" fill="rgba(201,149,107,0.4)"/>' +
            '<polygon points="30,-20 70,-20 50,-50" fill="rgba(201,149,107,0.35)"/>' +
            '<circle cx="50" cy="60" r="18" stroke="rgba(201,149,107,0.5)" fill="none" stroke-width="2"/>' +
            '<rect x="35" y="100" width="30" height="100" fill="rgba(201,149,107,0.25)"/>' +
            '</g>' +
            // 塔桥
            '<g transform="translate(1500,500)" opacity="0.35">' +
            '<rect x="0" y="0" width="30" height="250" fill="rgba(201,149,107,0.3)"/>' +
            '<rect x="170" y="0" width="30" height="250" fill="rgba(201,149,107,0.3)"/>' +
            '<rect x="0" y="80" width="200" height="20" fill="rgba(201,149,107,0.25)"/>' +
            '<rect x="0" y="160" width="200" height="20" fill="rgba(201,149,107,0.25)"/>' +
            '<path d="M30 0 Q100 -30 170 0" stroke="rgba(201,149,107,0.35)" fill="none" stroke-width="3"/>' +
            '</g>' +
            // 丘陵
            '<path d="M0 850 Q400 780 800 820 Q1200 760 1920 850 L1920 1080 L0 1080Z" fill="rgba(120,100,70,0.2)"/>' +
            '</svg>';
    }

    // 華夏雅韻 - 亭台楼阁 + 云纹
    function getTCDecorSVG() {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.1">' +
            // 亭台
            '<g transform="translate(1400,520)" opacity="0.4">' +
            '<rect x="15" y="50" width="70" height="50" fill="rgba(232,168,56,0.3)"/>' +
            '<path d="M-5 50 Q50 15 105 50" stroke="rgba(232,168,56,0.4)" fill="none" stroke-width="2.5"/>' +
            '<path d="M0 48 Q50 20 100 48" fill="rgba(232,168,56,0.25)"/>' +
            '<rect x="35" y="65" width="30" height="35" fill="rgba(232,168,56,0.2)"/>' +
            '</g>' +
            // 楼阁
            '<g transform="translate(200,480)" opacity="0.35">' +
            '<rect x="10" y="70" width="80" height="50" fill="rgba(232,168,56,0.3)"/>' +
            '<rect x="15" y="30" width="70" height="45" fill="rgba(232,168,56,0.25)"/>' +
            '<path d="M5 30 Q50 5 95 30" fill="rgba(232,168,56,0.3)"/>' +
            '<path d="M10 0 Q50 -15 90 0" fill="rgba(232,168,56,0.25)"/>' +
            '</g>' +
            // 云纹装饰
            '<g transform="translate(800,200)" opacity="0.15">' +
            '<path d="M0 0 Q20 -15 40 0 Q60 -15 80 0 Q60 10 40 0 Q20 10 0 0Z" fill="rgba(232,168,56,0.4)"/>' +
            '<path d="M100 10 Q120 -5 140 10 Q160 -5 180 10 Q160 20 140 10 Q120 20 100 10Z" fill="rgba(56,189,248,0.3)"/>' +
            '</g>' +
            '</svg>';
    }

    /* ═══════════════════════════════════════════════
       公开 API
       ═══════════════════════════════════════════════ */
    function setMode(mode) {
        applyMode(mode, true);
    }

    function getMode() {
        return currentMode;
    }

    function getCurrentTheme() {
        return currentTheme;
    }

    function getAvailableThemes() {
        return Object.keys(THEMES).map(function (key) {
            return { id: key, name: THEMES[key].name };
        });
    }

    // DOM 就绪后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 暴露全局 API
    window.RegionThemes = {
        init: init,
        setMode: setMode,
        getMode: getMode,
        getCurrentTheme: getCurrentTheme,
        getAvailableThemes: getAvailableThemes,
    };
})();
