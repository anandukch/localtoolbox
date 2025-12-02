#!/bin/bash

# LocalToolbox Development Setup Script
# This script sets up the development environment for LocalToolbox

set -e

echo "🚀 Setting up LocalToolbox development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust and try again."
    echo "   Visit: https://rustup.rs/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "🐍 Installing Python dependencies..."

# Check if we're in a virtual environment or if pip install will fail
if python3 -m pip install --dry-run moviepy 2>&1 | grep -q "externally-managed-environment"; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "✅ Virtual environment created and activated"
    pip install -r tools/requirements.txt
    echo "💡 Remember to activate the virtual environment before running the app:"
    echo "   source venv/bin/activate"
else
    pip3 install -r tools/requirements.txt
fi

# Check for FFmpeg (optional but recommended)
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg is installed"
else
    echo "⚠️  FFmpeg is not installed. Video processing tools may not work."
    echo "   Install FFmpeg:"
    echo "   - Ubuntu/Debian: sudo apt install ffmpeg"
    echo "   - macOS: brew install ffmpeg"
    echo "   - Windows: Download from https://ffmpeg.org/"
fi

echo ""
echo "🎉 Setup complete! You can now run:"
echo "   npm run tauri dev    # Start development server"
echo "   npm run tauri build  # Build for production"
echo ""
echo "📚 See README.md for more information"
