# LocalToolbox

A cross-platform desktop application that bundles multiple developer and creator tools for offline use. Built with Tauri (Rust), React, and Python for powerful media processing capabilities.

## 🚀 Features

- **Cross-platform**: Works on Windows, macOS, and Linux
- **Offline-first**: All processing happens locally on your machine
- **Extensible**: Easy to add new tools
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Fast**: Rust backend with Python processing engines

### Available Tools

- **Add Audio to Video**: Combine video files with audio tracks using MoviePy

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
  - **macOS**: `brew install ffmpeg`
  - **Windows**: Download FFmpeg and add to PATH

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

This creates platform-specific binaries in `src-tauri/target/release/bundle/`.

## 🔧 Adding New Tools

### 1. Create Python Tool

Create a new directory in `tools/` with your tool name:

```bash
mkdir tools/my_new_tool
```

Create the Python script (e.g., `tools/my_new_tool/mynew.py`):

```python
#!/usr/bin/env python3
import json
import sys

def main():
    try:
        # Read JSON input from stdin
        data = json.loads(sys.stdin.read())
        
        # Your tool logic here
        # Process data['input_param1'], data['input_param2'], etc.
        
        # Return success response
        result = {
            "success": True,
            "message": "Task completed successfully",
            "output_path": "/path/to/output"
        }
        print(json.dumps(result))
        
    except Exception as e:
        # Return error response
        error_result = {
            "success": False,
            "message": f"Error: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
```

### 2. Create React UI Component

Create a new component in `src/tools/`:

```tsx
// src/tools/MyNewTool.tsx
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/Button';

export const MyNewTool: React.FC = () => {
  const [result, setResult] = useState(null);
  
  const handleProcess = async () => {
    try {
      const response = await invoke('run_python_tool', {
        tool: 'my_new_tool',
        params: {
          // Your parameters here
        }
      });
      setResult(response);
    } catch (error) {
      setResult({ success: false, message: error });
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">My New Tool</h2>
      {/* Your UI components here */}
      <Button onClick={handleProcess}>Run Tool</Button>
    </div>
  );
};
```

### 3. Register the Tool

Add your tool to `src/App.tsx`:

```tsx
const AVAILABLE_TOOLS = [
  // ... existing tools
  {
    id: 'my_new_tool',
    title: 'My New Tool',
    description: 'Description of what your tool does',
    icon: <YourIcon />
  }
];

// Add to renderToolContent switch statement
case 'my_new_tool':
  return <MyNewTool />;
```

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

## 🔄 JSON Communication Protocol

### Input Format (Frontend → Python)
```json
{
  "param1": "value1",
  "param2": "value2"
}
```

### Output Format (Python → Frontend)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "output_path": "/path/to/result/file"
}
```

### Error Format
```json
{
  "success": false,
  "message": "Error description"
}
```

## 🐛 Troubleshooting

### Python Tool Not Found
- Ensure the Python script exists in `tools/{tool_name}/{tool_name}.py`
- Check that Python is installed and accessible as `python3` (Linux/macOS) or `python` (Windows)

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

## 🎯 Roadmap

- [ ] Image compression tool
- [ ] Audio format converter
- [ ] Video format converter
- [ ] Batch processing capabilities
- [ ] Plugin system for external tools
- [ ] Cloud backup integration (optional)
