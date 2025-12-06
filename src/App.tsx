import { useState, useEffect } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { SetupScreen } from "./components/SetupScreen";
import { AddAudioToVideo } from "./tools/AddAudioToVideo";
import { ImageCompressor } from "./tools/ImageCompressor";
import { PDFMerger } from "./tools/PDFMerger";
import { PortScanner } from "./tools/PortScanner";
import { JSONFormatter } from "./tools/JSONFormatter";
import { QRCodeGenerator } from "./tools/QRCodeGenerator";
import { ImageFormatConverter } from "./tools/ImageFormatConverter";
import { ProcessManager } from "./tools/ProcessManager";
import { PDFToImages } from "./tools/PDFToImages";
import { SystemInfo } from "./tools/SystemInfo";
import { FaviconGenerator } from "./tools/FaviconGenerator";
import { invoke } from '@tauri-apps/api/core';

// Define available tools
const AVAILABLE_TOOLS = [
  {
    id: 'video_add_audio',
    title: 'Add Audio to Video',
    description: 'Combine a video file with an audio track',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'image_compressor',
    title: 'Image Compressor',
    description: 'Compress images to reduce file size',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'pdf_merger',
    title: 'PDF Merger',
    description: 'Combine multiple PDFs into one',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    id: 'port_scanner',
    title: 'Port Scanner',
    description: 'Check open ports on localhost',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    )
  },
  {
    id: 'json_formatter',
    title: 'JSON Formatter',
    description: 'Pretty-print and validate JSON',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    )
  },
  {
    id: 'qr_generator',
    title: 'QR Code Generator',
    description: 'Create QR codes from text/URLs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    )
  },
  {
    id: 'image_format_converter',
    title: 'Image Format Converter',
    description: 'Convert between PNG, JPG, WebP formats',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'process_manager',
    title: 'Process Manager',
    description: 'View and manage system processes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    id: 'pdf_to_images',
    title: 'PDF to Images',
    description: 'Convert PDF pages to JPG/PNG',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'system_info',
    title: 'System Info',
    description: 'Display hardware/software info',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'favicon_generator',
    title: 'Favicon Generator',
    description: 'Create favicons from images',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
];

function App() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState<boolean>(true);

  useEffect(() => {
    checkInitialSetup();
  }, []);

  const checkInitialSetup = async () => {
    try {
      // Check if setup was completed before (you could store this in localStorage)
      const setupCompleted = localStorage.getItem('localtoolbox_setup_completed');
      
      if (setupCompleted === 'true') {
        // Quick check if dependencies are still available
        const pythonCheck = await invoke<{success: boolean}>('check_python');
        const moviepyCheck = await invoke<{success: boolean}>('check_moviepy');
        const pillowCheck = await invoke<{success: boolean}>('check_pillow');
        const pypdf2Check = await invoke<{success: boolean}>('check_pypdf2');
        const psutilCheck = await invoke<{success: boolean}>('check_psutil');
        const pdf2imageCheck = await invoke<{success: boolean}>('check_pdf2image');
        
        if (pythonCheck.success && moviepyCheck.success && pillowCheck.success && pypdf2Check.success && psutilCheck.success && pdf2imageCheck.success) {
          setIsSetupComplete(true);
        } else {
          // Dependencies missing, show setup again
          localStorage.removeItem('localtoolbox_setup_completed');
          setIsSetupComplete(false);
        }
      } else {
        setIsSetupComplete(false);
      }
    } catch (error) {
      console.error('Failed to check setup:', error);
      setIsSetupComplete(false);
    } finally {
      setIsCheckingSetup(false);
    }
  };

  const handleSetupComplete = () => {
    localStorage.setItem('localtoolbox_setup_completed', 'true');
    setIsSetupComplete(true);
  };

  if (isCheckingSetup) {
    return (
      <div className="min-h-screen bg-[#0D0E10] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading LocalToolbox...</p>
        </div>
      </div>
    );
  }

  if (!isSetupComplete) {
    return <SetupScreen onSetupComplete={handleSetupComplete} />;
  }

  const renderToolContent = () => {
    switch (activeTool) {
      case 'video_add_audio':
        return <AddAudioToVideo />;
      case 'image_compressor':
        return <ImageCompressor />;
      case 'pdf_merger':
        return <PDFMerger />;
      case 'port_scanner':
        return <PortScanner />;
      case 'json_formatter':
        return <JSONFormatter />;
      case 'qr_generator':
        return <QRCodeGenerator />;
      case 'image_format_converter':
        return <ImageFormatConverter />;
      case 'process_manager':
        return <ProcessManager />;
      case 'pdf_to_images':
        return <PDFToImages />;
      case 'system_info':
        return <SystemInfo />;
      case 'favicon_generator':
        return <FaviconGenerator />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center bg-[#0D0E10] p-8">
            <div className="text-center max-w-2xl px-8">
              {/* Hero Icon */}
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.78 0-2.678-2.153-1.415-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                  </svg>
                </div>
              </div>
              
              {/* Welcome Content */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl font-semibold text-white mb-4">
                    Welcome to LocalToolbox
                  </h1>
                  <p className="text-lg text-gray-400 leading-relaxed">
                    Select a tool from the sidebar to get started.
                  </p>
                </div>
                
                <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
                  <p className="text-gray-300 leading-relaxed">
                    LocalToolbox provides offline developer and creator tools for video, image, 
                    and audio processing. All processing happens locally on your machine for 
                    privacy and performance.
                  </p>
                </div>
                
                {/* Feature highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1">Video Processing</h3>
                    <p className="text-xs text-gray-500">Combine video and audio files</p>
                  </div>
                  
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1">Privacy First</h3>
                    <p className="text-xs text-gray-500">All processing happens locally</p>
                  </div>
                  
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1">Fast & Offline</h3>
                    <p className="text-xs text-gray-500">No internet connection required</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#0D0E10]">
      <Sidebar
        tools={AVAILABLE_TOOLS}
        activeTool={activeTool}
        onToolSelect={setActiveTool}
      />
      <div className="flex-1 overflow-auto">
        {renderToolContent()}
      </div>
    </div>
  );
}

export default App;
