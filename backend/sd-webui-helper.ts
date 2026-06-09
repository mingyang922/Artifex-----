/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * 与 AUTOMATIC1111 WebUI --api 交互的辅助方法
 * 文档参考: http://127.0.0.1:7860/docs 中 /sdapi/v1/*
 */

// ── 接口定义 ──

interface SizeDimensions {
    width: number;
    height: number;
}

interface Txt2ImgPayload {
    prompt: string;
    negative_prompt: string;
    width: number;
    height: number;
    steps: number;
    cfg_scale: number;
    sampler_name: string;
    scheduler: string;
    seed: number;
    n_iter: number;
    batch_size: number;
    [key: string]: unknown;
}

interface Img2ImgPayload {
    prompt: string;
    negative_prompt: string;
    init_images: string[];
    width: number;
    height: number;
    steps: number;
    cfg_scale: number;
    strength: number;
    sampler_name: string;
    scheduler: string;
    seed: number;
    n_iter: number;
    batch_size: number;
    [key: string]: unknown;
}

interface SdExtraOptions {
    rawPrompt?: boolean;
    skip_lora?: boolean;
    size?: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
    sampler_name?: string;
    scheduler?: string;
    seed?: number;
    n_iter?: number;
    batch_size?: number;
    [key: string]: unknown;
}

function getSdWebUiBaseUrl(): string {
    const u: string = process.env.SD_WEBUI_URL || 'http://127.0.0.1:7860';
    return String(u).replace(/\/$/, '');
}

/**
 * 在 prompt 前自动附加 <lora:name:weight>（若尚未包含 lora 语法）
 * 环境变量:
 *   SD_WEBUI_LORA         LoRA 文件名不含扩展名，默认 last
 *   SD_WEBUI_LORA_WEIGHT  默认 1
 *   SD_WEBUI_LORA_DISABLED=1 关闭自动附加
 */
function applySdWebuiLoraPrefix(prompt: string): string {
    if (!prompt || typeof prompt !== 'string') return prompt;
    if (process.env.SD_WEBUI_LORA_DISABLED === '1') return prompt;
    if (/<lora:\s*[^>]+>/i.test(prompt)) return prompt;
    const name: string = (process.env.SD_WEBUI_LORA || 'last').trim();
    if (!name) return prompt;
    const w: string = String(process.env.SD_WEBUI_LORA_WEIGHT != null ? process.env.SD_WEBUI_LORA_WEIGHT : '1').trim() || '1';
    return `<lora:${name}:${w}>, ${prompt}`;
}

function parseSizeForSd(sizeStr: string | undefined | null): SizeDimensions {
    if (!sizeStr || typeof sizeStr !== 'string') return { width: 1024, height: 1024 };
    const parts: number[] = String(sizeStr)
        .replace(':', 'x')
        .split(/[x*]/i)
        .map(Number)
        .filter((n) => n > 0);
    let w: number = parts[0] || 1024;
    let h: number = parts[1] || 1024;
    w = Math.min(2048, Math.max(64, Math.round(w / 8) * 8));
    h = Math.min(2048, Math.max(64, Math.round(h / 8) * 8));
    return { width: w, height: h };
}

/**
 * 组装 txt2img 请求体（可与 A1111 /sdapi/v1/txt2img 额外字段合并）
 * extra 可含 rawPrompt/skip_lora: true 以禁用自动 LoRA 前缀；其余字段原样透传（如 tiling、restore_faces）
 */
function buildTxt2ImgPayload(prompt: string | null | undefined, sizeStr: string | undefined | null, extra: SdExtraOptions = {}): Txt2ImgPayload {
    const rawPrompt: boolean = extra.rawPrompt === true || extra.skip_lora === true;
    const { rawPrompt: _rp, skip_lora: _sl, size: _sz, ...rest } = extra;

    let finalPrompt: string = String(prompt != null ? prompt : '');
    if (!rawPrompt) finalPrompt = applySdWebuiLoraPrefix(finalPrompt);

    const dims: SizeDimensions = parseSizeForSd(
        sizeStr || (rest.width != null && rest.height != null ? `${rest.width}x${rest.height}` : '1024x1024')
    );

    const skipKeys: Set<string> = new Set([
        'prompt',
        'negative_prompt',
        'width',
        'height',
        'steps',
        'cfg_scale',
        'sampler_name',
        'scheduler',
        'seed',
        'n_iter',
        'batch_size',
    ]);

    const base: Txt2ImgPayload = {
        prompt: finalPrompt,
        negative_prompt: rest.negative_prompt != null ? (rest.negative_prompt as string) : 'low quality, blurry, distorted',
        width: rest.width != null ? Number(rest.width) : dims.width,
        height: rest.height != null ? Number(rest.height) : dims.height,
        steps: rest.steps != null ? Number(rest.steps) : 28,
        cfg_scale: rest.cfg_scale != null ? Number(rest.cfg_scale) : 7,
        sampler_name: rest.sampler_name != null ? (rest.sampler_name as string) : 'DPM++ 2M',
        scheduler: rest.scheduler != null ? (rest.scheduler as string) : 'Karras',
        seed: rest.seed != null ? (rest.seed as number) : -1,
        n_iter: rest.n_iter != null ? Number(rest.n_iter) : 1,
        batch_size: rest.batch_size != null ? Number(rest.batch_size) : 1,
    };

    for (const [k, v] of Object.entries(rest)) {
        if (!skipKeys.has(k) && v !== undefined) {
            base[k] = v;
        }
    }

    return base;
}

/**
 * 组装 img2img 请求体
 */
function buildImg2ImgPayload(
    prompt: string | null | undefined,
    imageBase64: string,
    strength: number | string,
    sizeStr: string | undefined | null,
    extra: SdExtraOptions = {}
): Img2ImgPayload {
    const rawPrompt: boolean = extra.rawPrompt === true || extra.skip_lora === true;
    const { rawPrompt: _rp, skip_lora: _sl, size: _sz, ...rest } = extra;

    let finalPrompt: string = String(prompt != null ? prompt : '');
    if (!rawPrompt) finalPrompt = applySdWebuiLoraPrefix(finalPrompt);

    const dims: SizeDimensions = parseSizeForSd(
        sizeStr || (rest.width != null && rest.height != null ? `${rest.width}x${rest.height}` : '1024x1024')
    );
    const numStrength: number = typeof strength === 'number' ? strength : parseFloat(strength as string);
    const s: number = Number.isFinite(numStrength) ? numStrength : 0.7;

    const skipKeys: Set<string> = new Set([
        'prompt',
        'negative_prompt',
        'init_images',
        'width',
        'height',
        'steps',
        'cfg_scale',
        'strength',
        'sampler_name',
        'scheduler',
        'seed',
        'n_iter',
        'batch_size',
    ]);

    const base: Img2ImgPayload = {
        prompt: finalPrompt,
        negative_prompt: rest.negative_prompt != null ? (rest.negative_prompt as string) : 'low quality, blurry, distorted',
        init_images: [imageBase64],
        width: rest.width != null ? Number(rest.width) : dims.width,
        height: rest.height != null ? Number(rest.height) : dims.height,
        steps: rest.steps != null ? Number(rest.steps) : 28,
        cfg_scale: rest.cfg_scale != null ? Number(rest.cfg_scale) : 7,
        strength: Math.min(1, Math.max(0.01, s)),
        sampler_name: rest.sampler_name != null ? (rest.sampler_name as string) : 'DPM++ 2M',
        scheduler: rest.scheduler != null ? (rest.scheduler as string) : 'Karras',
        seed: rest.seed != null ? (rest.seed as number) : -1,
        n_iter: rest.n_iter != null ? Number(rest.n_iter) : 1,
        batch_size: rest.batch_size != null ? Number(rest.batch_size) : 1,
    };

    for (const [k, v] of Object.entries(rest)) {
        if (!skipKeys.has(k) && v !== undefined) {
            base[k] = v;
        }
    }

    return base;
}

export {
    getSdWebUiBaseUrl,
    applySdWebuiLoraPrefix,
    parseSizeForSd,
    buildTxt2ImgPayload,
    buildImg2ImgPayload,
};
