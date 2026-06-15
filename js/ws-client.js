/**
 * Artifex - WebSocket 实时通知客户端
 * 替代轮询，接收服务端推送的通知
 */
'use strict';

    let _ws = null;
    let _reconnectTimer = null;
    let _reconnectDelay = 1000;
    const _maxReconnectDelay = 30000;
    const _listeners = [];

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
            _reconnectDelay = 1000; // 重置重连延迟
            // 发送认证消息
            try {
                const userId = window.__artifexUserId;
                if (userId) {
                    _ws.send(JSON.stringify({ type: 'auth', userId: userId }));
                }
            } catch (_) { /* ignore */ }
        };

        _ws.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);
                _listeners.forEach(function (fn) {
                    try { fn(data); } catch (_) { /* ignore */ }
                });
            } catch (_) { /* ignore invalid messages */ }
        };

        _ws.onclose = function () {
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
        _listeners = _listeners.filter(function (f) { return f !== fn; });
    }

    /**
     * 手动连接（需先设置 window.__artifexUserId）
     */
    function init() {
        if (window.__artifexUserId) {
            connect();
        }
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
