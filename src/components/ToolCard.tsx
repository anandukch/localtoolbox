import React from 'react';

interface ToolCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  icon,
  onClick,
  isActive = false
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        group relative p-3 rounded-lg cursor-pointer transition-all duration-200
        ${isActive 
          ? 'bg-blue-500/10 border border-blue-500/20' 
          : 'hover:bg-[#1A1B1E] border border-transparent'
        }
      `}
    >
      <div className="flex items-center space-x-3">
        {icon && (
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
            isActive 
              ? 'bg-blue-500/20 text-blue-400' 
              : 'bg-[#1A1B1E] text-gray-400 group-hover:text-gray-300'
          }`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium truncate ${
            isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
          }`}>
            {title}
          </h3>
          <p className={`text-xs truncate ${
            isActive ? 'text-blue-300' : 'text-gray-500 group-hover:text-gray-400'
          }`}>
            {description}
          </p>
        </div>
        
        {/* Active indicator */}
        {isActive && (
          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
        )}
      </div>
      
      {/* Hover indicator */}
      {!isActive && (
        <div className="absolute inset-y-0 left-0 w-0.5 bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-r"></div>
      )}
    </div>
  );
};
