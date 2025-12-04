import React, { useState, useCallback, useRef } from 'react';

interface ConvertedImage {
  id: string;
  originalFile: File;
  originalUrl: string;
  convertedUrl: string;
  originalFormat: string;
  targetFormat: string;
  originalSize: number;
  convertedSize: number;
  quality: number;
  width: number;
  height: number;
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

interface ConversionSettings {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  resize: boolean;
  width: number;
  height: number;
  maintainAspectRatio: boolean;
}

export const ImageFormatConverter: React.FC = () => {
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: 'jpeg',
    quality: 0.9,
    resize: false,
    width: 800,
    height: 600,
    maintainAspectRatio: true
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supported input formats
  const supportedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp'];

  // Get file format from MIME type
  const getFormatFromMime = (mimeType: string): string => {
    switch (mimeType) {
      case 'image/png': return 'PNG';
      case 'image/jpeg':
      case 'image/jpg': return 'JPG';
      case 'image/webp': return 'WebP';
      case 'image/gif': return 'GIF';
      case 'image/bmp': return 'BMP';
      default: return 'Unknown';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Convert image using Canvas API
  const convertImage = useCallback(async (file: File): Promise<ConvertedImage> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({
          id: Date.now().toString() + Math.random().toString(),
          originalFile: file,
          originalUrl: URL.createObjectURL(file),
          convertedUrl: '',
          originalFormat: getFormatFromMime(file.type),
          targetFormat: settings.format.toUpperCase(),
          originalSize: file.size,
          convertedSize: 0,
          quality: settings.quality,
          width: 0,
          height: 0,
          status: 'error',
          error: 'Canvas not supported'
        });
        return;
      }

      img.onload = () => {
        let { width, height } = img;
        
        // Apply resize if enabled
        if (settings.resize) {
          if (settings.maintainAspectRatio) {
            const aspectRatio = width / height;
            if (width > height) {
              width = settings.width;
              height = width / aspectRatio;
            } else {
              height = settings.height;
              width = height * aspectRatio;
            }
          } else {
            width = settings.width;
            height = settings.height;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to target format
        const mimeType = `image/${settings.format}`;
        const quality = settings.format === 'png' ? undefined : settings.quality;
        
        canvas.toBlob((blob) => {
          if (blob) {
            const convertedUrl = URL.createObjectURL(blob);
            resolve({
              id: Date.now().toString() + Math.random().toString(),
              originalFile: file,
              originalUrl: URL.createObjectURL(file),
              convertedUrl,
              originalFormat: getFormatFromMime(file.type),
              targetFormat: settings.format.toUpperCase(),
              originalSize: file.size,
              convertedSize: blob.size,
              quality: settings.quality,
              width: Math.round(width),
              height: Math.round(height),
              status: 'completed'
            });
          } else {
            resolve({
              id: Date.now().toString() + Math.random().toString(),
              originalFile: file,
              originalUrl: URL.createObjectURL(file),
              convertedUrl: '',
              originalFormat: getFormatFromMime(file.type),
              targetFormat: settings.format.toUpperCase(),
              originalSize: file.size,
              convertedSize: 0,
              quality: settings.quality,
              width: 0,
              height: 0,
              status: 'error',
              error: 'Conversion failed'
            });
          }
        }, mimeType, quality);
      };

      img.onerror = () => {
        resolve({
          id: Date.now().toString() + Math.random().toString(),
          originalFile: file,
          originalUrl: URL.createObjectURL(file),
          convertedUrl: '',
          originalFormat: getFormatFromMime(file.type),
          targetFormat: settings.format.toUpperCase(),
          originalSize: file.size,
          convertedSize: 0,
          quality: settings.quality,
          width: 0,
          height: 0,
          status: 'error',
          error: 'Failed to load image'
        });
      };

      img.src = URL.createObjectURL(file);
    });
  }, [settings]);

  // Process files
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => supportedFormats.includes(file.type));
    
    if (validFiles.length === 0) {
      setSuccessMessage('No valid image files selected');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    setIsProcessing(true);
    
    // Add processing images to state
    const processingImages: ConvertedImage[] = validFiles.map(file => ({
      id: Date.now().toString() + Math.random().toString(),
      originalFile: file,
      originalUrl: URL.createObjectURL(file),
      convertedUrl: '',
      originalFormat: getFormatFromMime(file.type),
      targetFormat: settings.format.toUpperCase(),
      originalSize: file.size,
      convertedSize: 0,
      quality: settings.quality,
      width: 0,
      height: 0,
      status: 'processing' as const
    }));

    setImages(prev => [...prev, ...processingImages]);

    // Convert images one by one
    for (let i = 0; i < validFiles.length; i++) {
      const convertedImage = await convertImage(validFiles[i]);
      
      setImages(prev => prev.map(img => 
        img.id === processingImages[i].id ? convertedImage : img
      ));
    }

    setIsProcessing(false);
    setSuccessMessage(`Converted ${validFiles.length} image(s)`);
    setTimeout(() => setSuccessMessage(''), 3000);
  }, [convertImage, settings.format, settings.quality]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // Handle file input
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // Download single image
  const downloadImage = (image: ConvertedImage) => {
    if (image.status !== 'completed') return;
    
    const link = document.createElement('a');
    link.href = image.convertedUrl;
    link.download = `${image.originalFile.name.split('.')[0]}.${settings.format}`;
    link.click();
    
    // Show success message
    setSuccessMessage(`Downloaded ${image.originalFile.name}`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Download all images as ZIP (simplified - individual downloads)
  const downloadAll = () => {
    const completedImages = images.filter(img => img.status === 'completed');
    completedImages.forEach(image => {
      setTimeout(() => downloadImage(image), 100 * completedImages.indexOf(image));
    });
    
    setSuccessMessage(`Downloading ${completedImages.length} images...`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Clear all images
  const clearAll = () => {
    // Revoke object URLs to free memory
    images.forEach(image => {
      URL.revokeObjectURL(image.originalUrl);
      if (image.convertedUrl) {
        URL.revokeObjectURL(image.convertedUrl);
      }
    });
    setImages([]);
  };

  // Remove single image
  const removeImage = (id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.originalUrl);
        if (imageToRemove.convertedUrl) {
          URL.revokeObjectURL(imageToRemove.convertedUrl);
        }
      }
      return prev.filter(img => img.id !== id);
    });
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Image Format Converter
          </h1>
          <p className="text-gray-400 text-sm">
            Convert between PNG, JPG, and WebP formats with quality control and resizing
          </p>
        </div>

        {/* Settings Panel */}
        <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
          <h2 className="text-lg font-medium text-white mb-4">Conversion Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Output Format */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Output Format</label>
              <select
                value={settings.format}
                onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value as 'png' | 'jpeg' | 'webp' }))}
                className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500 appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            {/* Quality */}
            {settings.format !== 'png' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quality ({Math.round(settings.quality * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.quality}
                  onChange={(e) => setSettings(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-[#2A2B2E] rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            )}

            {/* Resize Toggle */}
            <div>
              <label className="flex items-center space-x-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={settings.resize}
                  onChange={(e) => setSettings(prev => ({ ...prev, resize: e.target.checked }))}
                  className="rounded bg-[#2A2B2E] border-[#3A3B3E] text-blue-600 focus:ring-blue-500"
                />
                <span>Resize Images</span>
              </label>
            </div>

            {/* Aspect Ratio */}
            {settings.resize && (
              <div>
                <label className="flex items-center space-x-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={settings.maintainAspectRatio}
                    onChange={(e) => setSettings(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                    className="rounded bg-[#2A2B2E] border-[#3A3B3E] text-blue-600 focus:ring-blue-500"
                  />
                  <span>Maintain Aspect Ratio</span>
                </label>
              </div>
            )}
          </div>

          {/* Resize Dimensions */}
          {settings.resize && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Width (px)</label>
                <input
                  type="number"
                  value={settings.width}
                  onChange={(e) => setSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                  className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Height (px)</label>
                <input
                  type="number"
                  value={settings.height}
                  onChange={(e) => setSettings(prev => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                  className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 mb-6 ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-[#3A3B3E] hover:border-[#4A4B4E]'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="mb-4">
            <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg text-gray-300 mb-2">
              {isDragging ? 'Drop images here' : 'Drag & drop images or click to select'}
            </p>
            <p className="text-sm text-gray-500">
              Supports PNG, JPG, WebP, GIF, BMP
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
          >
            {isProcessing ? 'Processing...' : 'Select Images'}
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-3 mb-6">
            <p className="text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Results */}
        {images.length > 0 && (
          <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white">
                Converted Images ({images.length})
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={downloadAll}
                  disabled={images.filter(img => img.status === 'completed').length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Download All
                </button>
                <button
                  onClick={clearAll}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="bg-[#2A2B2E] rounded-lg p-4 border border-[#3A3B3E]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-300">
                        {image.originalFormat} → {image.targetFormat}
                      </span>
                      {image.status === 'processing' && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {image.status === 'completed' && (
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {image.status === 'error' && (
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <button
                      onClick={() => removeImage(image.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Image Preview */}
                  <div className="mb-3">
                    <img
                      src={image.convertedUrl || image.originalUrl}
                      alt={image.originalFile.name}
                      className="w-full h-32 object-cover rounded bg-[#0D0E10]"
                    />
                  </div>

                  {/* File Info */}
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Original:</span>
                      <span>{formatFileSize(image.originalSize)}</span>
                    </div>
                    {image.status === 'completed' && (
                      <>
                        <div className="flex justify-between">
                          <span>Converted:</span>
                          <span>{formatFileSize(image.convertedSize)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span>{image.width} × {image.height}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Savings:</span>
                          <span className={image.convertedSize < image.originalSize ? 'text-green-400' : 'text-red-400'}>
                            {image.originalSize > 0 ? 
                              `${Math.round(((image.originalSize - image.convertedSize) / image.originalSize) * 100)}%` : 
                              '0%'
                            }
                          </span>
                        </div>
                      </>
                    )}
                    {image.status === 'error' && (
                      <div className="text-red-400">{image.error}</div>
                    )}
                  </div>

                  {/* Download Button */}
                  {image.status === 'completed' && (
                    <button
                      onClick={() => downloadImage(image)}
                      className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors duration-200"
                    >
                      Download
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
