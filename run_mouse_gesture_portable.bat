@echo off
setlocal

set "BASE_DIR=%~dp0"
set "AHK_EXE=%BASE_DIR%AutoHotkey64.exe"
set "SCRIPT=%BASE_DIR%mouse_gesture.ahk"

if not exist "%SCRIPT%" (
  echo [ERROR] Script not found: %SCRIPT%
  exit /b 1
)

if not exist "%AHK_EXE%" (
  echo [ERROR] AutoHotkey64.exe not found: %AHK_EXE%
  echo Place AutoHotkey64.exe in the same directory as this .bat file.
  exit /b 2
)

start "" "%AHK_EXE%" "%SCRIPT%"
exit /b 0
