import React, { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FilePicker } from '../components/FilePicker';
import { FolderPicker } from '../components/FolderPicker';

interface CompressionResult {
  success: boolean;
  message: string;
  output_path?: string;
  original_size?: number;
  compressed_size?: number;
  compression_ratio?: number;
}

export const ImageCompressor: React.FC = () => {
  const [inputImage, setInputImage] = useState<string>('');
  const [outputFolder, setOutputFolder] = useState<string>('');
  const [quality, setQuality] = useState<number>(85);
  const [maxWidth, setMaxWidth] = useState<number>(1920);
  const [maxHeight, setMaxHeight] = useState<number>(1080);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputImageChange = (path: string) => {
    setInputImage(path);
    setResult(null);
    setError(null);
  };

  const handleCompress = async () => {
    if (!inputImage || !outputFolder) {
      setError('Please select both input image and output folder');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Generate output filename
      const inputFileName = inputImage.split('/').pop() || 'compressed_image.jpg';
      const nameWithoutExt = inputFileName.replace(/\.[^/.]+$/, '');
      const outputPath = `${outputFolder}/${nameWithoutExt}_compressed.jpg`;

      const params = {
        input: inputImage,
        output: outputPath,
        quality: quality,
        max_width: maxWidth,
        max_height: maxHeight
      };

      console.log('Compressing image with params:', params);

      const response = await invoke<CompressionResult>('run_python_tool', {
        tool: 'image_compressor',
        params: params
      });

      if (response.success) {
        setResult(response);
      } else {
        setError(response.message || 'Compression failed');
      }
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        setError('Compression cancelled');
      } else {
        setError(`Compression failed: ${err}`);
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadCompressedImage = async () => {
    if (result?.output_path) {
      try {
        // Use Tauri invoke to open the folder
        await invoke('plugin:opener|open', { 
          path: result.output_path.substring(0, result.output_path.lastIndexOf('/'))
        });
      } catch (error) {
        console.error('Failed to open folder:', error);
        // Fallback: copy path to clipboard and show alert
        try {
          await navigator.clipboard.writeText(result.output_path);
          alert(`File saved to: ${result.output_path}\n(Path copied to clipboard)`);
        } catch (clipboardError) {
          alert(`File saved to: ${result.output_path}`);
        }
      }
    }
  };

  return (
    <div className="flex-1 p-8 bg-[#0D0E10] overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Image Compressor
          </h1>
          <p className="text-gray-400">
            Compress images to reduce file size while maintaining quality
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
          <h2 className="text-lg font-medium text-white mb-4">Input & Output</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <FilePicker
                label="Select Image"
                onFileSelect={handleInputImageChange}
                accept="image/*"
                placeholder="Choose image file..."
              />
            </div>
            
            <div>
              <FolderPicker
                label="Output Folder"
                onFolderSelect={setOutputFolder}
                placeholder="Choose output folder..."
              />
            </div>
          </div>

          {/* Compression Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quality ({quality}%)
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-2 bg-[#2A2B2E] rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Lower size</span>
                <span>Higher quality</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Width (px)
              </label>
              <input
                type="number"
                value={maxWidth}
                onChange={(e) => setMaxWidth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Height (px)
              </label>
              <input
                type="number"
                value={maxHeight}
                onChange={(e) => setMaxHeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>


        {/* Action Buttons */}
        <div className="flex space-x-3 mb-6">
          <button
            onClick={handleCompress}
            disabled={!inputImage || !outputFolder || isProcessing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Compressing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Compress Image</span>
              </>
            )}
          </button>
          
          {isProcessing && (
            <button
              onClick={handleCancel}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors duration-200"
            >
              Cancel
            </button>
          )}
          
          {result?.success && (
            <button
              onClick={downloadCompressedImage}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Open Folder</span>
            </button>
          )}
        </div>

        {/* Results Section */}
        {result && result.success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-400 font-medium">Compression Successful!</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Original Size:</span>
                <div className="text-white font-medium">
                  {result.original_size ? formatFileSize(result.original_size) : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Compressed Size:</span>
                <div className="text-white font-medium">
                  {result.compressed_size ? formatFileSize(result.compressed_size) : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Compression Ratio:</span>
                <div className="text-white font-medium">
                  {result.compression_ratio ? `${(result.compression_ratio * 100).toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Space Saved:</span>
                <div className="text-white font-medium">
                  {result.original_size && result.compressed_size 
                    ? formatFileSize(result.original_size - result.compressed_size)
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-400 font-medium">Error</span>
            </div>
            <p className="text-red-300 mt-2">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
