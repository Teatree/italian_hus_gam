@echo off
REM Convert all property PNG photos to WebP (and delete the originals).
REM Double-click this file, or run it from a terminal. It works no matter which
REM directory it's launched from -- it switches to its own folder (the repo root) first.

cd /d "%~dp0"

echo Converting property PNGs to WebP...
echo.

node scripts\png-to-webp.mjs %*

echo.
if %ERRORLEVEL% neq 0 (
  echo Conversion FAILED ^(exit code %ERRORLEVEL%^).
) else (
  echo Conversion finished.
)

REM Pause so the window stays open when double-clicked from Explorer.
pause
