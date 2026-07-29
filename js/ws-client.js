/**
 * Artifex - WebSocket 实时通知客户端
 * 替代轮询，接收服务端推送的通知
 * 认证方式：通过 session cookie 自动完成，无需手动发送 auth 消息
 */
'use strict';

let _ws = null;
let _reconnectTimer = null;
let _reconnectDelay = 1000;
const _maxReconnectDelay = 30000;
let _listeners = [];

function getWsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + '/ws';
}

function connect() {
    if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) {
        return;
    }

    try {
        _ws = new WebSocket(getWsUrl());
    } catch (_) {
        scheduleReconnect();
        return;
    }

    _ws.onopen = function () {
        if (_reconnectTimer) {
            clearTimeout(_reconnectTimer);
            _reconnectTimer = null;
        }
        _reconnectDelay = 1000; // 重置重连延迟
    };

    _ws.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            _listeners.forEach(function (fn) {
                try {
                    fn(data);
                } catch (e) {
                    console.warn('[WsClient] 监听器异常:', e);
                }
            });
        } catch (e) {
            console.warn('[WsClient] 消息解析失败:', e);
        }
    };

    _ws.onclose = function (event) {
        // 认证失败（4001）时不重连，避免无效重试
        if (event.code === 4001) {
            console.warn('[WsClient] 认证失败，不重连:', event.reason);
            return;
        }
        scheduleReconnect();
    };

    _ws.onerror = function () {
        // onclose 会跟随触发，不需要额外处理
    };
}

function scheduleReconnect() {
    if (_reconnectTimer) return;
    _reconnectTimer = setTimeout(function () {
        _reconnectTimer = null;
        _reconnectDelay = Math.min(_reconnectDelay * 2, _maxReconnectDelay);
        connect();
    }, _reconnectDelay);
}

/**
 * 添加通知监听器
 * @param {Function} fn - 回调函数，参数为通知数据对象
 */
function onNotify(fn) {
    if (typeof fn === 'function') {
        _listeners.push(fn);
    }
}

/**
 * 移除监听器
 * @param {Function} fn
 */
function offNotify(fn) {
    _listeners = _listeners.filter(function (f) {
        return f !== fn;
    });
}

/**
 * 初始化并连接 WebSocket
 * 认证通过 session cookie 自动完成
 */
function init() {
    connect();
}

/**
 * 断开连接
 */
function disconnect() {
    if (_reconnectTimer) {
        clearTimeout(_reconnectTimer);
        _reconnectTimer = null;
    }
    if (_ws) {
        _ws.close();
        _ws = null;
    }
}

window.WsClient = {
    init: init,
    connect: connect,
    disconnect: disconnect,
    onNotify: onNotify,
    offNotify: offNotify,
};
