/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * 即梦 / Seedream API 提供商（从 proxy.js 提取）
 */
import axios from 'axios';
import type { Request, Response } from 'express';
import type { ApiCredentials } from '../lib/types';
import * as arkRestConfig from '../ark-rest-config';
import {
    normalizeJimengApiKey,
    normalizePixelSize,
    parseJimengImageResponse,
    extractJimengOutputSize,
    clamp01Range,
} from '../lib/utils';

// ── 类型定义 ──

interface JimengSizeOptions {
    strictPixelSize?: boolean;
}

interface SizeValidation {
    ok: boolean;
    message?: string;
    normalized?: string;
}

interface FrameMeta {
    action: string;
    frameIndex: number;
    framesPer: number;
}

interface FrameState {
    lastFrameIndex: number;
    lastImage: string;
    baseImage: string;
    updatedAt: number;
}

interface ActionConsistencyResult {
    prompt: string;
    image: string;
    strength: number;
    jimeng: Record<string, unknown>;
    onSuccess: (generatedUrl?: string) => void;
}

interface ArkRestConfigData {
    endpoint?: string;
    apiKey?: string;
    model?: string;
    useRestApiOnly?: boolean;
    defaults?: Record<string, unknown>;
}

interface JimengExtraParams {
    model?: string;
    response_format?: string;
    n?: number;
    watermark?: boolean;
    size?: string;
    require_exact_size?: boolean;
    strictPixelSize?: boolean;
    sequential_image_generation?: string;
    sequential_image_generation_options?: Record<string, unknown>;
    extra_body?: Record<string, unknown>;
    [key: string]: unknown;
}

interface JimengStatusResponse {
    ok: boolean;
    configured: boolean;
    keyMeta: {
        prefix: string;
        length: number;
        looksLikeArkApiKey: boolean;
    } | null;
    model: string;
    endpoint: string;
    keySource: string;
    transport: string;
    hint?: string;
}

interface JimengStatusDeps {
    getUserProviderConfig: (userId: number, provider: string) => ApiCredentials | null;
}

interface AxiosErrorWithResponse extends Error {
    response?: {
        status?: number;
        data?: unknown;
    };
    code?: string;
}

/**
 * 即梦 / Seedream 尺寸：支持 1K、2K、4K 或「宽x高」像素。
 */
function mapJimengSize(sizeStr: string | null | undefined, options: JimengSizeOptions = {}): string {
    const strictPixelSize: boolean = !!(options && options.strictPixelSize);
    if (!sizeStr || typeof sizeStr !== 'string') return '2K';
    const preset: string = String(process.env.JIMENG_SIZE || '').trim();
    if (!strictPixelSize && (preset === '1K' || preset === '2K' || preset === '4K')) return preset;
    const s: string = String(sizeStr).toLowerCase().replace(/:/g, 'x');
    const m: RegExpMatchArray | null = s.match(/(\d+)\s*x\s*(\d+)/);
    if (!m) return '2K';
    let w: number = parseInt(m[1], 10);
    let h: number = parseInt(m[2], 10);
    if (strictPixelSize) {
        w = Math.max(256, Math.min(4096, w));
        h = Math.max(256, Math.min(4096, h));
    } else {
        w = Math.max(1280, Math.min(4096, w));
        h = Math.max(720, Math.min(4096, h));
    }
    return `${w}x${h}`;
}

function validateJimengSize(sizeStr: string): SizeValidation {
    const normalized: string | null = normalizePixelSize(sizeStr);
    if (!normalized) {
        return { ok: false, message: '即梦尺寸格式无效，请使用 宽x高（例如 1024x1024）' };
    }
    const m: RegExpMatchArray | null = normalized.match(/(\d+)x(\d+)/);
    const w: number = parseInt(m![1], 10);
    const h: number = parseInt(m![2], 10);
    const pixels: number = w * h;
    const minPixels = 921600;
    if (pixels < minPixels) {
        return {
            ok: false,
            message: `即梦尺寸不合法：当前 ${normalized}（${pixels} 像素）低于最小要求 ${minPixels} 像素。建议使用 1024x1024、1536x640、1280x720 等。`,
        };
    }
    return { ok: true, normalized };
}

// —— 动作帧一致性缓存 ——

const jimengActionFrameState: Map<string, FrameState> = new Map();

function cleanupJimengFrameState(): void {
    const now: number = Date.now();
    const ttl: number = 30 * 60 * 1000;
    if (jimengActionFrameState.size <= 300) return;
    for (const [k, st] of jimengActionFrameState.entries()) {
        if (!st || !st.updatedAt || now - st.updatedAt > ttl) {
            jimengActionFrameState.delete(k);
        }
    }
}

function getJimengFrameMeta(reqBody: Record<string, unknown>): FrameMeta | null {
    const j: Record<string, unknown> =
        reqBody && reqBody.jimeng && typeof reqBody.jimeng === 'object'
            ? (reqBody.jimeng as Record<string, unknown>)
            : {};
    const eb: Record<string, unknown> =
        j.extra_body && typeof j.extra_body === 'object'
            ? (j.extra_body as Record<string, unknown>)
            : {};
    const fm: Record<string, unknown> | null =
        eb.frame_meta && typeof eb.frame_meta === 'object'
            ? (eb.frame_meta as Record<string, unknown>)
            : null;
    if (!fm) return null;
    const frameIndex: number = parseInt(fm.frameIndex as string, 10);
    if (Number.isNaN(frameIndex)) return null;
    return {
        action: String(fm.action || 'default'),
        frameIndex,
        framesPer: parseInt(fm.framesPer as string, 10) || 1,
    };
}

function buildStrictActionPrompt(prompt: string, frameMeta: FrameMeta): string {
    const idx: number = frameMeta.frameIndex + 1;
    const total: number = frameMeta.framesPer;
    const phase: string = (() => {
        if (total <= 1) return 'single';
        if (idx === 1) return 'start';
        if (idx === total) return 'end';
        return 'middle';
    })();
    const phaseHint: string = (() => {
        switch (phase) {
            case 'start':
                return '当前为动作起始帧，强调预备姿态与重心起始，动作幅度较小。';
            case 'middle':
                return '当前为动作过程帧，强调连续运动轨迹，肢体过渡自然，姿态逐步变化。';
            case 'end':
                return '当前为动作收束帧，强调动作结束姿态与稳定落位，保持可循环衔接。';
            default:
                return '当前为单帧动作，保持姿态明确。';
        }
    })();
    return (
        `${prompt}。` +
        `画面中只能有一个角色、一个视角（正面或侧面），` +
        `严禁出现多个人物、多视角拼图、正面+背面组合、分身、镜像、陪体或背景人物；` +
        `整张图只有主角一人占据画面中央，纯色或简洁背景；` +
        `角色身份、脸型、发型、服装、配色、道具、体型必须与三视图严格一致；` +
        `当前为动作序列第${idx}/${total}帧，要求与上一帧连续过渡，动作阶段清晰，不可跳帧。` +
        phaseHint
    );
}

function prepareJimengActionConsistency(
    req: Request | null,
    reqBody: Record<string, unknown>,
    prompt: string,
    imageDataUrl: string,
    strength: number | string,
): ActionConsistencyResult {
    cleanupJimengFrameState();
    const frameMeta: FrameMeta | null = getJimengFrameMeta(reqBody);
    const j: Record<string, unknown> =
        reqBody && reqBody.jimeng && typeof reqBody.jimeng === 'object'
            ? { ...(reqBody.jimeng as Record<string, unknown>) }
            : {};
    const eb: Record<string, unknown> =
        j.extra_body && typeof j.extra_body === 'object'
            ? { ...(j.extra_body as Record<string, unknown>) }
            : {};
    const baseStrength: number = clamp01Range(strength, 0.2, 0.85, 0.45);
    let effectivePrompt: string = prompt;
    let effectiveImage: string = imageDataUrl;
    let effectiveStrength: number = baseStrength;

    if (!frameMeta) {
        return {
            prompt: effectivePrompt,
            image: effectiveImage,
            strength: effectiveStrength,
            jimeng: { ...j, extra_body: eb },
            onSuccess: () => {},
        };
    }

    effectivePrompt = buildStrictActionPrompt(prompt, frameMeta);
    const progress: number =
        frameMeta.framesPer > 1 ? frameMeta.frameIndex / (frameMeta.framesPer - 1) : 1;
    const sid: string = req?.sessionID ? req.sessionID : `anon-${req?.ip || '0.0.0.0'}`;
    const seqKey: string = `${sid}:${frameMeta.action}`;
    const prev: FrameState | undefined = jimengActionFrameState.get(seqKey);

    if (frameMeta.frameIndex <= 0) {
        effectiveStrength = clamp01Range(baseStrength, 0.35, 0.55, 0.45);
    } else if (prev && prev.lastImage && prev.lastFrameIndex === frameMeta.frameIndex - 1) {
        effectiveImage = prev.lastImage;
        const staged: number = progress < 0.5 ? baseStrength * 0.72 : baseStrength * 0.82;
        effectiveStrength = clamp01Range(staged, 0.25, 0.44, 0.35);
        eb.previous_frame_reference = prev.lastImage;
    } else if (prev && prev.baseImage) {
        effectiveImage = prev.baseImage;
        effectiveStrength = clamp01Range(baseStrength * 0.88, 0.3, 0.5, 0.4);
    }

    eb.reference_mode = 'character_consistency_strict';
    eb.single_character_only = true;
    eb.negative_prompt =
        (eb.negative_prompt ? eb.negative_prompt + ', ' : '') +
        'multiple characters, two people, dual view, front and back view, split screen, ' +
        'mirror image, clone, side by side, multi-angle, turnaround sheet, reference sheet, ' +
        '多人, 双人, 正背面, 多视角, 分身, 镜像, 拼图';
    eb.sequence_guidance = {
        action: frameMeta.action,
        frame_index: frameMeta.frameIndex,
        frames_per: frameMeta.framesPer,
        progress: Number(progress.toFixed(3)),
        phase:
            frameMeta.framesPer <= 1
                ? 'single'
                : frameMeta.frameIndex === 0
                  ? 'start'
                  : frameMeta.frameIndex === frameMeta.framesPer - 1
                    ? 'end'
                    : 'middle',
    };
    eb.consistency_lock = {
        identity: true,
        costume: true,
        color_palette: true,
        accessories: true,
        body_proportion: true,
    };

    const onSuccess = (generatedUrl?: string): void => {
        if (!generatedUrl) return;
        jimengActionFrameState.set(seqKey, {
            lastFrameIndex: frameMeta.frameIndex,
            lastImage: generatedUrl,
            baseImage: (prev && prev.baseImage) || imageDataUrl,
            updatedAt: Date.now(),
        });
    };

    return {
        prompt: effectivePrompt,
        image: effectiveImage,
        strength: effectiveStrength,
        jimeng: { ...j, extra_body: eb },
        onSuccess,
    };
}

// —— 核心 API 调用 ——

async function callJimengImageAPIAxios(
    apiKey: string,
    prompt: string,
    extra: JimengExtraParams,
    model: string,
    sizeParam: string,
    restCfg: ArkRestConfigData | null,
): Promise<string> {
    const url: string =
        (restCfg && restCfg.endpoint) ||
        process.env.JIMENG_IMAGE_API_URL ||
        'https://ark.cn-beijing.volces.com/api/v3/images/generations';
    const def: Record<string, unknown> =
        restCfg && restCfg.defaults && typeof restCfg.defaults === 'object'
            ? { ...restCfg.defaults }
            : {};
    const body: Record<string, unknown> = {
        ...def,
        model,
        prompt,
        size: sizeParam != null && sizeParam !== '' ? sizeParam : def.size != null ? def.size : '2K',
        response_format: extra.response_format || def.response_format || 'url',
        n: (() => {
            const fromExtra: number = parseInt(String(extra.n || ''), 10);
            const fromDef: number = def.n != null ? parseInt(String(def.n), 10) : NaN;
            const n0: number =
                !Number.isNaN(fromExtra) && fromExtra > 0
                    ? fromExtra
                    : !Number.isNaN(fromDef) && fromDef > 0
                      ? fromDef
                      : 1;
            return Math.min(4, Math.max(1, n0));
        })(),
    };
    if (extra.watermark !== undefined) {
        body.watermark = extra.watermark === true;
    } else if (def.watermark === undefined) {
        body.watermark = process.env.JIMENG_WATERMARK === '1' || process.env.JIMENG_WATERMARK === 'true';
    }
    if (extra.sequential_image_generation != null && extra.sequential_image_generation !== '') {
        body.sequential_image_generation = extra.sequential_image_generation;
    }
    if (extra.sequential_image_generation_options && typeof extra.sequential_image_generation_options === 'object') {
        body.sequential_image_generation_options = extra.sequential_image_generation_options;
    }
    if (extra.extra_body && typeof extra.extra_body === 'object') {
        Object.assign(body, extra.extra_body);
    }
    let r: any;
    try {
        r = await axios.post(url, body, {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: 180000,
            proxy: false,
        });
    } catch (e: any) {
        const st: number | undefined = e.response && e.response.status;
        const data: unknown = e.response && e.response.data;
        const detailStr: string = (() => {
            try {
                return typeof data === 'string' ? data : JSON.stringify(data);
            } catch (_) {
                return String(data);
            }
        })();
        const formatWrong: boolean =
            /format is incorrect|密钥格式|API key format/i.test(detailStr) ||
            !!(data && (data as Record<string, unknown>).error && String(((data as Record<string, unknown>).error as Record<string, unknown>)?.message || '').includes('format'));
        let hint = '';
        if (st === 401) {
            hint =
                '（401：请使用「火山方舟 → API Key 管理」里创建的完整 sk- 密钥；若提示 format incorrect，多为复制了控制台示例/短 token 或密钥含多余引号。勿使用 IAM 的 AK/SK。文档：https://www.volcengine.com/docs/82379/1541594）';
            if (formatWrong) {
                hint +=
                    ' 【建议】在 API Key 管理新建密钥，写入 config/ark-rest-api.local.json 的 apiKey 或 .env 的 JIMENG_API_KEY=sk-...，保存后重启 Node。';
            }
        }
        console.error('Jimeng API 请求失败:', st, detailStr ? detailStr.slice(0, 800) : e.message);
        throw new Error(`即梦 API 错误${st ? ` HTTP ${st}` : ''}${hint}${e.message ? ` — ${e.message}` : ''}`);
    }
    const out: string | null = parseJimengImageResponse(r.data);
    const requestedSize: string | null = normalizePixelSize(body.size as string);
    const actualSize: string | null = extractJimengOutputSize(r.data);
    if (extra && extra.require_exact_size && requestedSize && actualSize && requestedSize !== actualSize) {
        throw new Error(`即梦返回尺寸与请求不一致：请求 ${requestedSize}，返回 ${actualSize}。请重试或调整尺寸。`);
    }
    if (!out) {
        const snippet: string = (() => {
            try {
                return JSON.stringify(r.data).slice(0, 1200);
            } catch (e: any) {
                return String(r.data);
            }
        })();
        console.error('Jimeng response (truncated):', snippet);
        throw new Error(
            '即梦 API 返回中未解析到图片 URL，请检查 ark-rest-api.local.json / JIMENG_IMAGE_API_URL、模型 ID 与控制台权限（详见 docs/JIMENG_ARK_SETUP.md）',
        );
    }
    return out;
}

async function callJimengImageAPI(
    prompt: string,
    size: string,
    extra: JimengExtraParams = {},
    userConfig?: ApiCredentials | null,
): Promise<string> {
    const restCfg: ArkRestConfigData | null = arkRestConfig.loadArkRestConfig();
    const rawKey: string =
        userConfig && userConfig.apiKey
            ? userConfig.apiKey
            : restCfg && restCfg.apiKey && String(restCfg.apiKey).trim()
              ? restCfg.apiKey!
              : process.env.JIMENG_API_KEY || process.env.ARK_API_KEY || '';
    const apiKey: string = normalizeJimengApiKey(rawKey);
    if (!apiKey) {
        throw new Error(
            '未配置方舟密钥：请在 config/ark-rest-api.local.json 填写 apiKey，或在 config/.env 设置 JIMENG_API_KEY（见 docs/JIMENG_ARK_SETUP.md）',
        );
    }
    if (/^AKLT/i.test(apiKey)) {
        throw new Error(
            'API Key 不能填 IAM 的 Access Key ID（以 AKLT 开头）。请到「火山方舟 → API Key 管理」创建 sk- 密钥（见 docs/JIMENG_ARK_SETUP.md、https://www.volcengine.com/docs/82379/1541594）',
        );
    }
    if (!/^sk-/i.test(apiKey) && process.env.JIMENG_BEARER_WITHOUT_SK_PREFIX !== '1') {
        throw new Error(
            'API Key 须以 sk- 开头（来自火山方舟「API Key 管理」）。勿填 IAM AK/SK 或控制台示例里的非 sk- 片段。若方舟控制台发放的 Key 不含 sk- 前缀，可在 .env 设 JIMENG_BEARER_WITHOUT_SK_PREFIX=1',
        );
    }
    const model: string =
        extra.model ||
        (userConfig && userConfig.model) ||
        (restCfg && restCfg.model) ||
        process.env.JIMENG_MODEL ||
        'doubao-seedream-4.0-250828';
    const strictPixelSize: boolean = !!(extra.require_exact_size || extra.strictPixelSize);
    const sizeParam: string = extra.size != null ? extra.size : mapJimengSize(size, { strictPixelSize });
    const effectiveRestCfg: ArkRestConfigData = {
        ...(restCfg || {}),
        endpoint: (userConfig?.endpoint ?? undefined) || (restCfg?.endpoint ?? undefined),
        model: (userConfig?.model ?? undefined) || (restCfg?.model ?? undefined),
    };
    return callJimengImageAPIAxios(apiKey, prompt, extra, model, sizeParam, effectiveRestCfg);
}

async function callJimengImage2ImageAPI(
    prompt: string,
    imageDataUrl: string,
    strength: number | string,
    size: string,
    extra: JimengExtraParams = {},
    userConfig?: ApiCredentials | null,
): Promise<string> {
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
        throw new Error('即梦图生图缺少输入草图（image）');
    }

    const numStrength: number = typeof strength === 'number' ? strength : parseFloat(strength as string);
    const clampedStrength: number = Math.min(
        0.9,
        Math.max(0.2, Number.isFinite(numStrength) ? numStrength : 0.55),
    );

    let normalizedImageInput: string = imageDataUrl;
    if (/^https?:\/\//i.test(String(imageDataUrl || ''))) {
        try {
            const r = await axios.get(String(imageDataUrl), { responseType: 'arraybuffer', timeout: 20000 });
            const contentType: string = String(r.headers['content-type'] || 'image/png');
            const b64: string = Buffer.from(r.data).toString('base64');
            normalizedImageInput = `data:${contentType};base64,${b64}`;
        } catch (e: any) {
            console.warn('[jimeng img2img] 三视图 URL 拉取失败，将回退原始 URL 透传:', e.message);
        }
    }

    const img2imgExtra: JimengExtraParams = { ...extra };
    img2imgExtra.strictPixelSize = true;
    if (img2imgExtra.require_exact_size === null) {
        img2imgExtra.require_exact_size = true;
    }
    const body: Record<string, unknown> =
        img2imgExtra.extra_body && typeof img2imgExtra.extra_body === 'object'
            ? { ...img2imgExtra.extra_body }
            : {};
    body.image = normalizedImageInput;
    body.image_url = typeof imageDataUrl === 'string' ? imageDataUrl : undefined;
    body.reference_image = normalizedImageInput;
    body.reference_image_url = typeof imageDataUrl === 'string' ? imageDataUrl : undefined;
    body.strength = clampedStrength;
    img2imgExtra.extra_body = body;

    try {
        return await callJimengImageAPI(prompt, size, img2imgExtra, userConfig);
    } catch (error: any) {
        const msg: string = String(error && error.message ? error.message : error || '');
        const shouldFallback: boolean =
            /unknown|invalid|unsupported|extra_body|image|strength|schema|参数|字段/i.test(msg) ||
            /HTTP 4\d\d/.test(msg);
        if (!shouldFallback) {
            throw error;
        }
        console.warn('[jimeng img2img] 图生图字段不被当前模型/网关接受，已回退文本一致性模式:', msg);
        const fallbackPrompt: string = `${prompt}。请严格参考上传的角色线稿/草图保持轮廓和配饰一致，图生图强度约 ${clampedStrength.toFixed(2)}。`;
        const fallbackExtra: JimengExtraParams = { ...extra };
        if (fallbackExtra.extra_body && typeof fallbackExtra.extra_body === 'object') {
            const fb: Record<string, unknown> = { ...fallbackExtra.extra_body };
            delete fb.mask;
            delete fb.mask_image;
            delete fb.image_mask;
            delete fb.reference_mode;
            delete fb.outpaint_direction;
            delete fb.outpaint_pixels;
            delete fb.target_style;
            delete fb.previous_frame_reference;
            delete fb.sequence_guidance;
            delete fb.consistency_lock;
            delete fb.single_character_only;
            fallbackExtra.extra_body = fb;
        }
        return callJimengImageAPI(fallbackPrompt, size, fallbackExtra, userConfig);
    }
}

// —— 路由处理器 ——

function handleJimengStatus(
    req: Request,
    res: Response,
    { getUserProviderConfig }: JimengStatusDeps,
): void {
    const userCfg: ApiCredentials | null = getUserProviderConfig(req.currentUser!.id, 'jimeng');
    const k: string = normalizeJimengApiKey((userCfg && userCfg.apiKey) || '');
    const configured: boolean = !!k;
    const looksLikeSk: boolean = /^sk-/i.test(k);
    const skipSkCheck: boolean = process.env.JIMENG_BEARER_WITHOUT_SK_PREFIX === '1';
    const badIam: boolean = /^AKLT/i.test(k);
    const response: JimengStatusResponse = {
        ok: configured && (looksLikeSk || skipSkCheck) && !badIam,
        configured,
        keyMeta: configured
            ? {
                  prefix: k.slice(0, 7),
                  length: k.length,
                  looksLikeArkApiKey: (looksLikeSk || skipSkCheck) && !badIam,
              }
            : null,
        model: (userCfg && userCfg.model) || process.env.JIMENG_MODEL || 'doubao-seedream-4.0-250828',
        endpoint:
            (userCfg && userCfg.endpoint) ||
            'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        keySource: configured ? 'user-api-settings' : 'none',
        transport: 'rest-json(axios POST，与官方 curl 一致)',
        hint:
            configured && ((!looksLikeSk && !skipSkCheck) || badIam)
                ? '密钥须为方舟「API Key 管理」中的 sk-（可写在 ark-rest-api.local.json 或 .env），见 https://www.volcengine.com/docs/82379/1541594'
                : undefined,
    };
    res.json(response);
}

async function handleJimengLiveTest(
    req: Request,
    res: Response,
    { getUserProviderConfig }: JimengStatusDeps,
): Promise<void> {
    if (process.env.JIMENG_LIVE_TEST !== '1') {
        res.status(404).json({
            error: '未启用',
            message: '在 config/.env 设置 JIMENG_LIVE_TEST=1 并重启 proxy；用毕请删除或改为 0',
        });
        return;
    }
    const userCfg: ApiCredentials | null = getUserProviderConfig(req.currentUser!.id, 'jimeng');
    const apiKey: string = normalizeJimengApiKey((userCfg && userCfg.apiKey) || '');
    if (!apiKey) {
        res.status(400).json({
            error: '未配置密钥',
            message: '请先在用户中心配置即梦 API Key',
        });
        return;
    }
    if (/^AKLT/i.test(apiKey)) {
        res.status(400).json({ error: '不能使用 IAM 的 AKLT，请用方舟 API Key 管理中的密钥' });
        return;
    }
    const url: string =
        (userCfg && userCfg.endpoint) ||
        process.env.JIMENG_IMAGE_API_URL ||
        'https://ark.cn-beijing.volces.com/api/v3/images/generations';
    const model: string =
        (userCfg && userCfg.model) || process.env.JIMENG_MODEL || 'doubao-seedream-4.0-250828';
    const def: Record<string, unknown> = {};
    const pingBody: Record<string, unknown> = {
        ...def,
        model,
        prompt: 'ping',
        size: def.size || '2K',
        response_format: def.response_format || 'url',
        n: 1,
    };
    try {
        const r = await axios.post(url, pingBody, {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: 120000,
            validateStatus: () => true,
        });
        res.json({
            httpStatus: r.status,
            endpoint: url,
            model,
            body: r.data,
            transport: 'rest-json(axios)',
            hint:
                r.status === 401
                    ? '401：请检查 ark-rest-api.local.json 或 .env 中的 apiKey 为方舟「API Key 管理」完整 sk-'
                    : r.status >= 200 && r.status < 300
                      ? '成功：REST 与网关可用。'
                      : undefined,
        });
    } catch (e: any) {
        res.status(502).json({
            error: '请求异常',
            message: e.message,
            code: e.code,
            transport: 'rest-json(axios)',
        });
    }
}

function logJimengConfig(): void {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const logger = require('../lib/logger');
    const rc: ArkRestConfigData | null = arkRestConfig.loadArkRestConfig();
    const fromFile: boolean = !!(rc && String(rc.apiKey || '').trim());
    const fromEnv: boolean = !!(process.env.JIMENG_API_KEY || process.env.ARK_API_KEY);
    const ok: boolean = fromFile || fromEnv;
    logger.info(
        'JIMENG/ARK 即梦:',
        ok ? '已配置' : '未配置',
        fromFile ? '[密钥: config/ark-rest-api.local.json · REST]' : fromEnv ? '[密钥: .env]' : '',
    );

    try {
        const rawKey: string =
            (rc && rc.apiKey) || process.env.JIMENG_API_KEY || process.env.ARK_API_KEY || '';
        const k: string = normalizeJimengApiKey(rawKey);
        if (k) {
            logger.info(
                `[即梦] 密钥摘要: 长度=${k.length} 前缀=${k.slice(0, 4)} 尾缀=...${k.slice(-4)}`,
            );
        }
    } catch (e: any) {
        console.warn('[即梦] 密钥摘要输出失败:', e.message);
    }
}

export {
    mapJimengSize,
    validateJimengSize,
    prepareJimengActionConsistency,
    callJimengImageAPI,
    callJimengImage2ImageAPI,
    handleJimengStatus,
    handleJimengLiveTest,
    logJimengConfig,
};
