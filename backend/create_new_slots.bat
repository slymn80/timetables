@echo off
setlocal enabledelayedexpansion

set SCHOOL_ID=133ebcbc-bf3c-46a5-a570-bbbf15aaf4b9
set BASE_URL=http://localhost:8001/api/v1/time-slots/

echo Yeni ders programina gore time slot'lar olusturuluyor...

for %%d in (monday tuesday wednesday thursday friday) do (
    echo.
    echo %%d icin time slot'lar olusturuluyor...

    REM 1. Ders 08:30-09:10
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=1&start_time=08:30&end_time=09:10&is_break=false&label=1.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 1. Ders 08:30-09:10) else (echo [ERROR] 1. Ders)

    REM 1. Ara 09:10-09:20
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=2&start_time=09:10&end_time=09:20&is_break=true&label=1.+Ara" > nul
    if !errorlevel! equ 0 (echo [OK] 1. Ara 09:10-09:20) else (echo [ERROR] 1. Ara)

    REM 2. Ders 09:20-10:00
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=3&start_time=09:20&end_time=10:00&is_break=false&label=2.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 2. Ders 09:20-10:00) else (echo [ERROR] 2. Ders)

    REM 2. Ara 10:00-10:20 (Uzun Teneffus)
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=4&start_time=10:00&end_time=10:20&is_break=true&label=2.+Ara+(Uzun)" > nul
    if !errorlevel! equ 0 (echo [OK] 2. Ara 10:00-10:20 - Uzun Teneffus) else (echo [ERROR] 2. Ara)

    REM 3. Ders 10:20-11:00
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=5&start_time=10:20&end_time=11:00&is_break=false&label=3.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 3. Ders 10:20-11:00) else (echo [ERROR] 3. Ders)

    REM 3. Ara 11:00-11:10
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=6&start_time=11:00&end_time=11:10&is_break=true&label=3.+Ara" > nul
    if !errorlevel! equ 0 (echo [OK] 3. Ara 11:00-11:10) else (echo [ERROR] 3. Ara)

    REM 4. Ders 11:10-11:50
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=7&start_time=11:10&end_time=11:50&is_break=false&label=4.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 4. Ders 11:10-11:50) else (echo [ERROR] 4. Ders)

    REM 4. Ara 11:50-12:00
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=8&start_time=11:50&end_time=12:00&is_break=true&label=4.+Ara" > nul
    if !errorlevel! equ 0 (echo [OK] 4. Ara 11:50-12:00) else (echo [ERROR] 4. Ara)

    REM 5. Ders 12:00-12:40
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=9&start_time=12:00&end_time=12:40&is_break=false&label=5.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 5. Ders 12:00-12:40) else (echo [ERROR] 5. Ders)

    REM Ogle Arasi 12:40-13:40
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=10&start_time=12:40&end_time=13:40&is_break=true&label=Ogle+Arasi" > nul
    if !errorlevel! equ 0 (echo [OK] Ogle Arasi 12:40-13:40) else (echo [ERROR] Ogle Arasi)

    REM 6. Ders 13:40-14:20
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=11&start_time=13:40&end_time=14:20&is_break=false&label=6.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 6. Ders 13:40-14:20) else (echo [ERROR] 6. Ders)

    REM 6. Ara 14:20-14:30
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=12&start_time=14:20&end_time=14:30&is_break=true&label=6.+Ara" > nul
    if !errorlevel! equ 0 (echo [OK] 6. Ara 14:20-14:30) else (echo [ERROR] 6. Ara)

    REM 7. Ders 14:30-15:10
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=13&start_time=14:30&end_time=15:10&is_break=false&label=7.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 7. Ders 14:30-15:10) else (echo [ERROR] 7. Ders)

    REM 7. Ara 15:10-15:20
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=14&start_time=15:10&end_time=15:20&is_break=true&label=7.+Ara" > nul
    if !errorlevel! equ 0 (echo [OK] 7. Ara 15:10-15:20) else (echo [ERROR] 7. Ara)

    REM 8. Ders 15:20-16:00
    curl -s -X POST "%BASE_URL%?school_id=%SCHOOL_ID%&day=%%d&period_number=15&start_time=15:20&end_time=16:00&is_break=false&label=8.+Ders" > nul
    if !errorlevel! equ 0 (echo [OK] 8. Ders 15:20-16:00) else (echo [ERROR] 8. Ders)
)

echo.
echo ==================================================
echo Yeni programa gore time slot'lar basariyla olusturuldu!
echo ==================================================
echo.
echo Program ozeti:
echo - 1. Ders: 08:30-09:10 (40 dk)
echo - 1. Ara:  09:10-09:20 (10 dk)
echo - 2. Ders: 09:20-10:00 (40 dk)
echo - 2. Ara:  10:00-10:20 (20 dk - Uzun Teneffus)
echo - 3. Ders: 10:20-11:00 (40 dk)
echo - 3. Ara:  11:00-11:10 (10 dk)
echo - 4. Ders: 11:10-11:50 (40 dk)
echo - 4. Ara:  11:50-12:00 (10 dk)
echo - 5. Ders: 12:00-12:40 (40 dk)
echo - Ogle:    12:40-13:40 (60 dk)
echo - 6. Ders: 13:40-14:20 (40 dk)
echo - 6. Ara:  14:20-14:30 (10 dk)
echo - 7. Ders: 14:30-15:10 (40 dk)
echo - 7. Ara:  15:10-15:20 (10 dk)
echo - 8. Ders: 15:20-16:00 (40 dk)
