import React, { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FilePicker } from '../components/FilePicker';
import { FolderPicker } from '../components/FolderPicker';

interface ProcessResult {
  success: boolean;
  message?: string;
  output_path?: string;
}

export const AddAudioToVideo: React.FC = () => {
  const [videoFile, setVideoFile] = useState<string>('');
  const [audioFile, setAudioFile] = useState<string>('');
  const [outputFolder, setOutputFolder] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>('');
  const [result, setResult] = useState<ProcessResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleProcess = async () => {
    if (!videoFile || !audioFile || !outputFolder) {
      setResult({
        success: false,
        message: 'Please select all required files and output folder'
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setProgress('Starting video processing...');
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Construct output path with output.mp4 filename
      const outputPath = `${outputFolder}/output.mp4`;
      
      setProgress('Processing video and audio...');
      
      const response = await invoke<ProcessResult>('run_python_tool', {
        tool: 'video_add_audio',
        params: {
          video: videoFile,
          audio: audioFile,
          output: outputPath
        }
      });

      if (abortControllerRef.current?.signal.aborted) {
        setResult({
          success: false,
          message: 'Process was cancelled'
        });
        return;
      }

      setProgress('Video processing completed!');
      setResult(response);
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        setResult({
          success: false,
          message: 'Process was cancelled'
        });
      } else {
        setResult({
          success: false,
          message: `Error: ${error}`
        });
      }
    } finally {
      setIsProcessing(false);
      setProgress('');
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setProgress('Cancelling...');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Add Audio to Video
          </h1>
          <p className="text-gray-400 text-sm">
            Combine your video with audio to create the perfect output
          </p>
        </div>
        
        <div className="space-y-6">
        <FilePicker
          label="Video File"
          accept=".mp4,.avi,.mov,.mkv,.webm"
          onFileSelect={setVideoFile}
          placeholder="Select a video file..."
          value={videoFile}
        />

        <FilePicker
          label="Audio File"
          accept=".mp3,.wav,.aac,.flac,.ogg"
          onFileSelect={setAudioFile}
          placeholder="Select an audio file..."
          value={audioFile}
        />

        <FolderPicker
          label="Output Folder"
          onFolderSelect={setOutputFolder}
          placeholder="Select output folder... (file will be saved as output.mp4)"
          value={outputFolder}
        />

          {/* Progress indicator */}
          {isProcessing && progress && (
            <div className="p-4 bg-[#1A1B1E] border border-[#2A2B2E] rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#3A3B3E] border-t-blue-500"></div>
                <span className="text-sm text-gray-300 font-medium">{progress}</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleProcess}
              disabled={isProcessing || !videoFile || !audioFile || !outputFolder}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0D0E10]"
            >
              {isProcessing ? 'Processing...' : 'Add Audio to Video'}
            </button>
            
            {isProcessing && (
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-[#1A1B1E] hover:bg-[#2A2B2E] text-gray-300 font-medium rounded-xl border border-[#2A2B2E] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#0D0E10]"
              >
                Cancel
              </button>
            )}
          </div>

          {result && (
            <div className={`p-4 rounded-xl border ${
              result.success 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className={`text-sm ${
                result.success 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {result.success ? (
                  <div>
                    <p className="font-medium flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Success!
                    </p>
                    {result.output_path && (
                      <p className="mt-2 text-gray-300 text-xs">Output saved to: {result.output_path}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Error
                    </p>
                    <p className="mt-2 text-gray-300 text-xs">{result.message}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
