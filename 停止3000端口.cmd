@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

echo [INFO] 正在检查占用 3000 端口的进程...

set "FOUND=0"
set "KILLED=0"
set "PID_LIST="

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":3000 " ') do (
  set "PID=%%p"
  if not "!PID!"=="0" (
    echo "!PID_LIST!" | findstr /C:"|!PID!|" >nul
    if errorlevel 1 (
      set "FOUND=1"
      set "PID_LIST=!PID_LIST!|!PID!|"
      echo [INFO] 检测到 PID !PID!，尝试结束...
      taskkill /PID !PID! /F >nul 2>nul
      if errorlevel 1 (
        echo [WARN] 结束 PID !PID! 失败（可能权限不足或进程已退出）。
      ) else (
        set /a KILLED+=1
        echo [OK] 已结束 PID !PID!。
      )
    )
  )
)

if "%FOUND%"=="0" (
  echo [INFO] 当前没有进程占用 3000 端口。
) else (
  echo [INFO] 处理完成，共成功结束 %KILLED% 个进程。
)

echo.
echo 按任意键关闭窗口。
pause >nul
