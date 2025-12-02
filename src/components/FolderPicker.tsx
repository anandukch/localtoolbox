import React, { useState } from 'react';

interface FolderPickerProps {
  label: string;
  onFolderSelect: (folderPath: string) => void;
  placeholder?: string;
  value?: string;
}

export const FolderPicker: React.FC<FolderPickerProps> = ({
  label,
  onFolderSelect,
  placeholder = 'No folder selected',
  value = ''
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>(value);

  const handleFolderSelect = async () => {
    try {
      // Check if we're in Tauri environment
      const { isTauri } = await import('@tauri-apps/api/core');
      
      if (await isTauri()) {
        // Try to use Tauri dialog for folder selection
        const { open } = await import('@tauri-apps/plugin-dialog');
        
        const selected = await open({
          directory: true,
          multiple: false
        });

        if (selected && typeof selected === 'string') {
          setSelectedFolder(selected);
          onFolderSelect(selected);
        }
      } else {
        throw new Error('Not running in Tauri environment');
      }
    } catch (error) {
      console.error('Error with Tauri folder dialog:', error);
      // Fallback: prompt user for folder path
      const folderPath = prompt('Native folder picker not available. Please enter the full path to the folder:');
      if (folderPath && folderPath.trim()) {
        setSelectedFolder(folderPath);
        onFolderSelect(folderPath);
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
          onClick={handleFolderSelect}
          className="px-4 py-2 bg-[#1A1B1E] hover:bg-[#2A2B2E] text-gray-300 text-sm font-medium rounded-lg border border-[#2A2B2E] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0D0E10] flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span>Browse Folders</span>
        </button>
        <div className="flex-1 px-4 py-2.5 bg-[#1A1B1E] border border-[#2A2B2E] rounded-lg text-sm text-gray-300 min-h-[42px] flex items-center">
          <span className={selectedFolder ? "text-white" : "text-gray-500"}>
            {selectedFolder || placeholder}
          </span>
        </div>
      </div>
    </div>
  );
};
