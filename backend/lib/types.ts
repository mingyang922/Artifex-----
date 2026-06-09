/**
 * Artifex - 核心类型定义
 */

// ── 用户相关 ──
export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    profile_json: string;
    role: 'user' | 'admin';
    created_at: string;
}

export interface UserProfile {
    nickname?: string;
    gender?: string;
    bio?: string;
    country?: string;
    language?: string;
    avatar?: string;
    settings?: Record<string, unknown>;
}

// ── API 凭证 ──
export interface ApiCredentials {
    apiKey?: string;
    secretKey?: string;
    secretId?: string;
    endpoint?: string;
    model?: string;
    visionModel?: string;
    baseUrl?: string;
    [key: string]: unknown;
}

export interface CredentialValidation {
    ok: boolean;
    code?: string;
    message?: string;
}

// ── 腾讯云 ──
export interface TencentCamCredentials {
    secretId: string;
    secretKey: string;
}

// ── 项目 ──
export interface Project {
    id: number;
    user_id: number;
    name: string;
    description: string;
    type: string;
    version: number;
    created_at: string;
    updated_at: string;
    assets?: ProjectAsset[];
    versionHistory?: VersionHistory[];
}

export interface ProjectAsset {
    id: number;
    project_id: number;
    user_id: number;
    name: string;
    type: string;
    content: string;
    created_at: string;
}

export interface VersionHistory {
    id: number;
    project_id: number;
    version: number;
    description: string;
    created_at: string;
}

// ── 素材库 ──
export interface AssetLibraryItem {
    id: number;
    user_id: number;
    name: string;
    type: string;
    content: string;
    desc: string;
    source: string;
    tags: string;
    created_at: string;
}

// ── 用量 ──
export interface UsageLog {
    id: number;
    user_id: number;
    provider: string;
    operation: string;
    status: string;
    duration_ms: number;
    created_at: string;
}

export interface QuotaCheck {
    ok: boolean;
    reason?: 'daily' | 'monthly';
    limit?: number;
    used?: number;
    dailyUsed?: number;
    dailyLimit?: number;
    monthlyUsed?: number;
    monthlyLimit?: number;
}

// ── 活动日志 ──
export interface ActivityLog {
    id: number;
    user_id: number;
    action: string;
    target_type: string | null;
    target_id: string | null;
    details: string | null;
    created_at: string;
}

// ── Express 扩展 ──
declare global {
    namespace Express {
        interface Request {
            currentUser?: User;
        }
    }
}

// ── 图片生成 ──
export interface ImageGenerationRequest {
    prompt: string;
    size?: string;
    provider?: string;
    mode?: 'text2img' | 'img2img';
    image?: string;
    strength?: number;
    imageModel?: string;
    styleReferenceImage?: string;
    jimeng?: Record<string, unknown>;
    sd?: Record<string, unknown>;
}

export interface ImageGenerationResponse {
    image_url: string;
    provider: string;
    prompt: string;
    size?: string;
    mode: string;
}
