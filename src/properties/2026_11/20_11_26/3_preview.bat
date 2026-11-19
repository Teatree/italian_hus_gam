@echo off
REM Step 3 (optional): render this property's game page and save it as preview.webp here.
REM Boots the dev server with this house forced as today's puzzle, screenshots it, shuts down.
REM Preview only - the app ignores the file. Add --mobile for the phone layout.
REM Forward slashes on purpose: Node accepts them on Windows and they survive copy-paste.
setlocal
set "HERE=%~dp0"
node "%~dp0../../../../scripts/preview-shot.mjs" "%HERE:~0,-1%" %*
echo.
pause
