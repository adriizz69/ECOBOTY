@echo off
setlocal EnableExtensions

set "REMOTE=origin"
if not "%~1"=="" set "REMOTE=%~1"

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git n'est pas trouve dans le PATH.
  exit /b 1
)

for /f "delims=" %%I in ('git rev-parse --show-toplevel 2^>nul') do set "REPO_ROOT=%%I"
if not defined REPO_ROOT (
  echo [ERROR] Ce script doit etre lance depuis un depot Git.
  exit /b 1
)

cd /d "%REPO_ROOT%"

echo.
echo ==== Deployment Branches via subtree ====
echo Repo   : %REPO_ROOT%
echo Remote : %REMOTE%
echo.

call :process backend deploy/backend
if errorlevel 1 exit /b 1

call :process frontend deploy/frontend
if errorlevel 1 exit /b 1

call :process bot deploy/bot
if errorlevel 1 exit /b 1

echo.
echo [OK] Branches mises a jour et poussees:
echo   - deploy/backend
echo   - deploy/frontend
echo   - deploy/bot
exit /b 0

:process
set "PREFIX=%~1"
set "BRANCH=%~2"

echo ---- %PREFIX% to %BRANCH% ----
if not exist "%PREFIX%\" (
  echo [ERROR] Dossier introuvable: %PREFIX%
  exit /b 1
)

git branch -D "%BRANCH%" >nul 2>&1
git subtree split --prefix="%PREFIX%" -b "%BRANCH%"
if errorlevel 1 (
  echo [ERROR] Echec subtree split pour %PREFIX%.
  exit /b 1
)

git push "%REMOTE%" "%BRANCH%" --force
if errorlevel 1 (
  echo [ERROR] Echec push de %BRANCH% vers %REMOTE%.
  exit /b 1
)

echo [OK] %BRANCH% pousse.
echo.
exit /b 0
