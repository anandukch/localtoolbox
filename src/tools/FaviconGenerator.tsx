import React, { useState, useRef } from 'react';

interface FaviconSize {
  size: number;
  name: string;
  description: string;
}

const FAVICON_SIZES: FaviconSize[] = [
  { size: 16, name: 'favicon-16x16.png', description: 'Browser tab' },
  { size: 32, name: 'favicon-32x32.png', description: 'Browser tab (retina)' },
  { size: 48, name: 'favicon-48x48.png', description: 'Windows site icons' },
  { size: 64, name: 'favicon-64x64.png', description: 'Windows site icons' },
  { size: 96, name: 'favicon-96x96.png', description: 'Google TV' },
  { size: 128, name: 'favicon-128x128.png', description: 'Chrome Web Store' },
  { size: 180, name: 'apple-touch-icon.png', description: 'Apple touch icon' },
  { size: 192, name: 'android-chrome-192x192.png', description: 'Android Chrome' },
  { size: 512, name: 'android-chrome-512x512.png', description: 'Android Chrome (high-res)' },
];

export const FaviconGenerator: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([16, 32, 180, 192, 512]);
  const [generating, setGenerating] = useState(false);
  const [generatedFavicons, setGeneratedFavicons] = useState<Array<{ size: number; dataUrl: string; name: string }>>([]);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setError('');
      setGeneratedFavicons([]);
    };
    reader.readAsDataURL(file);
  };

  const toggleSize = (size: number) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size].sort((a, b) => a - b)
    );
  };

  const generateFavicon = (imageUrl: string, size: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate dimensions to maintain aspect ratio
        const aspectRatio = img.width / img.height;
        let drawWidth = size;
        let drawHeight = size;
        let offsetX = 0;
        let offsetY = 0;

        if (aspectRatio > 1) {
          // Image is wider than tall
          drawHeight = size / aspectRatio;
          offsetY = (size - drawHeight) / 2;
        } else if (aspectRatio < 1) {
          // Image is taller than wide
          drawWidth = size * aspectRatio;
          offsetX = (size - drawWidth) / 2;
        }

        // Draw white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // Draw image centered
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };

  const generateAllFavicons = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    if (selectedSizes.length === 0) {
      setError('Please select at least one size');
      return;
    }

    setGenerating(true);
    setError('');
    const favicons: Array<{ size: number; dataUrl: string; name: string }> = [];

    try {
      for (const size of selectedSizes) {
        const dataUrl = await generateFavicon(selectedImage, size);
        const sizeInfo = FAVICON_SIZES.find(s => s.size === size);
        favicons.push({
          size,
          dataUrl,
          name: sizeInfo?.name || `favicon-${size}x${size}.png`
        });
      }
      setGeneratedFavicons(favicons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate favicons');
    } finally {
      setGenerating(false);
    }
  };

  const downloadFavicon = (favicon: { size: number; dataUrl: string; name: string }) => {
    const link = document.createElement('a');
    link.href = favicon.dataUrl;
    link.download = favicon.name;
    link.click();
  };

  const downloadAll = () => {
    if (generatedFavicons.length === 0) return;

    // Download each favicon with a small delay to avoid browser blocking
    generatedFavicons.forEach((favicon, index) => {
      setTimeout(() => downloadFavicon(favicon), 100 * index);
    });
  };

  const selectAllSizes = () => {
    setSelectedSizes(FAVICON_SIZES.map(s => s.size));
  };

  const deselectAllSizes = () => {
    setSelectedSizes([]);
  };

  return (
    <div className="flex-1 bg-[#0D0E10] p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Favicon Generator</h2>
          <p className="text-gray-400">Create favicons in multiple sizes from your image</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Image Selection */}
        <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Select Image</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Choose Image</span>
          </button>

          {selectedImage && (
            <div className="mt-4 flex justify-center">
              <img
                src={selectedImage}
                alt="Selected"
                className="max-w-xs max-h-64 rounded-lg border border-[#2A2B2E]"
              />
            </div>
          )}
        </div>

        {/* Size Selection */}
        <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Select Sizes</h3>
            <div className="flex space-x-2">
              <button
                onClick={selectAllSizes}
                className="px-3 py-1 text-sm bg-[#2A2B2E] hover:bg-[#3A3B3E] text-gray-300 rounded transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAllSizes}
                className="px-3 py-1 text-sm bg-[#2A2B2E] hover:bg-[#3A3B3E] text-gray-300 rounded transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FAVICON_SIZES.map((favicon) => (
              <label
                key={favicon.size}
                className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedSizes.includes(favicon.size)
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-[#2A2B2E] hover:border-[#3A3B3E]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSizes.includes(favicon.size)}
                  onChange={() => toggleSize(favicon.size)}
                  className="w-4 h-4 rounded border-gray-600 bg-[#1A1B1E] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{favicon.size}×{favicon.size}</span>
                    <span className="text-xs text-gray-500">{favicon.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{favicon.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-400">
            Selected: {selectedSizes.length} size{selectedSizes.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateAllFavicons}
          disabled={!selectedImage || selectedSizes.length === 0 || generating}
          className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium mb-6 flex items-center justify-center space-x-2"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Generate Favicons</span>
            </>
          )}
        </button>

        {/* Generated Favicons */}
        {generatedFavicons.length > 0 && (
          <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Generated Favicons</h3>
              <button
                onClick={downloadAll}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download All</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generatedFavicons.map((favicon) => (
                <div
                  key={favicon.size}
                  className="bg-[#0D0E10] rounded-lg p-4 border border-[#2A2B2E] flex flex-col items-center"
                >
                  <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center mb-3 p-2">
                    <img
                      src={favicon.dataUrl}
                      alt={`${favicon.size}x${favicon.size}`}
                      className="max-w-full max-h-full"
                      style={{ imageRendering: favicon.size <= 32 ? 'pixelated' : 'auto' }}
                    />
                  </div>
                  <p className="text-white font-medium text-sm mb-1">{favicon.size}×{favicon.size}</p>
                  <p className="text-gray-400 text-xs mb-3 text-center">{favicon.name}</p>
                  <button
                    onClick={() => downloadFavicon(favicon)}
                    className="w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <h4 className="text-blue-400 font-medium mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tips
          </h4>
          <ul className="text-sm text-gray-300 space-y-1 ml-7">
            <li>• Use a square image for best results</li>
            <li>• PNG or SVG images work best for transparency</li>
            <li>• Minimum recommended size: 512×512 pixels</li>
            <li>• Simple, bold designs work better at small sizes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
