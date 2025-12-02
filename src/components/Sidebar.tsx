import React from 'react';
import { ToolCard } from './ToolCard';

interface Tool {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface SidebarProps {
  tools: Tool[];
  activeTool: string | null;
  onToolSelect: (toolId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tools,
  activeTool,
  onToolSelect
}) => {
  return (
    <div className="w-80 bg-[#0A0B0D] border-r border-[#1A1B1E] h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.78 0-2.678-2.153-1.415-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                LocalToolbox
              </h1>
            </div>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Your offline developer toolkit for video processing and more
          </p>
        </div>
        
        {/* Tools Section */}
        <div className="mb-6">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
            Tools
          </h2>
          <div className="space-y-2">
            {tools.map((tool) => (
              <ToolCard
                key={tool.id}
                title={tool.title}
                description={tool.description}
                icon={tool.icon}
                onClick={() => onToolSelect(tool.id)}
                isActive={activeTool === tool.id}
              />
            ))}
          </div>
        </div>
        
        {tools.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-[#1A1B1E] rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">
              No tools available
            </p>
            <p className="text-gray-600 text-xs">
              Tools will appear here when loaded
            </p>
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-[#1A1B1E]">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>v1.0.0</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
