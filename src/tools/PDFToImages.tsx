import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

interface PDFInfo {
  filename: string;
  page_count: number;
  file_size: number;
}

interface ConversionResult {
  success: boolean;
  message: string;
  output_dir?: string;
  files?: Array<{
    filename: string;
    path: string;
    page: number;
    size: number;
  }>;
  total_pages?: number;
}

export const PDFToImages: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<string>('');
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [outputDir, setOutputDir] = useState<string>('');
  const [format, setFormat] = useState<'PNG' | 'JPEG'>('PNG');
  const [dpi, setDpi] = useState<number>(200);
  const [pageRange, setPageRange] = useState<'all' | 'range'>('all');
  const [firstPage, setFirstPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string>('');

  const selectPDF = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'PDF',
          extensions: ['pdf']
        }]
      });

      // User cancelled the dialog
      if (!selected) {
        return;
      }

      if (typeof selected === 'string') {
        setPdfFile(selected);
        setError('');
        setResult(null);
        
        try {
          // Get PDF info
          const info = await invoke('run_python_tool', {
            tool: 'pdf_to_images',
            params: {
              action: 'info',
              pdf_path: selected
            }
          }) as PDFInfo & { success: boolean; message?: string };

          if (info.success) {
            setPdfInfo(info);
            setLastPage(info.page_count);
          } else {
            setError(info.message || 'Failed to read PDF info');
          }
        } catch (invokeErr) {
          const errorMessage = typeof invokeErr === 'string' 
            ? invokeErr 
            : invokeErr instanceof Error 
              ? invokeErr.message 
              : JSON.stringify(invokeErr);
          setError(`Failed to read PDF info: ${errorMessage}`);
        }
      }
    } catch (err) {
      // Only show error if it's not a user cancellation
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('cancel') && !errorMessage.includes('Cancel')) {
        setError(`Failed to select PDF: ${errorMessage}`);
      }
    }
  };

  const selectOutputDir = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false
      });

      // User cancelled the dialog
      if (!selected) {
        return;
      }

      if (typeof selected === 'string') {
        setOutputDir(selected);
      }
    } catch (err) {
      // Only show error if it's not a user cancellation
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('cancel') && !errorMessage.includes('Cancel')) {
        setError(`Failed to select directory: ${errorMessage}`);
      }
    }
  };

  const convertPDF = async () => {
    if (!pdfFile) {
      setError('Please select a PDF file');
      return;
    }

    if (!outputDir) {
      setError('Please select an output directory');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult(null);

    try {
      const params: any = {
        action: 'convert',
        pdf_path: pdfFile,
        output_dir: outputDir,
        format: format,
        dpi: dpi
      };

      if (pageRange === 'range') {
        params.first_page = firstPage;
        params.last_page = lastPage;
      }

      const response = await invoke('run_python_tool', {
        tool: 'pdf_to_images',
        params: params
      }) as ConversionResult;

      setResult(response);
      
      if (!response.success) {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const openOutputFolder = async () => {
    if (result?.output_dir) {
      try {
        await invoke('open_folder', { path: result.output_dir });
      } catch (err) {
        setError('Failed to open output folder');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            PDF to Images
          </h1>
          <p className="text-gray-400 text-sm">
            Convert PDF pages to JPG or PNG images
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Success Message */}
        {result && result.success && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-green-300 font-medium mb-2">{result.message}</p>
                <p className="text-sm text-green-400">
                  Converted {result.total_pages} page(s) to {format}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Output: {result.output_dir}
                </p>
              </div>
              <button
                onClick={openOutputFolder}
                className="ml-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Open Folder
              </button>
            </div>
          </div>
        )}

        {/* PDF Selection */}
        <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
          <h2 className="text-lg font-medium text-white mb-4">Select PDF</h2>
          
          <div className="space-y-4">
            <div>
              <button
                onClick={selectPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Choose PDF File
              </button>
              {pdfFile && (
                <div className="mt-3 p-3 bg-[#2A2B2E] rounded-lg">
                  <p className="text-sm text-gray-300 mb-1">
                    <strong>File:</strong> {pdfInfo?.filename || pdfFile.split('/').pop()}
                  </p>
                  {pdfInfo && (
                    <>
                      <p className="text-sm text-gray-300 mb-1">
                        <strong>Pages:</strong> {pdfInfo.page_count}
                      </p>
                      <p className="text-sm text-gray-300">
                        <strong>Size:</strong> {formatFileSize(pdfInfo.file_size)}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <button
                onClick={selectOutputDir}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Choose Output Directory
              </button>
              {outputDir && (
                <p className="mt-2 text-sm text-gray-400">
                  Output: {outputDir}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Conversion Settings */}
        <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
          <h2 className="text-lg font-medium text-white mb-4">Conversion Settings</h2>
          
          <div className="space-y-4">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Output Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="PNG"
                    checked={format === 'PNG'}
                    onChange={(e) => setFormat(e.target.value as 'PNG' | 'JPEG')}
                    className="mr-2"
                  />
                  <span className="text-gray-300">PNG (Lossless)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="JPEG"
                    checked={format === 'JPEG'}
                    onChange={(e) => setFormat(e.target.value as 'PNG' | 'JPEG')}
                    className="mr-2"
                  />
                  <span className="text-gray-300">JPEG (Smaller size)</span>
                </label>
              </div>
            </div>

            {/* DPI Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Resolution (DPI): {dpi}
              </label>
              <input
                type="range"
                min="72"
                max="600"
                step="50"
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>72 (Low)</span>
                <span>200 (Standard)</span>
                <span>300 (High)</span>
                <span>600 (Very High)</span>
              </div>
            </div>

            {/* Page Range */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Page Range
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="all"
                    checked={pageRange === 'all'}
                    onChange={(e) => setPageRange(e.target.value as 'all' | 'range')}
                    className="mr-2"
                  />
                  <span className="text-gray-300">All Pages</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="range"
                    checked={pageRange === 'range'}
                    onChange={(e) => setPageRange(e.target.value as 'all' | 'range')}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Custom Range</span>
                </label>
                
                {pageRange === 'range' && (
                  <div className="ml-6 flex items-center gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">From</label>
                      <input
                        type="number"
                        min="1"
                        max={pdfInfo?.page_count || 1}
                        value={firstPage}
                        onChange={(e) => setFirstPage(Number(e.target.value))}
                        className="w-20 px-3 py-1 bg-[#2A2B2E] border border-[#3A3B3E] rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">To</label>
                      <input
                        type="number"
                        min={firstPage}
                        max={pdfInfo?.page_count || 1}
                        value={lastPage}
                        onChange={(e) => setLastPage(Number(e.target.value))}
                        className="w-20 px-3 py-1 bg-[#2A2B2E] border border-[#3A3B3E] rounded text-white text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Convert Button */}
        <button
          onClick={convertPDF}
          disabled={isProcessing || !pdfFile || !outputDir}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          {isProcessing ? 'Converting...' : 'Convert to Images'}
        </button>

        {/* Conversion Results */}
        {result && result.files && result.files.length > 0 && (
          <div className="mt-6 bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
            <h2 className="text-lg font-medium text-white mb-4">
              Converted Images ({result.files.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#2A2B2E] rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{file.filename}</p>
                    <p className="text-xs text-gray-400">
                      Page {file.page} • {formatFileSize(file.size)}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
