@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup script for Windows
@REM ----------------------------------------------------------------------------
@echo off
setlocal

set MVNW_REPOURL=
set MVNW_VERBOSE=false

set BASE_DIR=%~dp0
if "%BASE_DIR:~-1%"=="\" set BASE_DIR=%BASE_DIR:~0,-1%

set WRAPPER_DIR=%BASE_DIR%\.mvn\wrapper
set WRAPPER_JAR=%WRAPPER_DIR%\maven-wrapper.jar
set WRAPPER_PROPS=%WRAPPER_DIR%\maven-wrapper.properties

if not exist "%WRAPPER_PROPS%" (
  echo [ERROR] Missing "%WRAPPER_PROPS%".
  exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%WRAPPER_PROPS%") do (
  if /I "%%A"=="wrapperUrl" set WRAPPER_URL=%%B
)

if "%WRAPPER_URL%"=="" (
  echo [ERROR] wrapperUrl not set in "%WRAPPER_PROPS%".
  exit /b 1
)

if not exist "%WRAPPER_JAR%" (
  echo Downloading Maven Wrapper jar...
  if not exist "%WRAPPER_DIR%" mkdir "%WRAPPER_DIR%" >nul 2>nul
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$u='%WRAPPER_URL%'; $p='%WRAPPER_JAR%';" ^
    "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
    "(New-Object Net.WebClient).DownloadFile($u,$p)"
  if errorlevel 1 (
    echo [ERROR] Failed to download Maven Wrapper jar from "%WRAPPER_URL%".
    exit /b 1
  )
)

set MAVEN_OPTS=

java %MAVEN_OPTS% -classpath "%WRAPPER_JAR%" -Dmaven.multiModuleProjectDirectory="%BASE_DIR%" ^
  org.apache.maven.wrapper.MavenWrapperMain %*

endlocal
