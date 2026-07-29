@echo off
title FirmTrack Portable System Starter
echo ====================================================
echo             STARTING FIRMTRACK SYSTEM
echo ====================================================

echo 1. Starting Backend Server with Nodemon...
cd /d "%~dp0backend"
start cmd /k "npx nodemon server.js"

timeout /t 3

echo 2. Starting Ngrok Tunnel on Port 3000...
cd /d "%~dp0"
:: 🔥 FIXED: Ab hum permanent domain use kar rahe hain jo kabhi nahi badlega!
start cmd /k ""%~dp0ngrok.exe" http --domain=foster-platter-juicy.ngrok-free.dev 3000"

timeout /t 4

echo 3. Starting Admin Web Panel...
cd /d "%~dp0frontend"
start cmd /k "npm run dev"

timeout /t 5
echo 4. Opening Admin Login Screen in Chrome...
start chrome http://localhost:5173/

echo ====================================================
echo   FirmTrack is live! Permanent URL Active.
echo ====================================================