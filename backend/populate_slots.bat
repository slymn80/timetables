@echo off
setlocal enabledelayedexpansion

set SCHOOL_ID=133ebcbc-bf3c-46a5-a570-bbbf15aaf4b9
set BASE_URL=http://localhost:8001/api/v1/time-slots/

echo Creating time slots...

for %%d in (monday tuesday wednesday thursday friday) do (
    echo.
    echo Creating time slots for %%d...

    REM 1. Ders
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=1&start_time=08:00&end_time=08:45&is_break=false&label=1.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 1. Ders ^(08:00-08:45^)) else (echo [ERROR] 1. Ders)

    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=2&start_time=08:45&end_time=08:55&is_break=true&label=Teneffus" > nul
    if !errorlevel! equ 0 (echo [OK] Teneffus ^(08:45-08:55^)) else (echo [ERROR] Teneffus)

    REM 2. Ders
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=3&start_time=08:55&end_time=09:40&is_break=false&label=2.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 2. Ders ^(08:55-09:40^)) else (echo [ERROR] 2. Ders)

    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=4&start_time=09:40&end_time=10:00&is_break=true&label=Uzun+Teneffus" > nul
    if !errorlevel! equ 0 (echo [OK] Uzun Teneffus ^(09:40-10:00^)) else (echo [ERROR] Uzun Teneffus)

    REM 3. Ders
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=5&start_time=10:00&end_time=10:45&is_break=false&label=3.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 3. Ders ^(10:00-10:45^)) else (echo [ERROR] 3. Ders)

    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=6&start_time=10:45&end_time=10:55&is_break=true&label=Teneffus" > nul
    if !errorlevel! equ 0 (echo [OK] Teneffus ^(10:45-10:55^)) else (echo [ERROR] Teneffus)

    REM 4. Ders
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=7&start_time=10:55&end_time=11:40&is_break=false&label=4.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 4. Ders ^(10:55-11:40^)) else (echo [ERROR] 4. Ders)

    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=8&start_time=11:40&end_time=11:50&is_break=true&label=Teneffus" > nul
    if !errorlevel! equ 0 (echo [OK] Teneffus ^(11:40-11:50^)) else (echo [ERROR] Teneffus)

    REM 5. Ders
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=9&start_time=11:50&end_time=12:35&is_break=false&label=5.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 5. Ders ^(11:50-12:35^)) else (echo [ERROR] 5. Ders)

    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=10&start_time=12:35&end_time=13:35&is_break=true&label=Ogle+Yemegi" > nul
    if !errorlevel! equ 0 (echo [OK] Ogle Yemegi ^(12:35-13:35^)) else (echo [ERROR] Ogle Yemegi)

    REM 6. Ders
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=11&start_time=13:35&end_time=14:20&is_break=false&label=6.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 6. Ders ^(13:35-14:20^)) else (echo [ERROR] 6. Ders)

    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=12&start_time=14:20&end_time=14:30&is_break=true&label=Teneffus" > nul
    if !errorlevel! equ 0 (echo [OK] Teneffus ^(14:20-14:30^)) else (echo [ERROR] Teneffus)

    REM 7. Ders
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=13&start_time=14:30&end_time=15:15&is_break=false&label=7.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 7. Ders ^(14:30-15:15^)) else (echo [ERROR] 7. Ders)

    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=14&start_time=15:15&end_time=15:25&is_break=true&label=Teneffus" > nul
    if !errorlevel! equ 0 (echo [OK] Teneffus ^(15:15-15:25^)) else (echo [ERROR] Teneffus)

    REM 8. Ders
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=15&start_time=15:25&end_time=16:10&is_break=false&label=8.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 8. Ders ^(15:25-16:10^)) else (echo [ERROR] 8. Ders)
)

echo.
echo ==================================================
echo Time slots created successfully!
echo ==================================================
