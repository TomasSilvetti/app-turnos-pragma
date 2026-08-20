@echo off
REM Lanza el agente minimizado y en su propia consola.
REM
REM Tiene que ser una consola propia: lo primero que hace el agente es soltarla
REM con FreeConsole, y si lo lanzaras derecho desde una pestana de Windows
REM Terminal se te cerraria esa pestana.

setlocal

REM --- Configura esto ---
set CONSOLA_BASE_URL=https://turnos.pragmastudio.net
set CONSOLA_DEVICE_ID=
set HARNESS_TOKEN=
REM ----------------------

if "%CONSOLA_DEVICE_ID%"=="" (
  echo Falta CONSOLA_DEVICE_ID. Editá este .bat y ponelo.
  pause
  exit /b 1
)

start "agente-terminales" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0agente-terminales.ps1"
