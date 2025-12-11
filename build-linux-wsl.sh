#!/bin/bash
# Build Linux versions using WSL
# Run this from WSL: bash build-linux-wsl.sh

echo "=== Building Linux x64 ==="
npm run build-linux-x64

echo ""
echo "=== Build Complete! ==="
echo "Check the dist/ folder for Linux builds"

