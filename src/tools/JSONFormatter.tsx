import React, { useState, useCallback, useEffect } from 'react';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface JSONStats {
  characters: number;
  lines: number;
  size: string;
  keys: number;
  arrays: number;
  objects: number;
}

export const JSONFormatter: React.FC = () => {
  const [inputJSON, setInputJSON] = useState<string>('');
  const [outputJSON, setOutputJSON] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [stats, setStats] = useState<JSONStats | null>(null);
  const [indentSize, setIndentSize] = useState<number>(2);
  const [isMinified, setIsMinified] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string>('');

  // Validate JSON and extract stats
  const validateAndAnalyzeJSON = useCallback((jsonString: string): ValidationResult => {
    if (!jsonString.trim()) {
      setStats(null);
      return { isValid: true };
    }

    try {
      const parsed = JSON.parse(jsonString);
      
      // Calculate stats
      const characters = jsonString.length;
      const lines = jsonString.split('\n').length;
      const sizeInBytes = new Blob([jsonString]).size;
      const size = sizeInBytes < 1024 
        ? `${sizeInBytes} B` 
        : sizeInBytes < 1024 * 1024 
          ? `${(sizeInBytes / 1024).toFixed(1)} KB`
          : `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;

      // Count objects and arrays recursively
      let keys = 0;
      let arrays = 0;
      let objects = 0;

      const countElements = (obj: any): void => {
        if (Array.isArray(obj)) {
          arrays++;
          obj.forEach(countElements);
        } else if (obj !== null && typeof obj === 'object') {
          objects++;
          const objKeys = Object.keys(obj);
          keys += objKeys.length;
          objKeys.forEach(key => countElements(obj[key]));
        }
      };

      countElements(parsed);

      setStats({
        characters,
        lines,
        size,
        keys,
        arrays,
        objects
      });

      return { isValid: true };
    } catch (error) {
      setStats(null);
      if (error instanceof SyntaxError) {
        // Try to extract line and column information
        const match = error.message.match(/at position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          const lines = jsonString.substring(0, position).split('\n');
          const lineNumber = lines.length;
          const columnNumber = lines[lines.length - 1].length + 1;
          
          return {
            isValid: false,
            error: error.message,
            lineNumber,
            columnNumber
          };
        }
        
        return {
          isValid: false,
          error: error.message
        };
      }
      
      return {
        isValid: false,
        error: 'Unknown JSON parsing error'
      };
    }
  }, []);

  // Format JSON with specified indentation
  const formatJSON = useCallback((jsonString: string, indent: number, minify: boolean = false): string => {
    try {
      const parsed = JSON.parse(jsonString);
      if (minify) {
        return JSON.stringify(parsed);
      } else {
        return JSON.stringify(parsed, null, indent);
      }
    } catch (error) {
      return jsonString; // Return original if parsing fails
    }
  }, []);

  // Handle input change
  const handleInputChange = (value: string) => {
    setInputJSON(value);
    const validationResult = validateAndAnalyzeJSON(value);
    setValidation(validationResult);
    
    if (validationResult.isValid && value.trim()) {
      const formatted = formatJSON(value, indentSize, isMinified);
      setOutputJSON(formatted);
    } else {
      setOutputJSON('');
    }
  };

  // Handle format settings change
  useEffect(() => {
    if (validation.isValid && inputJSON.trim()) {
      const formatted = formatJSON(inputJSON, indentSize, isMinified);
      setOutputJSON(formatted);
    }
  }, [indentSize, isMinified, inputJSON, formatJSON, validation.isValid]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: 'input' | 'output') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`${type === 'input' ? 'Input' : 'Output'} copied!`);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setCopySuccess('Copy failed');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  // Download as file (using browser download)
  const downloadAsFile = (content: string, filename: string) => {
    try {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCopySuccess('File downloaded successfully!');
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (error) {
      console.error('Failed to download file:', error);
      setCopySuccess('Download failed');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  // Load from file (using file input)
  const loadFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          handleInputChange(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Sample JSON for testing
  const loadSampleJSON = () => {
    const sample = {
      "name": "John Doe",
      "age": 30,
      "city": "New York",
      "hobbies": ["reading", "swimming", "coding"],
      "address": {
        "street": "123 Main St",
        "zipCode": "10001",
        "coordinates": {
          "lat": 40.7128,
          "lng": -74.0060
        }
      },
      "isActive": true,
      "balance": 1250.75,
      "friends": [
        {
          "name": "Jane Smith",
          "age": 28
        },
        {
          "name": "Bob Johnson",
          "age": 32
        }
      ]
    };
    handleInputChange(JSON.stringify(sample));
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            JSON Formatter
          </h1>
          <p className="text-gray-400 text-sm">
            Pretty-print, validate, and analyze JSON data
          </p>
        </div>

        {/* Controls */}
        <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Indent Size */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-300">Indent:</label>
              <select
                value={indentSize}
                onChange={(e) => setIndentSize(parseInt(e.target.value))}
                className="px-3 py-1 bg-[#2A2B2E] border border-[#3A3B3E] rounded text-white text-sm focus:outline-none focus:border-blue-500 appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>8 spaces</option>
                <option value={0}>Tab</option>
              </select>
            </div>

            {/* Minify Toggle */}
            <label className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isMinified}
                onChange={(e) => setIsMinified(e.target.checked)}
                className="rounded border-[#3A3B3E] bg-[#2A2B2E] text-blue-500 focus:ring-blue-500"
              />
              <span>Minify</span>
            </label>

            {/* Action Buttons */}
            <div className="flex space-x-2 ml-auto">
              <button
                onClick={loadSampleJSON}
                className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Load Sample
              </button>
              <button
                onClick={loadFromFile}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Load File
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {copySuccess && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-green-400">✓</span>
              <span className="text-green-400 text-sm font-medium">{copySuccess}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-[#1A1B1E] rounded-xl border border-[#2A2B2E] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#2A2B2E]">
              <h2 className="text-lg font-medium text-white">Input JSON</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(inputJSON, 'input')}
                  disabled={!inputJSON.trim()}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-medium py-1 px-3 rounded transition-colors duration-200"
                >
                  Copy
                </button>
                <button
                  onClick={() => handleInputChange('')}
                  disabled={!inputJSON.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-medium py-1 px-3 rounded transition-colors duration-200"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="relative">
              <textarea
                value={inputJSON}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Paste your JSON here..."
                className="w-full h-96 p-4 bg-[#0D0E10] text-white font-mono text-sm resize-none focus:outline-none"
                spellCheck={false}
              />
              
              {/* Validation Error */}
              {!validation.isValid && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-500/10 border-t border-red-500/20 p-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-red-400 mt-0.5">⚠</span>
                    <div>
                      <div className="text-red-400 text-sm font-medium">Invalid JSON</div>
                      <div className="text-red-300 text-xs mt-1">{validation.error}</div>
                      {validation.lineNumber && validation.columnNumber && (
                        <div className="text-red-300 text-xs">
                          Line {validation.lineNumber}, Column {validation.columnNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-[#1A1B1E] rounded-xl border border-[#2A2B2E] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#2A2B2E]">
              <h2 className="text-lg font-medium text-white">
                {isMinified ? 'Minified JSON' : 'Formatted JSON'}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(outputJSON, 'output')}
                  disabled={!outputJSON.trim()}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-medium py-1 px-3 rounded transition-colors duration-200"
                >
                  Copy
                </button>
                <button
                  onClick={() => downloadAsFile(outputJSON, 'formatted.json')}
                  disabled={!outputJSON.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-medium py-1 px-3 rounded transition-colors duration-200"
                >
                  Download
                </button>
              </div>
            </div>
            
            <div className="relative">
              <textarea
                value={outputJSON}
                readOnly
                placeholder="Formatted JSON will appear here..."
                className="w-full h-96 p-4 bg-[#0D0E10] text-white font-mono text-sm resize-none focus:outline-none"
                spellCheck={false}
              />
              
              {/* Validation Success */}
              {validation.isValid && outputJSON && (
                <div className="absolute bottom-0 left-0 right-0 bg-green-500/10 border-t border-green-500/20 p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-green-400 text-sm font-medium">Valid JSON</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mt-6">
            <h3 className="text-lg font-medium text-white mb-4">JSON Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-[#0D0E10] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.characters.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Characters</div>
              </div>
              <div className="bg-[#0D0E10] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{stats.lines.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Lines</div>
              </div>
              <div className="bg-[#0D0E10] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{stats.size}</div>
                <div className="text-sm text-gray-400">Size</div>
              </div>
              <div className="bg-[#0D0E10] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.keys.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Keys</div>
              </div>
              <div className="bg-[#0D0E10] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{stats.objects.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Objects</div>
              </div>
              <div className="bg-[#0D0E10] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-cyan-400">{stats.arrays.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Arrays</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
