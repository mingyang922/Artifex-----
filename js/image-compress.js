'use strict';

    /**
     * 客户端图片压缩工具
     * 在上传前压缩图片，减少传输体积
     */
    const ImageCompress = {
        /**
         * 压缩图片
         * @param {File|Blob} file - 原始图片文件
         * @param {object} options - 压缩选项
         * @param {number} options.maxWidth - 最大宽度，默认 2048
         * @param {number} options.maxHeight - 最大高度，默认 2048
         * @param {number} options.quality - JPEG 质量 0-1，默认 0.85
         * @param {string} options.outputType - 输出类型，默认 'image/jpeg'
         * @returns {Promise<Blob>} 压缩后的 Blob
         */
        async compress(file, options = {}) {
            const { maxWidth = 2048, maxHeight = 2048, quality = 0.85, outputType = 'image/jpeg' } = options;

            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);

                img.onload = () => {
                    URL.revokeObjectURL(url);
                    let { width, height } = img;

                    // 计算缩放比例
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('图片压缩失败'));
                    }, outputType, quality);
                };

                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('图片加载失败'));
                };

                img.src = url;
            });
        },

        /**
         * 压缩并转为 data URL
         * @param {File|Blob} file - 原始图片文件
         * @param {object} options - 压缩选项
         * @returns {Promise<string>} data URL
         */
        async compressToDataURL(file, options = {}) {
            const blob = await this.compress(file, options);
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        },

        /**
         * 检查是否需要压缩（超过阈值）
         * @param {File|Blob} file - 图片文件
         * @param {number} threshold - 阈值（字节），默认 500KB
         * @returns {boolean}
         */
        needsCompress(file, threshold = 500 * 1024) {
            return file.size > threshold;
        }
    };

    window.ImageCompress = ImageCompress;
