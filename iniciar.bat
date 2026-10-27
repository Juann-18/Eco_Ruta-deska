@echo off
title Eco_Ruta Launcher
chcp 65001 > nul
echo =================================================================
echo   🌱 INICIANDO ECOSISTEMA COMPLETO ECO_RUTA
echo =================================================================
echo.
echo 1. Iniciando Backend REST (Puerto 3000)...
start "Eco_Ruta - Backend (Puerto 3000)" cmd /k "cd /d %~dp0backend && npm.cmd run dev"

timeout /t 2 > nul

echo 2. Iniciando Frontend Web React (Puerto 5173)...
start "Eco_Ruta - Frontend (Puerto 5173)" cmd /k "cd /d %~dp0web && npm.cmd run dev"

timeout /t 2 > nul

echo 3. Iniciando Simulador de Telemetría IoT (Puerto 8080)...
start "Eco_Ruta - Simulador IoT" cmd /k "cd /d %~dp0 && python simulator/main.py --sync-backend"

echo.
echo =================================================================
echo   ✅ Servicios iniciados con éxito:
echo.
echo   👉 Frontend Ciudadano (Mapa & Contenedores): http://localhost:5173
echo   👉 Backend API (Puntos y Telemetría):        http://localhost:3000/api/puntos
echo   👉 Simulador IoT (Gemelo Digital en vivo):   http://localhost:8080
echo.
echo   Presiona cualquier tecla para cerrar este asistente...
echo =================================================================
pause > nul
