@echo off
echo =======================================================
echo Chennai Smart Traffic System - Start All Services
echo =======================================================

echo Starting ML Service on port 8000...
start "ML Service" cmd /c "cd ml-service && ..\.venv\Scripts\uvicorn.exe app.main:app --port 8000 --host 0.0.0.0"

echo Starting Backend API on port 4000...
start "Backend API" cmd /c "cd backend && npm run dev"

echo Starting Frontend on port 5173...
start "Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo All services launched in separate windows!
echo ML Service: http://localhost:8000
echo Backend:    http://localhost:4000
echo Frontend:   http://localhost:5173
echo.
pause
