/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
/**
 * 前端共享常量 - 集中管理魔法数字
 */

// ── AI 生成 ──
export const JIMENG_MIN_PIXELS = 921600;           // 即梦最低像素要求 (1280×720)
export const GENERATED_IMAGES_MAX = 15;            // 本地缓存生成图片上限
export const BATCH_GENERATE_MAX = 8;               // 批量生成最大张数

// ── 素材库 ──
export const MAX_NON_IMAGE_FILE_SIZE = 2.5 * 1024 * 1024;  // 非图片文件大小上限 (2.5MB)
export const MAX_ASSET_CONTENT_SIZE = 10 * 1024 * 1024;     // 单个素材内容上限 (10MB)
export const IMAGE_COMPRESS_MAX_WIDTH = 1600;      // 图片压缩最大宽度
export const IMAGE_COMPRESS_MAX_HEIGHT = 1600;     // 图片压缩最大高度
export const IMAGE_COMPRESS_TARGET_SIZE = 700000;  // 图片压缩目标大小 (700KB)
export const IMAGE_COMPRESS_MIN_QUALITY = 0.45;    // 图片压缩最低质量

// ── 用户中心 ──
export const PROFILE_MAX_SIZE = 50 * 1024;         // 用户资料 JSON 最大体积 (50KB)
export const AVATAR_MAX_SIZE = 200;                // 头像建议尺寸 (200×200)

// ── 通知 ──
export const NOTIFICATION_DROPDOWN_WIDTH_MIN = 320;
export const NOTIFICATION_DROPDOWN_WIDTH_MAX = 380;

// 汇总对象（向后兼容）
export const CONSTANTS = {
    JIMENG_MIN_PIXELS,
    GENERATED_IMAGES_MAX,
    BATCH_GENERATE_MAX,
    MAX_NON_IMAGE_FILE_SIZE,
    MAX_ASSET_CONTENT_SIZE,
    IMAGE_COMPRESS_MAX_WIDTH,
    IMAGE_COMPRESS_MAX_HEIGHT,
    IMAGE_COMPRESS_TARGET_SIZE,
    IMAGE_COMPRESS_MIN_QUALITY,
    PROFILE_MAX_SIZE,
    AVATAR_MAX_SIZE,
    NOTIFICATION_DROPDOWN_WIDTH_MIN,
    NOTIFICATION_DROPDOWN_WIDTH_MAX,
};

// 向后兼容全局变量
if (typeof window !== 'undefined') {
    window.ArtifexConstants = CONSTANTS;
}
