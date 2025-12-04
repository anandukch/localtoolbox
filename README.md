# LocalToolbox

A desktop tool that bundles multiple developer and creator tools for offline use. Built with Tauri (Rust), React, and Python for powerful media processing capabilities.

## 🚀 Features

- **Linux-native**: Currently builds and runs on Linux (Windows/macOS support planned)
- **Offline-first**: All processing happens locally on your machine
- **Extensible**: Easy to add new tools
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Fast**: Rust backend with Python processing engines
- **Zero dependencies**: Client-side tools require no additional installations

## 🛠️ Available Tools

### 🎥 Media Processing

- **Add Audio to Video**: Combine video files with audio tracks using MoviePy
- **Image Compressor**: Reduce image file sizes while maintaining quality
- **Image Format Converter**: Convert between PNG, JPG, and WebP formats with quality control

### 📄 Document Tools

- **PDF Merger**: Combine multiple PDF files into a single document
- **JSON Formatter**: Pretty-print, validate, and analyze JSON data

### 🔧 Developer Tools

- **Port Scanner**: Check open ports on localhost with process identification
- **QR Code Generator**: Create QR codes for text, URLs, WiFi, contacts, and more

### 📊 Implementation Details

| Tool | Implementation | Dependencies | Size Impact |
|------|---------------|--------------|-------------|
| Add Audio to Video | Python (MoviePy) | MoviePy, FFmpeg | 0KB (runtime install) |
| Image Compressor | Python (Pillow) | Pillow | 0KB (runtime install) |
| PDF Merger | Python (PyPDF2) | PyPDF2 | 0KB (runtime install) |
| Port Scanner | Python (socket) | Built-in | 0KB |
| JSON Formatter | Client-side React | None | 0KB |
| QR Code Generator | Client-side React | qrcode-generator | +15KB |
| Image Format Converter | Client-side React | Canvas API | 0KB |

> **Note**: Python tools use runtime dependency installation, keeping the initial app download small (~50MB) while ensuring all functionality is available after first-time setup.

## 🏗️ Architecture

```
Frontend (React + TypeScript + Tailwind)
    ↓ JSON Communication
Tauri Bridge (Rust)
    ↓ Process Execution + JSON I/O
Python Tools (Individual scripts)
```

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Rust** (latest stable)
- **Python 3.8+** with pip
- **System dependencies** for video processing:
  - **Linux**: `sudo apt install ffmpeg`

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd localtoolbox
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r tools/requirements.txt
   ```

4. **Install Rust dependencies** (handled automatically by Tauri)

## 🚀 Development

### Running in Development Mode

```bash
npm run tauri dev
```

This will:
- Start the Vite development server
- Launch the Tauri application
- Enable hot-reload for both frontend and backend changes

### Building for Production

```bash
npm run tauri build
```

This creates Linux binaries in `src-tauri/target/release/bundle/`.


## 📁 Project Structure

```
localtoolbox/
├── src/                          # React frontend
│   ├── components/               # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── FilePicker.tsx
│   │   ├── Sidebar.tsx
│   │   └── ToolCard.tsx
│   ├── tools/                    # Tool-specific UI components
│   │   └── AddAudioToVideo.tsx
│   ├── App.tsx                   # Main application
│   └── main.tsx                  # React entry point
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs              # Tauri entry point
│   │   ├── lib.rs               # Main Tauri configuration
│   │   └── python_bridge.rs     # Python execution bridge
│   └── Cargo.toml               # Rust dependencies
├── tools/                        # Python processing scripts
│   ├── video_add_audio/
│   │   └── addaudio.py
│   └── requirements.txt          # Python dependencies
└── package.json                  # Node.js dependencies
```


## 🐛 Troubleshooting

### Python Tool Not Found
- Ensure the Python script exists in `tools/{tool_name}/{tool_name}.py`
- Check that Python is installed and accessible as `python3`

### FFmpeg Not Found
- Install FFmpeg system-wide
- Ensure it's in your system PATH

### Build Errors
- Run `cargo clean` in the `src-tauri` directory
- Delete `node_modules` and run `npm install` again
- Ensure all system dependencies are installed

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your tool following the guidelines above
4. Submit a pull request

## 📚 Documentation

- **[Technical Details](./docs/TECHNICAL.md)**: Implementation details for each tool
- **[Contributing Guide](./docs/CONTRIBUTING.md)**: How to add new tools and contribute
- **[API Reference](./docs/API.md)**: JSON communication protocol and API documentation
