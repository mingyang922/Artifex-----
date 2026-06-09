/**
 * Artifex — AI 服务商路由
 * 即梦 / SD WebUI / 混元 / 阿里云状态与代理
 */
'use strict';

import { Router, Request, Response } from 'express';
import type { User, ApiCredentials } from '../lib/types';

// ── Provider 接口 ─────────────────────────────────────────

interface TencentProvider {
    handleHunyuanProxy(req: Request, res: Response, deps: Record<string, unknown>): void;
    handleTencentStatus(req: Request, res: Response, deps: Record<string, unknown>): void;
}

interface AlibabaProvider {
    handleAlibabaProxy(req: Request, res: Response, deps: Record<string, unknown>): void;
    handleAlibabaVisionProxy(req: Request, res: Response, deps: Record<string, unknown>): void;
}

interface JimengProvider {
    handleJimengStatus(req: Request, res: Response, deps: Record<string, unknown>): void;
    handleJimengLiveTest(req: Request, res: Response, deps: Record<string, unknown>): void;
}

interface SdWebUiProvider {
    handleSdWebUiStatus(req: Request, res: Response, deps: Record<string, unknown>): void;
    handleSdWebUiTxt2Img(req: Request, res: Response, deps: Record<string, unknown>): void;
}

// ── 依赖接口 ──────────────────────────────────────────────

interface AiProviderDeps {
    requireAuth: (req: Request, res: Response, next: () => void) => void;
    csrfProtection: (req: Request, res: Response, next: () => void) => void;
    runtimeConfig: Record<string, unknown>;
    API_CONFIG: Record<string, unknown>;
    getUserProviderConfig: (userId: number, provider: string) => ApiCredentials | null;
    isAdminUser: (user: User | undefined) => boolean;
    tencentProvider: TencentProvider;
    alibabaProvider: AlibabaProvider;
    jimengProvider: JimengProvider;
    sdWebUiProvider: SdWebUiProvider;
}

// ── 路由创建函数 ──────────────────────────────────────────

function createAiProviderRouter(deps: AiProviderDeps): Router {
    const router = Router();
    const {
        requireAuth, csrfProtection, runtimeConfig, API_CONFIG, getUserProviderConfig, isAdminUser,
        tencentProvider, alibabaProvider, jimengProvider, sdWebUiProvider,
    } = deps;

    // 腾讯混元
    const _tencentDeps: Record<string, unknown> = { runtimeConfig, API_CONFIG, getUserProviderConfig, isAdminUser };
    router.post('/hunyuan-proxy', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        tencentProvider.handleHunyuanProxy(req, res, _tencentDeps);
    });

    // SD WebUI 状态
    router.get('/sd-webui/status', requireAuth, (req: Request, res: Response): void => {
        sdWebUiProvider.handleSdWebUiStatus(req, res, { getUserProviderConfig });
    });

    // 即梦状态
    router.get('/jimeng/status', requireAuth, (req: Request, res: Response): void => {
        jimengProvider.handleJimengStatus(req, res, { getUserProviderConfig });
    });

    // 即梦在线测试（POST，因为有副作用：消耗 API 配额）
    router.post('/jimeng/live-test', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        jimengProvider.handleJimengLiveTest(req, res, { getUserProviderConfig });
    });

    // SD WebUI 文生图
    router.post('/sd-webui/txt2img', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        sdWebUiProvider.handleSdWebUiTxt2Img(req, res, { getUserProviderConfig });
    });

    // 阿里云文生图
    router.post('/alibaba-proxy', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        alibabaProvider.handleAlibabaProxy(req, res, { runtimeConfig, API_CONFIG, getUserProviderConfig });
    });

    // 阿里云视觉
    router.post('/alibaba-vision-proxy', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        alibabaProvider.handleAlibabaVisionProxy(req, res, { runtimeConfig, API_CONFIG, getUserProviderConfig });
    });

    // 腾讯云状态
    router.get('/tencent/status', requireAuth, (req: Request, res: Response): void => {
        tencentProvider.handleTencentStatus(req, res, { getUserProviderConfig, isAdminUser });
    });

    return router;
}

export { createAiProviderRouter };
