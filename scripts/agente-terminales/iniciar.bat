@echo off
REM Lanza el agente minimizado y en su propia consola.
REM
REM Tiene que ser una consola propia: lo primero que hace el agente es soltarla
REM con FreeConsole, y si lo lanzaras derecho desde una pestana de Windows
REM Terminal se te cerraria esa pestana.
REM
REM Las credenciales salen del .env del harness (APP_URL, NOTAS_DEVICE_ID,
REM HARNESS_TOKEN). Si tu .env esta en otro lado, pasale -EnvFile.

start "agente-terminales" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0agente-terminales.ps1"
