#!/bin/bash

# Add ~/.local/bin to PATH if not already there
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo "Adding ~/.local/bin to PATH..."
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    export PATH="$HOME/.local/bin:$PATH"
    echo "✓ Added to .bashrc (will be permanent for new shells)"
fi

# Verify installation
echo ""
echo "Verifying installation..."
if command -v stirling-engine &> /dev/null; then
    echo "✓ App is accessible as 'stirling-engine'"
    stirling-engine --version 2>/dev/null || echo "  (AppImage doesn't have --version flag)"
else
    export PATH="$HOME/.local/bin:$PATH"
    if command -v stirling-engine &> /dev/null; then
        echo "✓ App is accessible as 'stirling-engine' (after adding to PATH)"
    else
        echo "✗ App not found in PATH"
        echo "  Try: export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
fi

if [ -f ~/.local/bin/matrix-stirling-engine ]; then
    echo "✓ App is accessible as 'matrix-stirling-engine'"
fi

if [ -f ~/.local/share/applications/matrix-stirling-engine.desktop ]; then
    echo "✓ Desktop entry created"
fi

echo ""
echo "=== Installation Summary ==="
echo "Install location: ~/.local/share/matrix-stirling-engine"
echo ""
echo "You can now run the app with:"
echo "  stirling-engine"
echo "  matrix-stirling-engine"
echo ""
echo "Or find it in your applications menu as 'Matrix Stirling Engine'"
echo ""
echo "To run it now, type:"
echo "  stirling-engine &"







