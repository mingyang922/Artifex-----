/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * SD Web UI API 提供商（从 proxy.js 提取）
 */
import axios from 'axios';
import type { Request, Response } from 'express';
import type { ApiCredentials } from '../lib/types';
import { getSdWebUiBaseUrl, buildTxt2ImgPayload, buildImg2ImgPayload } from '../sd-webui-helper';

// ── 类型定义 ──

interface SdWebUiAxiosHeaders {
    'Content-Type': string;
    Authorization?: string;
    [key: string]: string | undefined;
}

interface SdWebUiAxiosConfig {
    headers: SdWebUiAxiosHeaders;
    timeout: number;
    [key: string]: unknown;
}

interface SdWebUiStatusResponse {
    ok: boolean;
    baseUrl: string;
    sd_model_checkpoint?: string;
    sd_vae?: string;
    message?: string;
}

interface SdWebUiOptionsResponse {
    sd_model_checkpoint?: string;
    sd_vae?: string;
    [key: string]: unknown;
}

interface SdWebUiTxt2ImgResponse {
    images?: string[];
    [key: string]: unknown;
}

interface SdWebUiImg2ImgResponse {
    images?: string[];
    [key: string]: unknown;
}

interface SdWebUiDeps {
    getUserProviderConfig: (userId: number, provider: string) => ApiCredentials | null;
}

interface SdWebUiRequestBody {
    prompt?: string | null;
    size?: string;
    [key: string]: unknown;
}

function sdWebUiAxiosConfig(userConfig: ApiCredentials | null): SdWebUiAxiosConfig {
    const headers: SdWebUiAxiosHeaders = { 'Content-Type': 'application/json' };
    const apiKey: string =
        (userConfig && String(userConfig.apiKey || '').trim()) ||
        String(process.env.SD_WEBUI_API_KEY || '').trim();
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }
    return { headers, timeout: 300000 };
}

async function handleSdWebUiStatus(
    req: Request,
    res: Response,
    { getUserProviderConfig }: SdWebUiDeps,
): Promise<void> {
    try {
        const sdConfig: ApiCredentials | null = getUserProviderConfig(req.currentUser!.id, 'sdwebui');
        const base: string =
            (sdConfig &&
                String(sdConfig.baseUrl || '')
                    .trim()
                    .replace(/\/$/, '')) ||
            getSdWebUiBaseUrl();
        const axiosOpts: SdWebUiAxiosConfig = { ...sdWebUiAxiosConfig(sdConfig), timeout: 10000 };
        const r = await axios.get<SdWebUiOptionsResponse>(`${base}/sdapi/v1/options`, axiosOpts);
        const response: SdWebUiStatusResponse = {
            ok: true,
            baseUrl: base,
            sd_model_checkpoint: r.data.sd_model_checkpoint,
            sd_vae: r.data.sd_vae,
        };
        res.json(response);
    } catch (e: any) {
        const d: Record<string, unknown> | undefined = e.response && e.response.data;
        const msg: string = (d && (String(d.detail || d.error || d.message || ''))) || e.message;
        const response: SdWebUiStatusResponse = {
            ok: false,
            baseUrl: getSdWebUiBaseUrl(),
            message: typeof msg === 'string' ? msg : JSON.stringify(msg),
        };
        res.status(502).json(response);
    }
}

async function handleSdWebUiTxt2Img(
    req: Request,
    res: Response,
    { getUserProviderConfig }: SdWebUiDeps,
): Promise<void> {
    try {
        const sdConfig: ApiCredentials | null = getUserProviderConfig(req.currentUser!.id, 'sdwebui');
        const base: string =
            (sdConfig &&
                String(sdConfig.baseUrl || '')
                    .trim()
                    .replace(/\/$/, '')) ||
            getSdWebUiBaseUrl();
        const body: SdWebUiRequestBody =
            req.body && typeof req.body === 'object' ? req.body : {};
        if (body.prompt === null || String(body.prompt).trim() === '') {
            res.status(400).json({ error: 'prompt 不能为空' });
            return;
        }
        const { prompt: _omitP, size: _omitS, ...extra } = body;
        const requestData = buildTxt2ImgPayload(body.prompt as string, body.size, extra);
        const r = await axios.post<SdWebUiTxt2ImgResponse>(
            `${base}/sdapi/v1/txt2img`,
            requestData,
            sdWebUiAxiosConfig(sdConfig),
        );
        res.json(r.data);
    } catch (e: any) {
        const status: number = e.response && e.response.status ? e.response.status : 502;
        const d: Record<string, unknown> | undefined = e.response && e.response.data;
        res.status(status).json({
            error: 'sd-webui txt2img 失败',
            message: (d && String(d.detail || d.error || d.message || '')) || e.message,
            detail: d,
        });
    }
}

async function callSDWebUIText2ImageAPI(
    prompt: string,
    size: string,
    extra: Record<string, unknown> = {},
    userConfig?: ApiCredentials | null,
): Promise<string> {
    const sdWebUIBaseUrl: string =
        (userConfig &&
            String(userConfig.baseUrl || '')
                .trim()
                .replace(/\/$/, '')) ||
        getSdWebUiBaseUrl();
    const requestData = buildTxt2ImgPayload(prompt, size, extra);
    const axiosOpts: SdWebUiAxiosConfig = sdWebUiAxiosConfig(userConfig || null);

    const response = await axios.post<SdWebUiTxt2ImgResponse>(
        `${sdWebUIBaseUrl}/sdapi/v1/txt2img`,
        requestData,
        axiosOpts,
    );

    if (response.data.images && response.data.images[0]) {
        return `data:image/png;base64,${response.data.images[0]}`;
    }
    throw new Error('SD Web UI API返回格式错误');
}

async function callSDWebUIImage2ImageAPI(
    prompt: string,
    imageDataUrl: string,
    strength: number | string,
    size: string,
    extra: Record<string, unknown> = {},
    userConfig?: ApiCredentials | null,
): Promise<string> {
    const sdWebUIBaseUrl: string =
        (userConfig &&
            String(userConfig.baseUrl || '')
                .trim()
                .replace(/\/$/, '')) ||
        getSdWebUiBaseUrl();
    let inputBase64: string = imageDataUrl;
    if (typeof imageDataUrl === 'string' && imageDataUrl.indexOf('base64,') !== -1) {
        inputBase64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    }

    const requestData = buildImg2ImgPayload(prompt, inputBase64, strength, size, extra);
    const axiosOpts: SdWebUiAxiosConfig = sdWebUiAxiosConfig(userConfig || null);

    const response = await axios.post<SdWebUiImg2ImgResponse>(
        `${sdWebUIBaseUrl}/sdapi/v1/img2img`,
        requestData,
        axiosOpts,
    );

    if (response.data.images && response.data.images[0]) {
        return `data:image/png;base64,${response.data.images[0]}`;
    }
    throw new Error('SD Web UI 图生图API返回格式错误');
}

export {
    sdWebUiAxiosConfig,
    handleSdWebUiStatus,
    handleSdWebUiTxt2Img,
    callSDWebUIText2ImageAPI,
    callSDWebUIImage2ImageAPI,
};
