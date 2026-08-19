@echo off
REM Step 2: download this property's photos from its idealista listing.
REM Reads config.json in this folder (propertyUrl + prop_pictures) and saves
REM photo-1.png, photo-2.png, ... here. Afterwards run:  npm run images:webp
REM Forward slashes on purpose: Node accepts them on Windows and they survive copy-paste.
setlocal
set "HERE=%~dp0"
node "%~dp0../../../../scripts/fetch-photos.mjs" "%HERE:~0,-1%"
echo.
pause
