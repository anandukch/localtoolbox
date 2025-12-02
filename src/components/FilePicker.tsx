import React, { useState } from 'react';

interface FilePickerProps {
  label: string;
  accept?: string;
  onFileSelect: (filePath: string) => void;
  placeholder?: string;
  value?: string;
}

export const FilePicker: React.FC<FilePickerProps> = ({
  label,
  accept,
  onFileSelect,
  placeholder = 'No file selected',
  value = ''
}) => {
  const [selectedFile, setSelectedFile] = useState<string>(value);

  const handleFileSelect = async () => {
    try {
      // Check if we're in Tauri environment
      const { isTauri } = await import('@tauri-apps/api/core');
      
      if (await isTauri()) {
        // Try to use Tauri dialog
        const { open } = await import('@tauri-apps/plugin-dialog');
        
        // Convert accept string to file extensions array for filters
        const extensions = accept ? accept.split(',').map(ext => ext.trim().replace('.', '')) : undefined;
        
        const selected = await open({
          multiple: false,
          filters: extensions ? [{
            name: 'Supported files',
            extensions
          }] : undefined
        });

        if (selected && typeof selected === 'string') {
          setSelectedFile(selected);
          onFileSelect(selected);
        }
      } else {
        throw new Error('Not running in Tauri environment');
      }
    } catch (error) {
      console.error('Error with Tauri dialog:', error);
      // Fallback: prompt user for file path
      const filePath = prompt('Native file picker not available. Please enter the full path to your file:');
      if (filePath && filePath.trim()) {
        setSelectedFile(filePath);
        onFileSelect(filePath);
      }
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      <div className="flex items-center space-x-3">
        <button
          onClick={handleFileSelect}
          className="px-4 py-2 bg-[#1A1B1E] hover:bg-[#2A2B2E] text-gray-300 text-sm font-medium rounded-lg border border-[#2A2B2E] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0D0E10]"
        >
          Browse
        </button>
        <div className="flex-1 px-4 py-2.5 bg-[#1A1B1E] border border-[#2A2B2E] rounded-lg text-sm text-gray-300 min-h-[42px] flex items-center">
          <span className={selectedFile ? "text-white" : "text-gray-500"}>
            {selectedFile || placeholder}
          </span>
        </div>
      </div>
    </div>
  );
};
