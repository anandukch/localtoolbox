import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FilePicker } from '../components/FilePicker';
import { FolderPicker } from '../components/FolderPicker';

interface MergeResult {
  success: boolean;
  message?: string;
  output_path?: string;
  total_pages?: number;
  input_count?: number;
  output_size?: number;
}

export const PDFMerger: React.FC = () => {
  const [inputFiles, setInputFiles] = useState<string[]>([]);
  const [outputFolder, setOutputFolder] = useState<string>('');
  const [outputFileName, setOutputFileName] = useState<string>('merged_document.pdf');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<MergeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddFile = (filePath: string) => {
    if (!inputFiles.includes(filePath)) {
      setInputFiles([...inputFiles, filePath]);
      setResult(null);
      setError(null);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = inputFiles.filter((_, i) => i !== index);
    setInputFiles(newFiles);
    setResult(null);
    setError(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newFiles = [...inputFiles];
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      setInputFiles(newFiles);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < inputFiles.length - 1) {
      const newFiles = [...inputFiles];
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
      setInputFiles(newFiles);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleMerge = async () => {
    if (inputFiles.length < 2) {
      setError('Please select at least 2 PDF files to merge');
      return;
    }

    if (!outputFolder) {
      setError('Please select an output folder');
      return;
    }

    if (!outputFileName.trim()) {
      setError('Please enter an output file name');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Ensure output filename has .pdf extension
      const fileName = outputFileName.endsWith('.pdf') ? outputFileName : `${outputFileName}.pdf`;
      const outputPath = `${outputFolder}/${fileName}`;

      const response = await invoke<MergeResult>('run_python_tool', {
        tool: 'pdf_merger',
        params: {
          input_files: inputFiles,
          output: outputPath
        }
      });

      if (response.success) {
        setResult(response);
      } else {
        setError(response.message || 'PDF merge failed');
      }
    } catch (err) {
      setError(`PDF merge failed: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openOutputFolder = async () => {
    if (result?.output_path) {
      try {
        // Get the folder path from the file path
        const folderPath = result.output_path.substring(0, result.output_path.lastIndexOf('/'));
        
        // Use Tauri's command to open the folder
        await invoke('open_folder', { path: folderPath });
      } catch (error) {
        console.error('Failed to open folder:', error);
        
        // Fallback: copy path to clipboard and show alert
        try {
          const folderPath = result.output_path.substring(0, result.output_path.lastIndexOf('/'));
          await navigator.clipboard.writeText(folderPath);
          alert(`PDF saved successfully!\n\nFolder: ${folderPath}\n(Path copied to clipboard)\n\nPlease open the folder manually.`);
        } catch (clipboardError) {
          alert(`PDF saved successfully!\n\nFile: ${result.output_path}\n\nPlease navigate to the folder manually.`);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            PDF Merger
          </h1>
          <p className="text-gray-400 text-sm">
            Combine multiple PDF files into a single document
          </p>
        </div>

        <div className="space-y-6">
          {/* File Selection */}
          <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
            <h2 className="text-lg font-medium text-white mb-4">Select PDF Files</h2>
            
            <div className="mb-4">
              <FilePicker
                label="Add PDF File"
                accept=".pdf"
                onFileSelect={handleAddFile}
                placeholder="Choose PDF file to add..."
              />
            </div>

            {/* File List */}
            {inputFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  Selected Files ({inputFiles.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {inputFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-[#0D0E10] rounded-lg p-3 border border-[#2A2B2E]">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className="text-sm text-gray-400 font-mono">
                          {index + 1}.
                        </span>
                        <span className="text-sm text-white truncate">
                          {file.split('/').pop()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === inputFiles.length - 1}
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Output Settings */}
          <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
            <h2 className="text-lg font-medium text-white mb-4">Output Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FolderPicker
                  label="Output Folder"
                  onFolderSelect={setOutputFolder}
                  placeholder="Choose output folder..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Output File Name
                </label>
                <input
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  placeholder="merged_document.pdf"
                  className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex space-x-3">
            <button
              onClick={handleMerge}
              disabled={isProcessing || inputFiles.length < 2 || !outputFolder}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Merging PDFs...</span>
                </>
              ) : (
                <span>Merge PDFs</span>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-400">⚠</span>
                <span className="text-red-400 text-sm font-medium">Error</span>
              </div>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Success Result */}
          {result && result.success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-green-400 text-sm font-medium">PDF Merge Successful!</span>
                </div>
                <button
                  onClick={openOutputFolder}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Open Folder
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Files Merged:</span>
                  <div className="text-white font-medium">{result.input_count}</div>
                </div>
                <div>
                  <span className="text-gray-400">Total Pages:</span>
                  <div className="text-white font-medium">{result.total_pages}</div>
                </div>
                <div>
                  <span className="text-gray-400">Output Size:</span>
                  <div className="text-white font-medium">
                    {result.output_size ? formatFileSize(result.output_size) : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Location:</span>
                  <div className="text-white font-medium truncate" title={result.output_path}>
                    {result.output_path?.split('/').pop()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
