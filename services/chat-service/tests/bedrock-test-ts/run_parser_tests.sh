#!/bin/bash
# Run the AWS Bedrock response parser tests

echo "============================="
echo "AWS Bedrock Parser Test Suite"
echo "============================="

# Move to project directory
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"
echo "Running tests from: $PROJECT_DIR"

# Ensure TypeScript is installed
if ! command -v tsc &> /dev/null; then
    echo "TypeScript compiler not found. Installing..."
    npm install -g typescript
fi

# Compile TypeScript files
echo -e "\nCompiling TypeScript files..."
tsc --target ES2020 --module commonjs --esModuleInterop true --outDir ./dist ./src/parsingTest/*.ts

if [ $? -ne 0 ]; then
    echo "Failed to compile TypeScript files."
    exit 1
fi

# Run the basic parser test
echo -e "\n\nRunning basic parser test..."
node ./dist/parsingTest/testResponseParser.js

# Run the real samples test
echo -e "\n\nRunning real samples test..."
node ./dist/parsingTest/testRealSamples.js

echo -e "\n\nAll tests completed."