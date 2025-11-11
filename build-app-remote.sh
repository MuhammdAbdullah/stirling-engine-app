#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

# Clone the repository if it doesn't exist
if [ ! -d "stirling-engine-app" ]; then
    git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
fi

cd stirling-engine-app

# Install dependencies
npm install

# Build for Linux
npm run build-linux

# List the built files
echo ""
echo "Build complete! Files in dist/:"
ls -lh dist/*.AppImage dist/*.deb dist/*.tar.gz 2>/dev/null || ls -lh dist/


