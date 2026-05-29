#!/usr/bin/env bash
# 在腾讯云 Ubuntu 服务器上执行（项目根目录或任意目录，需本文件与 nginx-artifex-http-only.conf 同目录）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_SRC="${SCRIPT_DIR}/nginx-artifex-http-only.conf"
CONF_DST="/etc/nginx/sites-available/artifex"

if [[ ! -f "$CONF_SRC" ]]; then
    echo "[ERROR] 找不到 $CONF_SRC"
    exit 1
fi

echo "[1/4] 备份现有配置..."
if [[ -f "$CONF_DST" ]]; then
    sudo cp -a "$CONF_DST" "${CONF_DST}.bak.$(date +%Y%m%d%H%M%S)"
fi

echo "[2/4] 写入 HTTP-only 配置..."
sudo cp "$CONF_SRC" "$CONF_DST"
sudo ln -sf "$CONF_DST" /etc/nginx/sites-enabled/artifex

# 禁用可能存在的 certbot 纯跳转站点（仅当文件名匹配时）
for f in /etc/nginx/sites-enabled/*; do
    base="$(basename "$f")"
    if [[ "$base" != "artifex" && "$base" == *"artifex"* ]]; then
        echo "[INFO] 移除可能冲突的启用项: $f"
        sudo rm -f "$f"
    fi
done

echo "[3/4] 检查配置..."
sudo nginx -t

echo "[4/4] 重载 Nginx..."
sudo systemctl reload nginx

echo ""
echo "[OK] 已切换为 HTTP-only（无 301 跳 HTTPS）"
echo "     请测试: curl -sI http://127.0.0.1/login.html"
echo "     外网:   http://82.156.244.66/login.html"
echo ""
echo "注意: artifex.com.cn 若未备案，仍可能被运营商/DNS 拦截，与 Nginx 无关。"
