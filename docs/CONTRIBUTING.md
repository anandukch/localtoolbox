# Contributing Guide

This guide explains how to add new tools to LocalToolbox and contribute to the project.

## 🔧 Adding New Tools

### Decision: Client-side vs Python Backend

Before implementing a new tool, decide on the implementation approach:

#### Choose Client-side React When:
- **Simple data processing** (JSON, text, basic images)
- **Real-time feedback** required
- **No system access** needed
- **Small dependencies** available (<50KB)
- **Better UX** is priority

#### Choose Python Backend When:
- **Complex file processing** (video, audio, large images)
- **System operations** required (network, processes, file system)
- **Specialized libraries** needed (MoviePy, PyPDF2, advanced image processing)
- **Large file handling** required (>100MB files)
- **Advanced algorithms** needed

## 🐍 Creating Python Tools

### 1. Create Tool Directory Structure

```bash
mkdir tools/my_new_tool
cd tools/my_new_tool
```

### 2. Create Python Script

Create `tools/my_new_tool/mynew.py`:

```python
#!/usr/bin/env python3
import json
import sys
import os
from pathlib import Path

def main():
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Validate required parameters
        if 'input_path' not in input_data:
            raise ValueError("input_path is required")
        
        input_path = input_data['input_path']
        output_path = input_data.get('output_path', 'output.ext')
        
        # Validate input file exists
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Your tool logic here
        # Process the file and create output
        
        # Example processing
        result_path = process_file(input_path, output_path, input_data)
        
        # Return success response
        result = {
            "success": True,
            "message": "Processing completed successfully",
            "output_path": result_path,
            "metadata": {
                "input_size": os.path.getsize(input_path),
                "output_size": os.path.getsize(result_path) if os.path.exists(result_path) else 0
            }
        }
        print(json.dumps(result))
        
    except Exception as e:
        # Return error response
        error_result = {
            "success": False,
            "message": f"Error: {str(e)}",
            "error_type": type(e).__name__
        }
        print(json.dumps(error_result))
        sys.exit(1)

def process_file(input_path, output_path, options):
    """
    Implement your tool's core logic here
    """
    # Your processing logic
    return output_path

if __name__ == "__main__":
    main()
```

### 3. Register Python Tool

Add your tool to `src-tauri/src/python_bridge.rs`:

```rust
let script_name = match tool.as_str() {
    "video_add_audio" => "addaudio",
    "image_compressor" => "compress", 
    "pdf_merger" => "merge",
    "port_scanner" => "scan",
    "my_new_tool" => "mynew",  // Add this line
    _ => &tool.replace("_", ""),
};
```

### 4. Create React UI Component

Create `src/tools/MyNewTool.tsx`:

```tsx
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const MyNewTool: React.FC = () => {
  const [inputFile, setInputFile] = useState<string>('');
  const [outputPath, setOutputPath] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const handleProcess = async () => {
    if (!inputFile) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await invoke('run_python_tool', {
        tool: 'my_new_tool',
        params: {
          input_path: inputFile,
          output_path: outputPath,
          // Add your tool-specific parameters here
        }
      });
      setResult(response);
    } catch (error) {
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            My New Tool
          </h1>
          <p className="text-gray-400 text-sm">
            Description of what your tool does
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
          <h2 className="text-lg font-medium text-white mb-4">Input</h2>
          
          {/* File input components */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Input File
              </label>
              <input
                type="text"
                value={inputFile}
                onChange={(e) => setInputFile(e.target.value)}
                placeholder="Select input file..."
                className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Output Path
              </label>
              <input
                type="text"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder="Output file path..."
                className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleProcess}
            disabled={!inputFile || isProcessing}
            className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
          >
            {isProcessing ? 'Processing...' : 'Process'}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
            <h2 className="text-lg font-medium text-white mb-4">Result</h2>
            
            {result.success ? (
              <div className="space-y-2">
                <p className="text-green-400">{result.message}</p>
                <p className="text-gray-300">Output: {result.output_path}</p>
              </div>
            ) : (
              <p className="text-red-400">{result.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

## ⚛️ Creating Client-side Tools

### 1. Create React Component

Create `src/tools/MyClientTool.tsx`:

```tsx
import React, { useState, useCallback } from 'react';

export const MyClientTool: React.FC = () => {
  const [inputData, setInputData] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const processData = useCallback(() => {
    setIsProcessing(true);
    
    try {
      // Your client-side processing logic here
      const processed = performProcessing(inputData);
      setResult(processed);
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [inputData]);

  const performProcessing = (data: string): string => {
    // Implement your client-side logic here
    return `Processed: ${data}`;
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            My Client Tool
          </h1>
          <p className="text-gray-400 text-sm">
            Client-side processing tool description
          </p>
        </div>

        {/* Input/Output sections similar to above */}
        
      </div>
    </div>
  );
};
```

### 2. Install Dependencies (if needed)

```bash
npm install your-dependency
```

## 📝 Registering Tools

### 1. Add to App.tsx

Add your tool to the `AVAILABLE_TOOLS` array in `src/App.tsx`:

```tsx
const AVAILABLE_TOOLS = [
  // ... existing tools
  {
    id: 'my_new_tool',
    title: 'My New Tool',
    description: 'Brief description of your tool',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Your SVG icon path */}
      </svg>
    )
  }
];
```

### 2. Add to Component Switch

Add your component to the `renderToolContent` switch statement:

```tsx
const renderToolContent = () => {
  switch (activeTool) {
    // ... existing cases
    case 'my_new_tool':
      return <MyNewTool />;
    default:
      // ... default case
  }
};
```

### 3. Import Component

Add the import at the top of `src/App.tsx`:

```tsx
import { MyNewTool } from "./tools/MyNewTool";
```

## 🧪 Testing Your Tool

### 1. Development Testing

```bash
npm run tauri dev
```

### 2. Test Cases to Cover

- **Valid input**: Normal operation with expected inputs
- **Invalid input**: Error handling for malformed data
- **Edge cases**: Empty files, very large files, special characters
- **Error scenarios**: Missing files, permission issues, network failures

### 3. Manual Testing Checklist

- [ ] Tool appears in sidebar
- [ ] UI renders correctly
- [ ] File selection works
- [ ] Processing completes successfully
- [ ] Error messages are clear and helpful
- [ ] Output files are generated correctly
- [ ] Performance is acceptable

## 📚 Dependencies

### Python Dependencies

Add new Python dependencies to `tools/requirements.txt`:

```txt
existing-dependency==1.0.0
your-new-dependency==2.1.0
```

### Setup Screen Integration

If your tool requires new Python dependencies, add them to the setup screen:

1. Add dependency check in `src-tauri/src/python_bridge.rs`
2. Add installation command
3. Update `src/components/SetupScreen.tsx`

### JavaScript Dependencies

For client-side tools, add npm dependencies:

```bash
npm install --save your-dependency
```

Consider the size impact on the final bundle.

## 🎨 UI Guidelines

### Design Consistency

- Use the existing color scheme (`bg-[#0D0E10]`, `bg-[#1A1B1E]`, etc.)
- Follow the established component structure
- Use consistent spacing and typography
- Include proper loading states and error handling

### Component Structure

```tsx
<div className="min-h-screen bg-[#0D0E10] text-white">
  <div className="p-8 max-w-4xl mx-auto">
    {/* Header */}
    <div className="mb-8">
      <h1 className="text-3xl font-semibold text-white mb-2">Tool Name</h1>
      <p className="text-gray-400 text-sm">Description</p>
    </div>

    {/* Input Section */}
    <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
      {/* Input controls */}
    </div>

    {/* Output Section */}
    <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
      {/* Results */}
    </div>
  </div>
</div>
```

## 🚀 Deployment

### Building

```bash
npm run tauri build
```

### Testing Production Build

Test your tool in the production build before submitting:

1. Build the application
2. Install and run the built package
3. Verify all functionality works in production environment

## 📋 Pull Request Guidelines

### Before Submitting

- [ ] Code follows existing patterns and conventions
- [ ] Tool is properly documented
- [ ] All tests pass
- [ ] No console errors or warnings
- [ ] Performance is acceptable
- [ ] UI is responsive and accessible

### PR Description Template

```markdown
## Tool: [Tool Name]

### Description
Brief description of what the tool does.

### Implementation
- [ ] Client-side React
- [ ] Python backend

### Dependencies Added
- List any new dependencies

### Testing
- [ ] Manual testing completed
- [ ] Edge cases tested
- [ ] Error handling verified

### Screenshots
Include screenshots of the tool in action.
```

## 🤝 Code Review Process

1. **Automated Checks**: Ensure all CI checks pass
2. **Code Review**: Address reviewer feedback
3. **Testing**: Verify functionality works as expected
4. **Documentation**: Update relevant documentation
5. **Merge**: Tool will be merged after approval

## 📞 Getting Help

- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check existing documentation first

Thank you for contributing to LocalToolbox! 🎉
