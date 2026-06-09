/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * 阿里云通义千问 / 万相 API 提供商（从 proxy.js 提取）
 */
import axios from 'axios';
import type { Request, Response } from 'express';
import type { ApiCredentials, User } from '../lib/types';
import { extractDashscopeMultimodalText } from '../lib/utils';

// ── 类型定义 ──

interface RuntimeConfig {
    alibaba: {
        model: string;
        endpoint: string;
        imageEndpoint?: string;
        visionModel?: string;
        [key: string]: unknown;
    };
    [key: string]: Record<string, unknown>;
}

interface ApiConfig {
    frontend: { timeout: number };
    alibaba: { imageEndpoint?: string };
    [key: string]: unknown;
}

interface ProviderDeps {
    runtimeConfig: RuntimeConfig;
    API_CONFIG: ApiConfig;
    getUserProviderConfig: (userId: number, provider: string) => ApiCredentials | null;
}

interface AlibabaProxyRequestBody {
    prompt: string;
    model?: string;
    max_tokens?: number;
}

interface AlibabaVisionRequestBody {
    model?: string;
    max_tokens?: number;
    image_base64: string;
}

interface DashscopeSubmitResponse {
    output?: {
        task_id?: string;
    };
    [key: string]: unknown;
}

interface DashscopeStatusResponse {
    output?: {
        task_status?: string;
        results?: Array<{ url?: string }>;
        message?: string;
    };
    [key: string]: unknown;
}

interface DashscopeVisionResponse {
    output?: {
        choices?: Array<{
            message?: {
                content?: string | Array<{ text?: string; type?: string }>;
            };
        }>;
        text?: string;
    };
    request_id?: string;
    [key: string]: unknown;
}

// 阿里云通义千问API代理
async function handleAlibabaProxy(
    req: Request,
    res: Response,
    { runtimeConfig, API_CONFIG, getUserProviderConfig }: ProviderDeps,
): Promise<void> {
    try {
        const userAlibabaConfig: ApiCredentials | null = getUserProviderConfig(req.currentUser!.id, 'alibaba');
        const apiKey: string | undefined = userAlibabaConfig?.apiKey ?? undefined;
        const {
            prompt,
            model = (userAlibabaConfig && userAlibabaConfig.model) || runtimeConfig.alibaba.model,
            max_tokens = 1000,
        } = req.body as AlibabaProxyRequestBody;

        if (!apiKey || apiKey === 'YOUR_ALIBABA_API_KEY') {
            res.status(400).json({
                error: 'API密钥未配置',
                message: '请先在用户中心配置阿里云 API Key',
            });
            return;
        }

        const requestData = {
            model: model,
            input: { prompt: prompt },
            parameters: { max_tokens: max_tokens },
        };

        const response = await axios.post(runtimeConfig.alibaba.endpoint, requestData, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: API_CONFIG.frontend.timeout,
            proxy: false,
        });

        res.json(response.data);
    } catch (error: any) {
        console.error('阿里云API代理错误:', error);

        if (error.response) {
            res.status(error.response.status).json({
                error: '阿里云API错误',
                message:
                    typeof error.response.data === 'string'
                        ? error.response.data
                        : (error.response.data && error.response.data.message) || JSON.stringify(error.response.data),
                provider: 'alibaba',
                code: error.response.status,
            });
        } else if (error.code === 'ECONNABORTED') {
            res.status(408).json({
                error: '请求超时',
                message: '通义 API 调用超时，请稍后重试',
                provider: 'alibaba',
                code: 408,
            });
        } else {
            res.status(500).json({
                error: 'API调用失败',
                message: error.message,
                provider: 'alibaba',
                code: 500,
            });
        }
    }
}

// 阿里云通义万相API调用（异步任务：提交 → 轮询）
async function callAlibabaImageAPI(
    prompt: string,
    size: string,
    imageModel: string,
    userConfig: ApiCredentials | null,
): Promise<string> {
    const dashscopeApiKey: string =
        (userConfig && String(userConfig.apiKey || '').trim()) ||
        process.env.DASHSCOPE_API_KEY ||
        process.env.ALIBABA_API_KEY ||
        process.env.ALIBABA_ACCESS_KEY_ID ||
        '';

    if (!dashscopeApiKey) {
        throw new Error('阿里云API密钥未配置，请设置 DASHSCOPE_API_KEY 环境变量');
    }

    const model: string = imageModel || 'wanx-v1';
    const isTurbo: boolean = model.includes('turbo');

    let dashscopeSize = '1024*1024';
    if (size) {
        const parts: string[] = size.replace(/[x:]/g, '*').split('*');
        const w: number = parseInt(parts[0]) || 1024;
        const h: number = parseInt(parts[1]) || 1024;
        if (isTurbo) {
            dashscopeSize = `${w}*${h}`;
        } else {
            if (w > h) dashscopeSize = '1280*720';
            else if (h > w) dashscopeSize = '720*1280';
        }
    }

    const requestData = {
        model: model,
        input: {
            prompt: prompt,
            negative_prompt: 'low quality, blurry',
        },
        parameters: {
            style: '<auto>',
            size: dashscopeSize,
            n: 1,
        },
    };

    // 提交异步任务
    const submitRes = await axios.post<DashscopeSubmitResponse>(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
        requestData,
        {
            headers: {
                Authorization: `Bearer ${dashscopeApiKey}`,
                'Content-Type': 'application/json',
                'X-DashScope-Async': 'enable',
            },
            timeout: 30000,
            proxy: false,
        },
    );

    const taskId: string | undefined = submitRes.data.output && submitRes.data.output.task_id;
    if (!taskId) {
        throw new Error('提交图片生成任务失败: ' + JSON.stringify(submitRes.data));
    }

    // 轮询等待完成（最多 120 秒）
    const maxAttempts = 60;
    const pollInterval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise<void>((resolve) => setTimeout(resolve, pollInterval));

        const statusRes = await axios.get<DashscopeStatusResponse>(
            `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
            {
                headers: { Authorization: `Bearer ${dashscopeApiKey}` },
                timeout: 10000,
                proxy: false,
            },
        );

        const taskStatus: string | undefined = statusRes.data.output && statusRes.data.output.task_status;

        if (taskStatus === 'SUCCEEDED') {
            const results = statusRes.data.output!.results;
            if (results && results.length > 0 && results[0].url) {
                return results[0].url;
            }
            throw new Error('图片生成成功但未返回URL');
        }

        if (taskStatus === 'FAILED') {
            const errMsg: string = (statusRes.data.output && statusRes.data.output.message) || '图片生成任务失败';
            throw new Error(errMsg);
        }
    }

    throw new Error('图片生成超时（120秒），请稍后重试');
}

/**
 * 通义多模态：从参考图归纳「画风」短描述（供文生图风格片段使用）。
 */
async function handleAlibabaVisionProxy(
    req: Request,
    res: Response,
    { runtimeConfig, API_CONFIG, getUserProviderConfig }: ProviderDeps,
): Promise<void> {
    try {
        const userAlibabaConfig: ApiCredentials | null = getUserProviderConfig(req.currentUser!.id, 'alibaba');
        const apiKey: string | undefined = userAlibabaConfig?.apiKey ?? undefined;
        const model: string =
            (req.body as AlibabaVisionRequestBody).model ||
            (userAlibabaConfig && userAlibabaConfig.visionModel) ||
            runtimeConfig.alibaba.visionModel ||
            'qwen-vl-plus';
        const max_tokens: number = Math.min(
            2048,
            Math.max(64, parseInt(String((req.body as AlibabaVisionRequestBody).max_tokens || '512'), 10) || 512),
        );
        const rawImage: string | undefined = (req.body as AlibabaVisionRequestBody).image_base64;

        if (!apiKey || apiKey === 'YOUR_ALIBABA_API_KEY') {
            res.status(400).json({
                error: 'API密钥未配置',
                message: '请先在用户中心配置阿里云 API Key',
            });
            return;
        }
        if (!rawImage || typeof rawImage !== 'string') {
            res.status(400).json({ error: '参数错误', message: '缺少 image_base64' });
            return;
        }

        let imageField: string = String(rawImage).trim();
        if (!/^data:image\/\w+;base64,/i.test(imageField)) {
            imageField = `data:image/jpeg;base64,${imageField.replace(/^base64:/, '')}`;
        }

        const styleInstruction: string =
            '请根据上图，仅归纳「绘画/视觉风格」要素，用于文生图 Prompt 的风格片段。要求：\n' +
            '1. 只描述媒介（如数码插画、水彩、像素）、笔触、色彩与光影倾向、整体氛围、可能的画派或时代感；不要描述图中具体主体、角色身份、物体细节、文字内容。\n' +
            '2. 输出一条中文短句，不超过 180 字，可直接拼接到其他画面描述后使用。\n' +
            '3. 不要标题、不要编号、不要「风格：」等前缀，只输出句子本身。';

        const requestData = {
            model,
            input: {
                messages: [
                    {
                        role: 'user',
                        content: [{ image: imageField }, { text: styleInstruction }],
                    },
                ],
            },
            parameters: { max_tokens },
        };

        const endpoint: string =
            runtimeConfig.alibaba.imageEndpoint || API_CONFIG.alibaba.imageEndpoint || '';
        const response = await axios.post<DashscopeVisionResponse>(endpoint, requestData, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: API_CONFIG.frontend.timeout,
            proxy: false,
        });

        const text: string | null = extractDashscopeMultimodalText(response.data);
        if (!text) {
            console.error('alibaba-vision-proxy 未解析到文本:', JSON.stringify(response.data).slice(0, 800));
            res.status(502).json({
                error: '解析失败',
                message: '多模态接口返回格式异常，未找到正文',
                raw: response.data,
            });
            return;
        }

        res.json({ output: { text }, model, request_id: response.data && response.data.request_id });
    } catch (error: any) {
        console.error('阿里云多模态代理错误:', error.message || error);
        if (error.response) {
            const body = error.response.data;
            res.status(error.response.status).json({
                error: '阿里云多模态API错误',
                message: typeof body === 'string' ? body : (body && body.message) || JSON.stringify(body),
                provider: 'alibaba-vision',
                code: error.response.status,
            });
        } else if (error.code === 'ECONNABORTED') {
            res.status(408).json({
                error: '请求超时',
                message: '多模态 API 调用超时，请稍后重试',
                provider: 'alibaba-vision',
                code: 408,
            });
        } else {
            res.status(500).json({
                error: 'API调用失败',
                message: error.message,
                provider: 'alibaba-vision',
                code: 500,
            });
        }
    }
}

export {
    handleAlibabaProxy,
    callAlibabaImageAPI,
    handleAlibabaVisionProxy,
};
