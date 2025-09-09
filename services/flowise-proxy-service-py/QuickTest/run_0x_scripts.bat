@echo off
REM Run all *_XX.py scripts in numerical order from 01 to 10.

cd /d "%~dp0"

echo The following scripts will be run in order:
for %%F in (*_01.py *_02.py *_03.py *_04.py *_05.py *_06.py *_07.py *_08.py *_09.py *_10.py) do (
    if exist "%%F" echo %%F
)
echo.

REM Loop through script patterns in numerical order
for %%F in (*_01.py *_02.py *_03.py *_04.py *_05.py *_06.py *_07.py *_08.py *_09.py *_10.py) do (
    if exist "%%F" (
        echo Running %%F ...
        python "%%F"
        if errorlevel 1 (
            echo Script %%F failed with error %errorlevel%.
            exit /b %errorlevel%
        )
    )
)
echo All scripts executed.
pause