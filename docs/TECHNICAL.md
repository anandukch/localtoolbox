# Technical Documentation

This document provides detailed technical information about each tool in LocalToolbox, including implementation details, dependencies, and architectural decisions.

## 📊 Tool Implementation Overview

### Implementation Strategy

LocalToolbox uses a hybrid approach combining Python backend processing for complex operations and client-side React for lightweight tasks:

- **Python Backend**: Heavy processing, system operations, specialized libraries
- **Client-side React**: Real-time operations, simple data processing, zero dependencies

## 🎥 Media Processing Tools

### Add Audio to Video

**Implementation**: Python (MoviePy)  
**Location**: `tools/video_add_audio/addaudio.py`  
**UI Component**: `src/tools/AddAudioToVideo.tsx`

#### Technical Details

- **Primary Library**: MoviePy for video/audio manipulation
- **Dependencies**: FFmpeg (system-level), MoviePy (Python)
- **Processing**: Server-side due to large file handling requirements
- **Memory Usage**: Streams large files to avoid memory overflow
- **Output**: Combined video file with merged audio track

#### Why Python Backend?

- **File Size**: Video files can be GB-sized, unsuitable for browser processing
- **FFmpeg Integration**: MoviePy provides robust FFmpeg bindings
- **Codec Support**: Handles various video/audio formats natively
- **Performance**: Native processing faster than JavaScript alternatives

### Image Compressor

**Implementation**: Python (Pillow)  
**Location**: `tools/image_compressor/compress.py`  
**UI Component**: `src/tools/ImageCompressor.tsx`

#### Technical Details

- **Primary Library**: Pillow (PIL) for image processing
- **Compression**: JPEG quality adjustment, PNG optimization
- **Batch Processing**: Handles multiple images simultaneously
- **Format Support**: JPEG, PNG, WebP, BMP, TIFF

#### Why Python Backend?

- **Advanced Algorithms**: Pillow provides professional-grade compression
- **Format Support**: Extensive format compatibility
- **Existing Infrastructure**: Leverages already-installed Pillow dependency

### Image Format Converter

**Implementation**: Client-side React (Canvas API)  
**Location**: `src/tools/ImageFormatConverter.tsx`  
**Dependencies**: HTML5 Canvas API (built-in)

#### Technical Details

- **Conversion Engine**: HTML5 Canvas `toBlob()` method
- **Supported Formats**: PNG ↔ JPG ↔ WebP
- **Quality Control**: JPEG/WebP compression with quality slider
- **Resize Capability**: Canvas-based image resizing with aspect ratio control
- **Batch Processing**: Multiple file handling with progress tracking

#### Why Client-side?

- **Zero Dependencies**: Uses built-in browser APIs
- **Real-time Preview**: Instant conversion feedback
- **Better UX**: Drag & drop, immediate results
- **Size Impact**: No additional app size increase

#### Technical Implementation

```typescript
// Core conversion logic
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

img.onload = () => {
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  
  // Format conversion
  canvas.toBlob(callback, mimeType, quality);
};
```

## 📄 Document Processing Tools

### PDF Merger

**Implementation**: Python (PyPDF2)  
**Location**: `tools/pdf_merger/merge.py`  
**UI Component**: `src/tools/PDFMerger.tsx`

#### Technical Details

- **Primary Library**: PyPDF2 for PDF manipulation
- **Processing**: Combines multiple PDF files into single output
- **Memory Efficient**: Streams PDF data without loading entire files
- **Metadata Preservation**: Maintains PDF properties and bookmarks

#### Why Python Backend?

- **PDF Complexity**: PDF format requires specialized parsing
- **PyPDF2 Reliability**: Mature library with extensive format support
- **File Handling**: Server-side processing better for large documents

### JSON Formatter

**Implementation**: Client-side React  
**Location**: `src/tools/JSONFormatter.tsx`  
**Dependencies**: Native JavaScript JSON API

#### Technical Details

- **Validation**: `JSON.parse()` with error catching and line/column reporting
- **Formatting**: `JSON.stringify()` with configurable indentation
- **Statistics**: Recursive object analysis for keys, arrays, objects count
- **File Operations**: Browser File API for upload/download

#### Why Client-side?

- **Pure Data Processing**: No heavy computation required
- **Real-time Validation**: Instant feedback as user types
- **Zero Dependencies**: Uses native JavaScript JSON handling
- **Better UX**: No server round-trips for simple text processing

#### Technical Implementation

```typescript
// Validation with detailed error reporting
const validateJSON = (jsonString: string) => {
  try {
    const parsed = JSON.parse(jsonString);
    return { valid: true, parsed, error: null };
  } catch (error) {
    // Extract line/column from error message
    const match = error.message.match(/position (\d+)/);
    return { valid: false, error: error.message, position: match?.[1] };
  }
};
```

## 🔧 Developer Tools

### Port Scanner

**Implementation**: Python (socket)  
**Location**: `tools/port_scanner/scan.py`  
**UI Component**: `src/tools/PortScanner.tsx`

#### Technical Details

- **Network Operations**: Python socket library for port connectivity testing
- **Process Identification**: System calls to identify processes using ports
- **Port Management**: Capability to terminate processes on specific ports
- **Range Scanning**: Configurable port ranges with concurrent scanning

#### Why Python Backend?

- **System Access**: Requires low-level network and process access
- **Security Restrictions**: Browser security prevents direct socket operations
- **Process Control**: System-level operations not available in browser context

### QR Code Generator

**Implementation**: Client-side React  
**Location**: `src/tools/QRCodeGenerator.tsx`  
**Dependencies**: `qrcode-generator` library (~15KB)

#### Technical Details

- **QR Generation**: Pure JavaScript QR code creation
- **Template System**: Pre-configured templates for WiFi, email, SMS, etc.
- **Error Correction**: Configurable levels (L/M/Q/H) for damage tolerance
- **Export Formats**: PNG (raster) and SVG (vector) output
- **Real-time Generation**: Updates QR code as user types

#### Why Client-side?

- **Lightweight Task**: QR generation is computationally simple
- **Real-time Feedback**: Instant preview as user modifies content
- **Minimal Dependencies**: Only 15KB library addition
- **Better UX**: No server delays for simple generation

#### Technical Implementation

```typescript
// QR generation with error correction
const generateQR = (text: string, errorCorrection: 'L'|'M'|'Q'|'H') => {
  const qr = QRCode(0, errorCorrection);
  qr.addData(text);
  qr.make();
  
  // Generate different formats
  const dataURL = qr.createDataURL(cellSize, margin);  // PNG
  const svgString = qr.createSvgTag(4, 0);            // SVG
};
```

## 🏗️ Architecture Decisions

### Client-side vs Python Backend Decision Matrix

| Factor | Client-side React | Python Backend |
|--------|------------------|----------------|
| **File Size Impact** | Direct bundle increase | Runtime installation |
| **Processing Speed** | Immediate (no IPC) | Network + process overhead |
| **System Access** | Limited by browser security | Full system capabilities |
| **Dependencies** | npm packages in bundle | System Python libraries |
| **User Experience** | Real-time, responsive | Upload/download workflow |
| **Complexity** | Simple, self-contained | Multi-process coordination |

### Implementation Guidelines

#### Choose Client-side When

- **Simple data processing** (JSON, text, basic images)
- **Real-time feedback** required
- **No system access** needed
- **Small dependencies** available
- **Better UX** is priority

#### Choose Python Backend When

- **Complex file processing** (video, audio, PDFs)
- **System operations** required (network, processes)
- **Specialized libraries** needed (MoviePy, PyPDF2)
- **Large file handling** required
- **Advanced algorithms** needed

### Dependency Management Strategy

#### Python Dependencies

- **Runtime Installation**: Dependencies installed during first app run
- **Setup Screen**: Guided installation with progress tracking
- **Verification**: Health checks ensure dependencies are available
- **Size Optimization**: No dependencies bundled with app distribution

#### JavaScript Dependencies

- **Build-time Bundling**: npm packages included in final app bundle
- **Size Monitoring**: Careful evaluation of package sizes
- **Tree Shaking**: Unused code eliminated during build
- **Performance Impact**: Direct correlation between dependencies and app size

## 🔄 Communication Protocols

### Python Tool Communication

#### Input Format (Frontend → Python)

```json
{
  "input_path": "/path/to/input/file",
  "output_path": "/path/to/output/file",
  "options": {
    "quality": 0.8,
    "format": "jpeg"
  }
}
```

#### Success Response (Python → Frontend)

```json
{
  "success": true,
  "message": "Processing completed successfully",
  "output_path": "/path/to/result/file",
  "metadata": {
    "processing_time": 2.5,
    "file_size": 1024000
  }
}
```

#### Error Response (Python → Frontend)

```json
{
  "success": false,
  "message": "Detailed error description",
  "error_code": "FILE_NOT_FOUND",
  "traceback": "Optional debug information"
}
```

### Client-side Tool Communication

Client-side tools communicate directly through React state management and browser APIs, eliminating the need for JSON serialization and inter-process communication.

## 📈 Performance Considerations

### Memory Management

- **Python Tools**: Process isolation prevents memory leaks
- **Client-side Tools**: Careful cleanup of object URLs and canvas contexts
- **File Handling**: Streaming for large files, chunked processing for batches

### Scalability

- **Concurrent Processing**: Python tools can process multiple requests
- **Browser Limitations**: Client-side tools limited by browser memory and processing power
- **Resource Monitoring**: Background monitoring of system resource usage

### Optimization Strategies

- **Lazy Loading**: Tool components loaded only when needed
- **Code Splitting**: Separate bundles for different tool categories
- **Caching**: Intelligent caching of processed results
- **Progressive Enhancement**: Graceful degradation for limited environments
