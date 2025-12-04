import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SetupScreenProps {
  onSetupComplete: () => void;
}

interface SetupStatus {
  python: 'checking' | 'found' | 'missing';
  moviepy: 'checking' | 'found' | 'missing' | 'installing' | 'installed';
  pillow: 'checking' | 'found' | 'missing' | 'installing' | 'installed';
  pypdf2: 'checking' | 'found' | 'missing' | 'installing' | 'installed';
  ffmpeg: 'checking' | 'found' | 'missing' | 'installing' | 'installed';
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete }) => {
  const [status, setStatus] = useState<SetupStatus>({
    python: 'checking',
    moviepy: 'checking',
    pillow: 'checking',
    pypdf2: 'checking',
    ffmpeg: 'checking'
  });
  const [isInstalling, setIsInstalling] = useState(false);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addToLog = (message: string) => {
    setInstallLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkDependencies = async () => {
    try {
      addToLog('Checking system dependencies...');
      
      // Check Python
      const pythonCheck = await invoke<{success: boolean}>('check_python');
      setStatus(prev => ({ ...prev, python: pythonCheck.success ? 'found' : 'missing' }));
      
      if (pythonCheck.success) {
        addToLog('✓ Python 3 found');
        
        // Check MoviePy
        const moviepyCheck = await invoke<{success: boolean}>('check_moviepy');
        setStatus(prev => ({ ...prev, moviepy: moviepyCheck.success ? 'found' : 'missing' }));
        
        if (moviepyCheck.success) {
          addToLog('✓ MoviePy found');
        } else {
          addToLog('✗ MoviePy not found');
        }
        
        // Check Pillow
        const pillowCheck = await invoke<{success: boolean}>('check_pillow');
        setStatus(prev => ({ ...prev, pillow: pillowCheck.success ? 'found' : 'missing' }));
        
        if (pillowCheck.success) {
          addToLog('✓ Pillow found');
        } else {
          addToLog('✗ Pillow not found');
        }
        
        // Check PyPDF2
        const pypdf2Check = await invoke<{success: boolean}>('check_pypdf2');
        setStatus(prev => ({ ...prev, pypdf2: pypdf2Check.success ? 'found' : 'missing' }));
        
        if (pypdf2Check.success) {
          addToLog('✓ PyPDF2 found');
        } else {
          addToLog('✗ PyPDF2 not found');
        }
      } else {
        addToLog('✗ Python 3 not found');
        setStatus(prev => ({ ...prev, moviepy: 'missing', pillow: 'missing', pypdf2: 'missing' }));
      }
      
      // Check FFmpeg
      const ffmpegCheck = await invoke<{success: boolean}>('check_ffmpeg');
      setStatus(prev => ({ ...prev, ffmpeg: ffmpegCheck.success ? 'found' : 'missing' }));
      
      if (ffmpegCheck.success) {
        addToLog('✓ FFmpeg found');
      } else {
        addToLog('✗ FFmpeg not found');
      }
      
    } catch (error) {
      setError(`Failed to check dependencies: ${error}`);
      addToLog(`Error: ${error}`);
    }
  };

  const installDependencies = async () => {
    setIsInstalling(true);
    setError(null);
    
    try {
      // Install MoviePy if missing
      if (status.moviepy === 'missing') {
        setStatus(prev => ({ ...prev, moviepy: 'installing' }));
        addToLog('Installing MoviePy...');
        
        const moviepyResult = await invoke<{success: boolean, message: string}>('install_moviepy');
        
        if (moviepyResult.success) {
          setStatus(prev => ({ ...prev, moviepy: 'installed' }));
          addToLog('✓ MoviePy installed successfully');
        } else {
          setStatus(prev => ({ ...prev, moviepy: 'missing' }));
          addToLog(`✗ Failed to install MoviePy: ${moviepyResult.message}`);
          setError(`Failed to install MoviePy: ${moviepyResult.message}`);
        }
      }
      
      // Install Pillow if missing
      if (status.pillow === 'missing') {
        setStatus(prev => ({ ...prev, pillow: 'installing' }));
        addToLog('Installing Pillow...');
        
        const pillowResult = await invoke<{success: boolean, message: string}>('install_pillow');
        
        if (pillowResult.success) {
          setStatus(prev => ({ ...prev, pillow: 'installed' }));
          addToLog('✓ Pillow installed successfully');
        } else {
          setStatus(prev => ({ ...prev, pillow: 'missing' }));
          addToLog(`✗ Failed to install Pillow: ${pillowResult.message}`);
          setError(`Failed to install Pillow: ${pillowResult.message}`);
        }
      }
      
      // Install PyPDF2 if missing
      if (status.pypdf2 === 'missing') {
        setStatus(prev => ({ ...prev, pypdf2: 'installing' }));
        addToLog('Installing PyPDF2...');
        
        const pypdf2Result = await invoke<{success: boolean, message: string}>('install_pypdf2');
        
        if (pypdf2Result.success) {
          setStatus(prev => ({ ...prev, pypdf2: 'installed' }));
          addToLog('✓ PyPDF2 installed successfully');
        } else {
          setStatus(prev => ({ ...prev, pypdf2: 'missing' }));
          addToLog(`✗ Failed to install PyPDF2: ${pypdf2Result.message}`);
          setError(`Failed to install PyPDF2: ${pypdf2Result.message}`);
        }
      }
      
      // Install FFmpeg if missing (this might require sudo)
      if (status.ffmpeg === 'missing') {
        setStatus(prev => ({ ...prev, ffmpeg: 'installing' }));
        addToLog('Installing FFmpeg...');
        
        const ffmpegResult = await invoke<{success: boolean, message: string}>('install_ffmpeg');
        
        if (ffmpegResult.success) {
          setStatus(prev => ({ ...prev, ffmpeg: 'installed' }));
          addToLog('✓ FFmpeg installed successfully');
        } else {
          setStatus(prev => ({ ...prev, ffmpeg: 'missing' }));
          addToLog(`✗ Failed to install FFmpeg: ${ffmpegResult.message}`);
          // Don't set error for FFmpeg as it might require manual installation
        }
      }
      
    } catch (error) {
      setError(`Installation failed: ${error}`);
      addToLog(`Installation error: ${error}`);
    } finally {
      setIsInstalling(false);
    }
  };

  const canProceed = () => {
    return status.python === 'found' && 
           (status.moviepy === 'found' || status.moviepy === 'installed') &&
           (status.pillow === 'found' || status.pillow === 'installed') &&
           (status.pypdf2 === 'found' || status.pypdf2 === 'installed');
  };

  const needsInstallation = () => {
    return status.moviepy === 'missing' || status.pillow === 'missing' || status.pypdf2 === 'missing' || status.ffmpeg === 'missing';
  };

  useEffect(() => {
    checkDependencies();
  }, []);

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'checking':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>;
      case 'found':
      case 'installed':
        return <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>;
      case 'missing':
        return <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>;
      case 'installing':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.78 0-2.678-2.153-1.415-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">
            Setting up LocalToolbox
          </h1>
          <p className="text-gray-400">
            Checking and installing required dependencies...
          </p>
        </div>

        {/* Dependency Status */}
        <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
          <h2 className="text-lg font-medium text-white mb-4">System Dependencies</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Python 3</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(status.python)}
                <span className="text-sm text-gray-400 capitalize">{status.python}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">MoviePy</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(status.moviepy)}
                <span className="text-sm text-gray-400 capitalize">{status.moviepy}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Pillow (PIL)</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(status.pillow)}
                <span className="text-sm text-gray-400 capitalize">{status.pillow}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">PyPDF2</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(status.pypdf2)}
                <span className="text-sm text-gray-400 capitalize">{status.pypdf2}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">FFmpeg</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(status.ffmpeg)}
                <span className="text-sm text-gray-400 capitalize">{status.ffmpeg}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Installation Log */}
        {installLog.length > 0 && (
          <div className="bg-[#1A1B1E] rounded-xl p-4 border border-[#2A2B2E] mb-6">
            <h3 className="text-sm font-medium text-white mb-2">Installation Log</h3>
            <div className="bg-black rounded-lg p-3 max-h-32 overflow-y-auto">
              {installLog.map((log, index) => (
                <div key={index} className="text-xs text-gray-300 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-400 text-sm font-medium">Setup Error</span>
            </div>
            <p className="text-red-300 text-sm mt-2">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {needsInstallation() && !isInstalling && (
            <button
              onClick={installDependencies}
              disabled={status.python === 'missing'}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200"
            >
              Install Missing Dependencies
            </button>
          )}
          
          {canProceed() && (
            <button
              onClick={onSetupComplete}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200"
            >
              Continue to LocalToolbox
            </button>
          )}
          
          <button
            onClick={checkDependencies}
            disabled={isInstalling}
            className="px-6 py-3 bg-[#1A1B1E] hover:bg-[#2A2B2E] text-gray-300 font-medium rounded-xl border border-[#2A2B2E] transition-colors duration-200"
          >
            Recheck
          </button>
        </div>

        {/* Manual Installation Instructions */}
        {status.python === 'missing' && (
          <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <h3 className="text-yellow-400 font-medium mb-2">Manual Installation Required</h3>
            <p className="text-yellow-300 text-sm">
              Python 3 is not installed. Please install it manually:
            </p>
            <code className="block bg-black rounded p-2 mt-2 text-xs text-gray-300">
              sudo apt update && sudo apt install python3 python3-pip
            </code>
          </div>
        )}
      </div>
    </div>
  );
};
