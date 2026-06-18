/**
 * Artifex - WebSocket 通知服务
 * 提供实时通知推送，替代前端轮询
 * 认证方式：通过 HTTP upgrade 请求中的 session cookie 验证用户身份
 */
'use strict';

const WebSocket = require('ws');
const cookie = require('cookie');
const cookieSignature = require('cookie-signature');

class WsServer {
    /**
     * @param {import('http').Server} server
     * @param {object} options
     * @param {object} options.sessionStore - express-session store 实例
     * @param {string} options.sessionSecret - session 签名密钥
     * @param {string} [options.cookieName='connect.sid'] - session cookie 名称
     */
    constructor(server, options = {}) {
        const { sessionStore, sessionSecret, cookieName = 'connect.sid' } = options;
        this._sessionStore = sessionStore;
        this._sessionSecret = sessionSecret;
        this._cookieName = cookieName;

        this.wss = new WebSocket.Server({ noServer: true });
        this.clients = new Map(); // userId -> Set<WebSocket>

        // 使用 noServer 模式，在 HTTP upgrade 时手动验证 session
        server.on('upgrade', (req, socket, head) => {
            // 只处理 /ws 路径
            const url = new URL(req.url, `http://${req.headers.host}`);
            if (url.pathname !== '/ws') {
                socket.destroy();
                return;
            }

            this.wss.handleUpgrade(req, socket, head, (ws) => {
                this._authenticateAndRegister(ws, req);
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
        if (this._heartbeat.unref) this._heartbeat.unref();
    }

    /**
     * 从 HTTP upgrade 请求中验证 session，注册 WebSocket 连接
     */
    _authenticateAndRegister(ws, req) {
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        // 解析 cookie
        const cookies = cookie.parse(req.headers.cookie || '');
        const signedSid = cookies[this._cookieName];

        if (!signedSid) {
            ws.close(4001, '未提供 session cookie');
            return;
        }

        // express-session 签名格式: s:<sid>.<signature>
        const sid = signedSid.startsWith('s:')
            ? cookieSignature.unsign(signedSid.slice(2), this._sessionSecret)
            : null;

        if (!sid) {
            ws.close(4001, 'session cookie 签名无效');
            return;
        }

        // 从 session store 查询 session 数据
        this._sessionStore.get(sid, (err, session) => {
            if (err || !session || !session.userId) {
                ws.close(4001, 'session 无效或已过期');
                return;
            }

            const userId = Number(session.userId);
            if (!userId || isNaN(userId)) {
                ws.close(4001, 'session 中无有效用户 ID');
                return;
            }

            // 认证成功，注册连接
            ws.userId = userId;
            if (!this.clients.has(userId)) {
                this.clients.set(userId, new Set());
            }
            this.clients.get(userId).add(ws);

            ws.on('close', () => {
                if (ws.userId && this.clients.has(ws.userId)) {
                    this.clients.get(ws.userId).delete(ws);
                    if (this.clients.get(ws.userId).size === 0) {
                        this.clients.delete(ws.userId);
                    }
                }
            });
        });
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
