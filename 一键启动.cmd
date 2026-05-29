@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo =======================================================
echo     Artifex 启动程序
echo =======================================================
echo.

:: 检查 Node.js 是否已安装
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未检测到 Node.js 环境！
  echo 请安装 Node.js 22 LTS（见根目录 .nvmrc 中的 22.22.0）
  echo 下载地址: https://nodejs.org/
  echo 安装后请重新打开此终端。
  echo.
  pause
  exit /b 1
)

:: 锁定 Node 22.x（与 package.json engines / .nvmrc 一致）
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [INFO] 当前 Node.js 版本 %NODE_VER%
node scripts\check-node-version.js
if errorlevel 1 (
  echo.
  echo [提示] 若已安装 nvm-windows，可在项目目录执行:
  echo        nvm install 22.22.0
  echo        nvm use 22.22.0
  echo.
  pause
  exit /b 1
)

:: 检查并安装项目依赖
if not exist "node_modules\" (
  echo [INFO] 检测到初次运行，正在为您安装相关依赖，由于网络原因这可能需要一点时间...
  call npm install
  if errorlevel 1 (
    echo [ERROR] 依赖安装失败，如果存在网络问题请尝试开启或切换网络代理。
    pause
    exit /b 1
  )
) else (
  REM 进行简单健康检查，如果损坏则重装依赖
  node -e "const Database=require('better-sqlite3'); new Database(':memory:').close();" >nul 2>nul
  if errorlevel 1 (
    echo [WARN] 检测到 better-sqlite3 可能需要重新编译，正在修复...
    call npm rebuild better-sqlite3
    if errorlevel 1 (
      echo [WARN] 重编译失败，正在尝试重新安装依赖...
      call npm install
    )
  )
)

echo.
echo [INFO] 环境确认完成，正在启动后端服务...
echo [INFO] （稍候服务就绪将自动使用默认浏览器打开页面）
echo.

:: 启动后端服务器进程（打开新窗口以防止阻塞当前 CMD 并在结束时自动保留环境）
:: 使用已经内置的 npm run start:open 解决不同电脑开启的问题
start "Artifex Server" cmd /k "npm run start:open"

echo [OK] 启动后台程序已执行！
echo      若浏览器未自动打开，请手动访问本地地址:
echo      http://localhost:3000/login.html
echo.
echo      若仍然报错，请查看弹出的 "Artifex Server" 窗口中的错误信息。
echo.
echo [INFO] 云端参考地址：https://artifex.com.cn/login.html
echo.
pause
exit /b 0
