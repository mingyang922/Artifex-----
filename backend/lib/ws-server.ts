/**
 * Artifex - WebSocket 通知服务
 * 提供实时通知推送，替代前端轮询
 */
'use strict';

import WebSocket from 'ws';
import type { Server as HttpServer } from 'http';

interface WsNotificationData {
    type: string;
    title?: string;
    body?: string;
    [key: string]: unknown;
}

interface AuthenticatedWebSocket {
    isAlive: boolean;
    userId?: number;
    on: WebSocket['on'];
    terminate: WebSocket['terminate'];
    ping: WebSocket['ping'];
    readyState: WebSocket['readyState'];
    send: WebSocket['send'];
}

class WsServer {
    private wss: WebSocket.Server;
    private clients: Map<number, Set<AuthenticatedWebSocket>>;
    private _heartbeat: ReturnType<typeof setInterval>;

    constructor(server: HttpServer) {
        this.wss = new WebSocket.Server({ server, path: '/ws' });
        this.clients = new Map(); // userId -> Set<AuthenticatedWebSocket>

        this.wss.on('connection', (ws: WebSocket, req) => {
            const authWs = ws as AuthenticatedWebSocket;
            authWs.isAlive = true;
            authWs.on('pong', () => { authWs.isAlive = true; });

            authWs.on('message', (data: WebSocket.Data) => {
                try {
                    const msg = JSON.parse(String(data));
                    if (msg.type === 'auth' && msg.userId) {
                        authWs.userId = Number(msg.userId);
                        if (!this.clients.has(authWs.userId!)) {
                            this.clients.set(authWs.userId!, new Set());
                        }
                        this.clients.get(authWs.userId!)!.add(authWs);
                    }
                } catch (_) { /* ignore invalid messages */ }
            });

            authWs.on('close', () => {
                if (authWs.userId && this.clients.has(authWs.userId)) {
                    this.clients.get(authWs.userId)!.delete(authWs);
                    if (this.clients.get(authWs.userId!)!.size === 0) {
                        this.clients.delete(authWs.userId!);
                    }
                }
            });
        });

        // 心跳检测（30 秒）
        this._heartbeat = setInterval(() => {
            this.wss.clients.forEach((ws: WebSocket) => {
                const authWs = ws as AuthenticatedWebSocket;
                if (!authWs.isAlive) return authWs.terminate();
                authWs.isAlive = false;
                authWs.ping();
            });
        }, 30000);
    }

    /**
     * 向指定用户推送通知
     * @param userId - 用户 ID
     * @param data - 通知数据 { type, title, body, ... }
     */
    notify(userId: number, data: WsNotificationData): void {
        const clients = this.clients.get(Number(userId));
        if (!clients || clients.size === 0) return;
        const payload: string = JSON.stringify(data);
        clients.forEach((ws: AuthenticatedWebSocket) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        });
    }

    /**
     * 广播给所有在线用户
     * @param data - 广播数据
     */
    broadcast(data: WsNotificationData): void {
        const payload: string = JSON.stringify(data);
        this.wss.clients.forEach((ws: WebSocket) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        });
    }

    /**
     * 获取在线用户数
     */
    getOnlineCount(): number {
        return this.clients.size;
    }

    /**
     * 关闭 WebSocket 服务
     */
    close(): void {
        clearInterval(this._heartbeat);
        this.wss.close();
    }
}

export { WsServer };
