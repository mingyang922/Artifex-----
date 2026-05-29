@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo =======================================================
echo     Artifex 终端启动方式
echo =======================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未检测到 Node.js，请先安装 Node.js ^(推荐 18.x 或 20.x 版本^)。
  echo 下载地址: https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未检测到 npm，请重新安装 Node.js 并勾选 PATH。
  pause
  exit /b 1
)

if not exist "%ROOT%node_modules" (
  echo [INFO] 首次运行，正在安装依赖...
  call npm install
  if errorlevel 1 (
    echo [ERROR] 依赖安装失败，请检查网络或代理后重试。
    pause
    exit /b 1
  )
) else (
  node -e "const Database=require('better-sqlite3'); new Database(':memory:').close();" >nul 2>nul
  if errorlevel 1 (
    echo [WARN] 检测到 better-sqlite3 可能需要重新编译，正在修复...
    call npm rebuild better-sqlite3
    if errorlevel 1 (
      echo [WARN] 重编译失败，正在尝试重新安装依赖...
      call npm install
      if errorlevel 1 (
        echo [ERROR] 依赖修复失败，请删除 node_modules 后重新运行。
        pause
        exit /b 1
      )
    )
  )
)

echo.
echo [INFO] 环境准备完成，开始执行 npm run start:open
echo [INFO] 浏览器会在后端健康检查通过后自动打开登录页。
echo.

call npm run start:open
if errorlevel 1 (
  echo.
  echo [ERROR] 启动失败，请查看上方错误信息。
  pause
  exit /b 1
)

exit /b 0

