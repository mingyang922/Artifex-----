@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

REM =========================================================
REM  One-click launcher for GameManagement-platform on Windows
REM  Entry point: http://localhost:3000/login.html
REM  Resilience: retry npm install, free TCP 3000, bounded health wait, two boot tries.
REM  Needs Node on PATH; native sqlite module may need VS Build Tools on Windows.
REM =========================================================

set "ROOT=%~dp0"
cd /d "%ROOT%"

set "URL=http://localhost:3000/login.html"
set "HEALTH=http://127.0.0.1:3000/api/health"
set "BACKEND_LOG=%ROOT%logs\backend-launch.log"
set /a MAX_HEALTH_WAIT=40

if not exist "%ROOT%logs" (
  mkdir "%ROOT%logs" >nul 2>nul
)

REM ---------- Step 1: Check Node.js and npm ----------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未检测到 Node.js，请安装 Node.js 22 LTS（见根目录 .nvmrc）。
  echo         下载地址 https://nodejs.org/zh-cn/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未检测到 npm，请重新安装 Node.js 并勾选 Add to PATH。
  pause
  exit /b 1
)

REM Prefer Node.exe beside npm.cmd so native module checks match npm start (avoids Cursor/other shims first on PATH).
for /f "delims=" %%N in ('where npm') do (
  set "NPM_SHIM=%%N"
  goto :npm_shim_done
)
:npm_shim_done
if defined NPM_SHIM (
  for %%D in ("!NPM_SHIM!") do set "NPM_BINDIR=%%~dpD"
  if exist "!NPM_BINDIR!node.exe" (
    set "PATH=!NPM_BINDIR!;%PATH%"
    echo [INFO] 已将 npm 同目录下的 Node 置于 PATH 首位: !NPM_BINDIR!
  )
)

for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [INFO] 当前 Node.js 版本 %NODE_VER%

node "%ROOT%scripts\check-node-version.js"
if errorlevel 1 (
  echo [ERROR] 需要 Node.js 22.x，请执行 nvm install 22.22.0 ^&^& nvm use 22.22.0
  pause
  exit /b 1
)

REM ---------- Step 2: Install dependencies on first run ----------
if not exist "%ROOT%node_modules" (
  echo [INFO] 首次运行，正在安装项目依赖（约 1 至 3 分钟）...
  call :npm_install_with_retry
  if errorlevel 1 exit /b 1
)

REM ---------- Step 2b: node_modules 存在但关键包损坏时补装 ----------
node -e "require('express');require('better-sqlite3')" >nul 2>nul
if errorlevel 1 (
  echo [WARN] 依赖不完整或损坏，正在执行 npm install 修复...
  call :npm_install_with_retry
  if errorlevel 1 exit /b 1
)

REM ---------- Step 3: Verify native module better-sqlite3 ABI ----------
node -e "try{require('better-sqlite3');console.log('ABI_OK')}catch(e){console.log('ABI_FAIL')}" > "%TEMP%\sqlite_check.txt" 2>&1
set "ABI_STATUS=UNKNOWN"
for /f "usebackq tokens=*" %%l in ("%TEMP%\sqlite_check.txt") do (
  echo %%l | findstr /c:"ABI_OK" >nul && set "ABI_STATUS=OK"
  echo %%l | findstr /c:"ABI_FAIL" >nul && set "ABI_STATUS=FAIL"
)
del "%TEMP%\sqlite_check.txt" >nul 2>nul

if /i not "%ABI_STATUS%"=="OK" (
  if /i "%ABI_STATUS%"=="UNKNOWN" (
    echo [WARN] 无法确认 better-sqlite3 状态，尝试重新编译以保证兼容...
  ) else (
    echo [WARN] 检测到 better-sqlite3 与当前 Node.js ^(!NODE_VER!^) 不兼容，正在重新编译...
  )
  call npm rebuild better-sqlite3
  if errorlevel 1 (
    echo [WARN] better-sqlite3 单独重编译失败，尝试 npm rebuild 全部原生模块...
    call npm rebuild
    if errorlevel 1 (
      echo [ERROR] 原生模块重新编译失败。
      echo         Windows 需要 Visual Studio Build Tools 含 Desktop development with C++
      echo         下载地址 https://visualstudio.microsoft.com/visual-cpp-build-tools/
      pause
      exit /b 1
    )
  )
  echo [INFO] 原生模块重新编译流程已完成。
)

REM ---------- Step 4-5: health check, start backend if needed, up to two boot rounds ----------
call :get_health
if "%STATUS%"=="200" (
  echo [INFO] 检测到后端已在运行，直接打开登录页。
  goto open_page
)

set /a BOOT_ROUND=0
:boot_retry
set /a BOOT_ROUND+=1
if !BOOT_ROUND! GTR 2 (
  goto timeout_final
)

if !BOOT_ROUND! GTR 1 (
  echo [WARN] 上次未在时限内就绪，正在释放 3000 端口并再次启动后端 ^(!BOOT_ROUND!/2^)...
  timeout /t 2 /nobreak >nul
)

echo [INFO] 正在准备后端监听 ^(!BOOT_ROUND!/2^)...
call :free_port_3000
if exist "%BACKEND_LOG%" del "%BACKEND_LOG%" >nul 2>nul
start "GameManagement Backend" /MIN cmd /c "cd /d ""%ROOT%"" && set NODE_ENV=development && npm start >> ""%BACKEND_LOG%"" 2>&1"

echo [INFO] 等待后端健康检查，最多 %MAX_HEALTH_WAIT% 秒...（每 15 秒会打印一次日志尾部便于排查）
set /a RETRY=0
:wait_loop
set /a RETRY+=1
call :get_health
if "%STATUS%"=="200" goto open_page
if !RETRY! GTR 0 (
  set /a _TAIL=!RETRY! %% 15
  if !_TAIL!==0 call :tail_backend_log "!BACKEND_LOG!"
)
if !RETRY! GEQ %MAX_HEALTH_WAIT% goto boot_retry
timeout /t 1 /nobreak >nul
goto wait_loop

:open_page
echo [OK]   后端已就绪，正在打开登录页 %URL%
start "" "%URL%"
echo [INFO] 后端日志文件 %BACKEND_LOG%
exit /b 0

:timeout_final
echo.
call :tail_backend_log "!BACKEND_LOG!"
echo [ERROR] 经过两轮尝试仍未通过健康检查。
echo         请查看日志定位原因 %BACKEND_LOG%
echo         常见原因
echo           1. 端口 3000 被其它程序占用且无法结束
echo           2. better-sqlite3 等原生模块编译失败（请安装 VS Build Tools 后重试）
echo           3. backend/.env 或 config/.env 配置错误
echo           4. 系统环境变量 NODE_ENV=production 且未配 SESSION_SECRET 时进程会立即退出
echo             本脚本已强制 NODE_ENV=development 启动本地后端；若仍失败请看上述日志
pause
exit /b 1

REM ---------- Subroutines ----------

:npm_install_with_retry
set /a INSTALL_TRY=0
:npm_install_loop
set /a INSTALL_TRY+=1
call npm install
if not errorlevel 1 (
  exit /b 0
)
if !INSTALL_TRY! GEQ 3 (
  echo [ERROR] 依赖安装失败 ^(已重试 3 次^)，请检查网络或代理设置。
  pause
  exit /b 1
)
echo [WARN] 依赖安装失败，5 秒后重试 ^(!INSTALL_TRY!/3^)...
timeout /t 5 /nobreak >nul
goto npm_install_loop

:get_health
set "STATUS=000"
where curl.exe >nul 2>nul
if not errorlevel 1 (
  for /f "delims=" %%i in ('curl.exe --connect-timeout 2 --max-time 5 -s -o NUL -w "%%{http_code}" "%HEALTH%" 2^>nul') do set "STATUS=%%i"
  goto :get_health_done
)
for /f "delims=" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 -Uri \"%HEALTH%\").StatusCode } catch { Write-Output 000 }"') do set "STATUS=%%i"
:get_health_done
if defined STATUS set "STATUS=!STATUS: =!"
exit /b 0

:free_port_3000
echo [INFO] 尝试释放 3000 端口（若有占用，可能影响占用该端口的其它程序）...
set "FOUND=0"
set "PID_LIST="
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /R /C:":3000 "') do (
  set "PID=%%p"
  if not "!PID!"=="0" (
    echo "!PID_LIST!" | findstr /C:"|!PID!|" >nul
    if errorlevel 1 (
      set "FOUND=1"
      set "PID_LIST=!PID_LIST!|!PID!|"
      taskkill /PID !PID! /F >nul 2>nul
    )
  )
)
if "!FOUND!"=="0" (
  echo [INFO] 未发现占用 3000 的进程，或已空闲。
) else (
  echo [INFO] 已尝试结束占用 3000 的相关进程，等待端口释放...
  timeout /t 2 /nobreak >nul
)
exit /b 0

:tail_backend_log
if "%~1"=="" exit /b 0
if not exist "%~1" (
  echo [INFO] Backend log not found yet: %~1
  exit /b 0
)
echo [INFO] ----- backend log tail max 20 lines -----
powershell -NoProfile -NoLogo -Command "Get-Content -LiteralPath '%~1' -Tail 20 -ErrorAction SilentlyContinue"
echo [INFO] ----- end tail -----
exit /b 0
