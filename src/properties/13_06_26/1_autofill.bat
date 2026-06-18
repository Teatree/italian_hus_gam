@echo off
REM Step 1: autofill this property's config.json (coordinates, soldPrice, draft facts) from idealista.
REM Requires propertyUrl already set in config.json. Review the facts afterwards.
REM Forward slashes on purpose: Node accepts them on Windows and they survive copy-paste.
setlocal
set "HERE=%~dp0"
node "%~dp0../../../scripts/autofill-config.mjs" "%HERE:~0,-1%"
echo.
pause
