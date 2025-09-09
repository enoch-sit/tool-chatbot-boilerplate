@echo off
echo Building Docker image for mimicAzure service...
docker build -t mimic-azure-openai .
if %errorlevel% neq 0 (
    echo Docker build failed!
    exit /b %errorlevel%
)
echo Docker image built successfully!
