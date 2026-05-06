@echo off
REM Quick start script for Travel Social Network

echo.
echo ========================================
echo Travel Social Network - Quick Start
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "frontend" (
    echo Error: Run this from TravelSocialNetwork folder (where frontend/ and backend/ folders exist)
    pause
    exit /b 1
)

echo Choose what to do:
echo 1. Setup backend (first time only)
echo 2. Start backend server
echo 3. Start frontend server
echo 4. Run API tests
echo 5. Full setup (both servers)
echo 0. Exit
echo.

set /p choice="Enter choice (0-5): "

if "%choice%"=="1" goto setup_backend
if "%choice%"=="2" goto start_backend
if "%choice%"=="3" goto start_frontend
if "%choice%"=="4" goto run_tests
if "%choice%"=="5" goto full_setup
if "%choice%"=="0" exit /b 0

echo Invalid choice
goto :end

:setup_backend
echo.
echo Setting up backend...
cd backend
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
echo Installing dependencies...
call venv\Scripts\activate
pip install -r requirements.txt
echo Initializing database...
python db_init.py
echo.
echo ✓ Backend setup complete!
cd ..
pause
goto :end

:start_backend
echo.
echo Starting backend server (http://localhost:5000)...
cd backend
call venv\Scripts\activate
set FLASK_APP=app.py
flask run
cd ..
goto :end

:start_frontend
echo.
echo Starting frontend server (http://localhost:8000)...
cd frontend
echo Opening in browser...
start http://localhost:8000/index.html
python -m http.server 8000
cd ..
goto :end

:run_tests
echo.
echo Running API integration tests...
cd backend
call venv\Scripts\activate
python test_integration.py
cd ..
pause
goto :end

:full_setup
echo.
echo === FULL SETUP ===
echo This will:
echo 1. Setup backend (venv, deps, database)
echo 2. Start backend server (keep open in new window)
echo 3. Start frontend server (keep open in new window)
echo.
pause

REM Setup backend
echo Setting up backend...
cd backend
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt
python db_init.py
cd ..

REM Start backend in new window
echo Starting backend server...
start "Travel Social Network - Backend" cmd /k "cd backend && venv\Scripts\activate && set FLASK_APP=app.py && flask run"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Start frontend in new window
echo Starting frontend server...
start "Travel Social Network - Frontend" cmd /k "cd frontend && python -m http.server 8000"

REM Wait a moment for frontend to start
timeout /t 2 /nobreak

REM Open browser
echo Opening frontend in browser...
start http://localhost:8000/index.html

echo.
echo ✓ Both servers are starting!
echo.
echo Frontend: http://localhost:8000/index.html
echo Backend:  http://localhost:5000/api
echo.
pause

:end
echo.
exit /b 0
