/**
 * Artifex - WebSocket 通知服务
 * 提供实时通知推送，替代前端轮询
 */
'use strict';

const WebSocket = require('ws');

class WsServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server, path: '/ws' });
        this.clients = new Map(); // userId -> Set<WebSocket>

        this.wss.on('connection', (ws, _req) => {
            ws.isAlive = true;
            ws.on('pong', () => { ws.isAlive = true; });

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data);
                    if (msg.type === 'auth' && msg.userId) {
                        ws.userId = Number(msg.userId);
                        if (!this.clients.has(ws.userId)) {
                            this.clients.set(ws.userId, new Set());
                        }
                        this.clients.get(ws.userId).add(ws);
                    }
                } catch (_) { /* ignore invalid messages */ }
            });

            ws.on('close', () => {
                if (ws.userId && this.clients.has(ws.userId)) {
                    this.clients.get(ws.userId).delete(ws);
                    if (this.clients.get(ws.userId).size === 0) {
                        this.clients.delete(ws.userId);
                    }
                }
            });
        });

        // 心跳检测（30 秒）
        this._heartbeat = setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (!ws.isAlive) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    /**
     * 向指定用户推送通知
     * @param {number} userId
     * @param {object} data - 通知数据 { type, title, body, ... }
     */
    notify(userId, data) {
        const clients = this.clients.get(Number(userId));
        if (!clients || clients.size === 0) return;
        const payload = JSON.stringify(data);
        clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        });
    }

    /**
     * 广播给所有在线用户
     * @param {object} data
     */
    broadcast(data) {
        const payload = JSON.stringify(data);
        this.wss.clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        });
    }

    /**
     * 获取在线用户数
     */
    getOnlineCount() {
        return this.clients.size;
    }

    /**
     * 关闭 WebSocket 服务
     */
    close() {
        clearInterval(this._heartbeat);
        this.wss.close();
    }
}

module.exports = { WsServer };
