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
            colors: { accent: '#c82e3b', secondary: '#2e5e8a' },
            meta: '#c82e3b',
            font: [
                { family: 'ZCOOL XiaoWei', url: 'https://fonts.loli.net/css2?family=ZCOOL+XiaoWei&display=swap' },
                {
                    family: 'Noto Serif SC',
                    url: 'https://fonts.loli.net/css2?family=Noto+Serif+SC:wght@400;700&display=swap',
                },
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
                {
                    family: 'Shippori Mincho',
                    url: 'https://fonts.loli.net/css2?family=Shippori+Mincho:wght@400;600;700&display=swap',
                },
                {
                    family: 'Noto Sans JP',
                    url: 'https://fonts.loli.net/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',
                },
            ],
            initParticles: initJapanParticles,
            getDecorSVG: null,
        },
        korea: {
            id: 'korea',
            name: { zh: '韩流霓虹', zht: '韓流霓虹', en: 'K-Neon', ja: 'K-ネオン', ko: 'K-네온' },
            class: 'theme-korea',
            colors: { accent: '#b088f9', secondary: '#ff79c6' },
            meta: '#b088f9',
            font: [
                { family: 'Black Han Sans', url: 'https://fonts.loli.net/css2?family=Black+Han+Sans&display=swap' },
                {
                    family: 'Noto Sans KR',
                    url: 'https://fonts.loli.net/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap',
                },
            ],
            initParticles: initKoreaParticles,
            getDecorSVG: getKoreaDecorSVG,
        },
        uk: {
            id: 'uk',
            name: { zh: '英伦油画', zht: '英倫油畫', en: 'Oil Painting', ja: '油絵', ko: '유화' },
            class: 'theme-uk',
            colors: { accent: '#d4af37', secondary: '#a05a2c' },
            meta: '#d4af37',
            font: [
                {
                    family: 'Playfair Display',
                    url: 'https://fonts.loli.net/css2?family=Playfair+Display:wght@400;600;700&display=swap',
                },
                { family: 'Lora', url: 'https://fonts.loli.net/css2?family=Lora:wght@400;500;600;700&display=swap' },
                {
                    family: 'Cormorant Garamond',
                    url: 'https://fonts.loli.net/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap',
                },
            ],
            initParticles: initUKParticles,
            getDecorSVG: null,
        },
        tc: {
            id: 'tc',
            name: { zh: '華夏雅韻', zht: '華夏雅韻', en: 'Classical CN', ja: '古典中華', ko: '고전중화' },
            class: 'theme-china',
            colors: { accent: '#e8a838', secondary: '#38bdf8' },
            meta: '#e8a838',
            font: [
                { family: 'Ma Shan Zheng', url: 'https://fonts.loli.net/css2?family=Ma+Shan+Zheng&display=swap' },
                {
                    family: 'Noto Serif SC',
                    url: 'https://fonts.loli.net/css2?family=Noto+Serif+SC:wght@400;700&display=swap',
                },
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
    try {
        currentMode = localStorage.getItem(STORAGE_KEY) || 'off';
    } catch (_e) {
        /* Safari private */
    }
    let currentTheme = null;
    let tspInstance = null; // tsParticles 实例
    let decorLayer = null;
    let decorClearTimer = null;
    let decorActiveTimer = null;
    let loadedFonts = new Set();
    let themeRuntimePromise = null;
    let particleGeneration = 0; // 防止异步竞态
    const decorSVGCache = {}; // 缓存 SVG 字符串

    /* ═══════════════════════════════════════════════
       初始化
       ═══════════════════════════════════════════════ */
    function init() {
        createContainers();
        applyMode(currentMode, false);

        // 监听语言变化
        window.addEventListener('languageChanged', function (_e) {
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
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch (_e) {
            /* quota or private */
        }

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
        if (window.ArtifexThemeBootstrap && typeof window.ArtifexThemeBootstrap.resolveThemeId === 'function') {
            var resolvedId = window.ArtifexThemeBootstrap.resolveThemeId(lang, country);
            return THEMES[resolvedId] || THEMES.off;
        }
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
        } catch (_e) {
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
                opacity: 0.85,
                duration: 0.25,
                ease: 'power1.in',
                onComplete: function () {
                    applyThemeCore(theme, html);
                    gsap.to(document.body, { opacity: 1, duration: 0.4, ease: 'power1.out' });
                },
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
        if (decorClearTimer) {
            clearTimeout(decorClearTimer);
            decorClearTimer = null;
        }
        if (decorLayer) {
            decorLayer.classList.remove('active');
            decorClearTimer = setTimeout(function () {
                if (decorLayer) decorLayer.innerHTML = '';
                decorClearTimer = null;
            }, 800);
        }

        // 应用新主题
        currentTheme = theme;
        html.dataset.regionTheme = theme.id;

        if (theme.class) {
            if (window.ArtifexThemeBootstrap && typeof window.ArtifexThemeBootstrap.ensureThemeStyles === 'function') {
                window.ArtifexThemeBootstrap.ensureThemeStyles(theme.id).catch(function () {});
            }
            html.classList.add(theme.class);
        }

        // 赛博朋克专属元素控制
        toggleCyberpunkEffects(!theme.class);

        // 加载字体
        if (theme.font) loadFonts(theme.font);

        // 更新装饰层
        if (decorActiveTimer) {
            clearTimeout(decorActiveTimer);
            decorActiveTimer = null;
        }
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
            ensureThemeRuntime().then(function () {
                if (currentTheme !== theme) return;
                setTimeout(function () {
                    if (currentTheme === theme) theme.initParticles();
                }, 150);
            });
        }

        // 更新 meta theme-color
        updateMetaThemeColor(theme.meta);

        // 派发事件
        window.dispatchEvent(
            new CustomEvent('regionThemeChanged', {
                detail: { theme: theme.id, mode: currentMode },
            })
        );
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

    function loadRuntimeScript(src) {
        var existing = document.querySelector('script[data-theme-runtime="' + src + '"]');
        if (existing) {
            return existing.dataset.loaded === 'true'
                ? Promise.resolve()
                : new Promise(function (resolve, reject) {
                      existing.addEventListener('load', resolve, { once: true });
                      existing.addEventListener('error', reject, { once: true });
                  });
        }
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = src;
            script.defer = true;
            script.dataset.themeRuntime = src;
            script.addEventListener(
                'load',
                function () {
                    script.dataset.loaded = 'true';
                    resolve();
                },
                { once: true }
            );
            script.addEventListener('error', reject, { once: true });
            document.head.appendChild(script);
        });
    }

    function ensureThemeRuntime() {
        if (!themeRuntimePromise) {
            themeRuntimePromise = Promise.all([
                typeof window.tsParticles !== 'undefined'
                    ? Promise.resolve()
                    : loadRuntimeScript('/vendor/js/tsparticles.bundle.min.js'),
                typeof window.gsap !== 'undefined' ? Promise.resolve() : loadRuntimeScript('/vendor/js/gsap.min.js'),
            ]).catch(function (error) {
                themeRuntimePromise = null;
                console.warn('[region-themes] 主题动画资源加载失败', error);
            });
        }
        return themeRuntimePromise;
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
        } catch (_e) {
            // tsParticles 初始化失败时静默降级
        }
    }

    /* ── 华夏丹青：墨滴晕散 ── */
    function initChinaParticles() {
        startThemeParticles({
            fullScreen: { enable: false },
            particles: {
                number: { value: 14, density: { enable: true, width: 1920, height: 1080 } },
                color: { value: ['#17131d', '#2e5e8a', '#3a7d68'] },
                shape: { type: 'circle' },
                opacity: {
                    value: { min: 0.08, max: 0.28 },
                    animation: { enable: true, speed: 0.018, minimumValue: 0.03 },
                },
                size: { value: { min: 2, max: 8 }, animation: { enable: true, speed: 0.24, minimumValue: 1 } },
                move: {
                    enable: true,
                    speed: { min: 0.08, max: 0.22 },
                    direction: 'bottom',
                    random: true,
                    straight: false,
                    outModes: { default: 'out' },
                    wobble: { enable: true, distance: 2, speed: 0.4 },
                },
                shadow: { enable: true, color: '#0c0a14', blur: 10 },
            },
            background: { color: 'transparent' },
            detectRetina: true,
        });
    }

    /* ── 和風物語：樱花飘落（黄昏暖色调，UI下方层） ── */
    function initJapanParticles() {
        startThemeParticles({
            fullScreen: { enable: false },
            particles: {
                number: { value: 20, density: { enable: true, width: 1920, height: 1080 } },
                color: {
                    value: [
                        'rgba(232,96,122,0.7)',
                        'rgba(240,128,144,0.6)',
                        'rgba(232,144,106,0.5)',
                        'rgba(255,180,180,0.6)',
                    ],
                },
                // Use a bundled drawer: the legacy canvas addShape callback is
                // incompatible with the current tsParticles engine.
                shape: { type: 'polygon', options: { polygon: { sides: 5 } } },
                opacity: { value: { min: 0.15, max: 0.45 } },
                size: { value: { min: 8, max: 16 } },
                rotate: {
                    value: { min: 0, max: 360 },
                    animation: { enable: true, speed: 0.5, sync: false },
                    direction: 'random',
                },
                move: {
                    enable: true,
                    speed: { min: 0.15, max: 0.4 },
                    direction: 'bottom',
                    random: true,
                    straight: false,
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
                number: { value: 42, density: { enable: true, width: 1920, height: 1080 } },
                color: { value: ['#b088f9', '#ff79c6', '#8be9fd', '#fff8f1'] },
                shape: { type: 'circle' },
                opacity: {
                    value: { min: 0.2, max: 0.8 },
                    animation: { enable: true, speed: 0.03, minimumValue: 0.1, sync: false },
                },
                size: { value: { min: 1, max: 3 } },
                move: {
                    enable: true,
                    speed: 0.15,
                    direction: 'none',
                    random: true,
                    outModes: { default: 'out' },
                },
                twinkle: {
                    particles: { enable: true, frequency: 0.06, color: { value: '#fff8f1' }, opacity: 0.5 },
                    lines: { enable: false },
                },
                shadow: {
                    enable: true,
                    color: '#b088f9',
                    blur: 8,
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
                number: { value: 32, density: { enable: true, width: 1920, height: 1080 } },
                color: { value: ['#d4af37', '#f0dda0', '#a05a2c'] },
                shape: { type: 'circle' },
                opacity: {
                    value: { min: 0.12, max: 0.46 },
                    animation: { enable: true, speed: 0.015, minimumValue: 0.08, sync: false },
                },
                size: { value: { min: 0.6, max: 2.2 } },
                move: {
                    enable: true,
                    speed: { min: 0.1, max: 0.3 },
                    direction: 'top',
                    random: true,
                    straight: false,
                    outModes: { default: 'out' },
                    wobble: { enable: true, distance: 2, speed: 0.35 },
                },
                twinkle: { particles: { enable: true, frequency: 0.04, opacity: 0.4 } },
                shadow: { enable: true, color: '#d4af37', blur: 7 },
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
                    enable: true,
                    speed: { min: 0.15, max: 0.4 },
                    direction: 'none',
                    random: true,
                    straight: false,
                    outModes: { default: 'out' },
                },
                twinkle: { particles: { enable: true, frequency: 0.03, opacity: 0.5 } },
                shadow: {
                    enable: true,
                    color: '#e8a838',
                    blur: 8,
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
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.12">' +
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
            '</svg>'
        );
    }

    // 韩流霓虹 - modern K-pop light ribbons and glass glints
    function getKoreaDecorSVG() {
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.16">' +
            '<defs><linearGradient id="kpopRibbon" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="#8be9fd" stop-opacity="0"/>' +
            '<stop offset=".45" stop-color="#b088f9" stop-opacity=".55"/>' +
            '<stop offset="1" stop-color="#ff79c6" stop-opacity="0"/>' +
            '</linearGradient></defs>' +
            '<path d="M-120 820 C380 650 640 990 1050 790 S1680 600 2050 790" fill="none" stroke="url(#kpopRibbon)" stroke-width="3"/>' +
            '<path d="M-100 900 C410 750 720 1040 1180 850 S1670 760 2020 890" fill="none" stroke="url(#kpopRibbon)" stroke-width="1.5" opacity=".7"/>' +
            '<g fill="#fff8f1">' +
            '<circle cx="240" cy="250" r="2" opacity=".55"/><circle cx="1660" cy="220" r="2.5" opacity=".65"/>' +
            '<circle cx="1460" cy="410" r="1.5" opacity=".45"/><circle cx="510" cy="390" r="1.5" opacity=".4"/>' +
            '</g>' +
            '</svg>'
        );
    }

    // 華夏雅韻 - 亭台楼阁 + 云纹
    function getTCDecorSVG() {
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.1">' +
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
            '</svg>'
        );
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
