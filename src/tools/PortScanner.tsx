import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface PortInfo {
  port: number;
  protocol: string;
  process_name: string;
  process_id: string;
  process_command: string;
}

interface ScanResult {
  success: boolean;
  action: string;
  open_ports: PortInfo[];
  scan_range: [number, number];
  total_scanned: number;
  scan_time: number;
  common_ports_only: boolean;
  message?: string;
}

interface CloseResult {
  success: boolean;
  action: string;
  port: number;
  message: string;
}

export const PortScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isClosingPort, setIsClosingPort] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Scan settings
  const [startPort, setStartPort] = useState<number>(1);
  const [endPort, setEndPort] = useState<number>(10000);
  const [commonPortsOnly, setCommonPortsOnly] = useState<boolean>(true);

  const handleScan = async () => {
    if (startPort > endPort) {
      setError('Start port must be less than or equal to end port');
      return;
    }

    if (startPort < 1 || endPort > 65535) {
      setError('Port range must be between 1 and 65535');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const response = await invoke<ScanResult>('run_python_tool', {
        tool: 'port_scanner',
        params: {
          action: 'scan',
          port_range: [startPort, endPort],
          common_ports_only: commonPortsOnly
        }
      });

      if (response.success) {
        setScanResult(response);
      } else {
        setError(response.message || 'Port scan failed');
      }
    } catch (err) {
      setError(`Port scan failed: ${err}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleClosePort = async (port: number) => {
    setIsClosingPort(port);
    setError(null);

    try {
      const response = await invoke<CloseResult>('run_python_tool', {
        tool: 'port_scanner',
        params: {
          action: 'close',
          port_to_close: port
        }
      });

      if (response.success) {
        // Remove the closed port from the results
        if (scanResult) {
          const updatedPorts = scanResult.open_ports.filter(p => p.port !== port);
          setScanResult({
            ...scanResult,
            open_ports: updatedPorts
          });
        }
        
        // Show success message briefly
        setError(`✓ ${response.message}`);
        setTimeout(() => setError(null), 3000);
      } else {
        setError(response.message || 'Failed to close port');
      }
    } catch (err) {
      setError(`Failed to close port: ${err}`);
    } finally {
      setIsClosingPort(null);
    }
  };

  const getPortColor = (port: number): string => {
    if (port <= 1023) return 'text-red-400'; // System ports
    if (port <= 49151) return 'text-yellow-400'; // Registered ports
    return 'text-green-400'; // Dynamic/private ports
  };

  const getPortDescription = (port: number): string => {
    const commonPorts: { [key: number]: string } = {
      21: 'FTP',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      80: 'HTTP',
      110: 'POP3',
      143: 'IMAP',
      443: 'HTTPS',
      993: 'IMAPS',
      995: 'POP3S',
      1433: 'SQL Server',
      1521: 'Oracle DB',
      3000: 'Node.js Dev',
      3001: 'Node.js Dev',
      3306: 'MySQL',
      4000: 'Dev Server',
      4200: 'Angular Dev',
      5000: 'Flask/Dev',
      5173: 'Vite Dev',
      5432: 'PostgreSQL',
      6379: 'Redis',
      8000: 'HTTP Alt',
      8080: 'HTTP Proxy',
      8443: 'HTTPS Alt',
      9000: 'Dev Server',
      27017: 'MongoDB'
    };
    
    return commonPorts[port] || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Port Scanner
          </h1>
          <p className="text-gray-400 text-sm">
            Scan for open ports on localhost and manage running services
          </p>
        </div>

        <div className="space-y-6">
          {/* Scan Settings */}
          <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
            <h2 className="text-lg font-medium text-white mb-4">Scan Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Port
                </label>
                <input
                  type="number"
                  value={startPort}
                  onChange={(e) => setStartPort(parseInt(e.target.value) || 1)}
                  min="1"
                  max="65535"
                  className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Port
                </label>
                <input
                  type="number"
                  value={endPort}
                  onChange={(e) => setEndPort(parseInt(e.target.value) || 65535)}
                  min="1"
                  max="65535"
                  className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center space-x-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={commonPortsOnly}
                    onChange={(e) => setCommonPortsOnly(e.target.checked)}
                    className="rounded border-[#3A3B3E] bg-[#2A2B2E] text-blue-500 focus:ring-blue-500"
                  />
                  <span>Common ports only</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isScanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Scan Ports</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className={`rounded-xl p-4 ${
              error.startsWith('✓') 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-red-500/10 border border-red-500/20'
            }`}>
              <div className="flex items-center space-x-2">
                <span className={error.startsWith('✓') ? 'text-green-400' : 'text-red-400'}>
                  {error.startsWith('✓') ? '✓' : '⚠'}
                </span>
                <span className={`text-sm font-medium ${error.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                  {error.startsWith('✓') ? 'Success' : 'Error'}
                </span>
              </div>
              <p className={`text-sm mt-1 ${error.startsWith('✓') ? 'text-green-300' : 'text-red-300'}`}>
                {error.replace('✓ ', '')}
              </p>
            </div>
          )}

          {/* Scan Results */}
          {scanResult && (
            <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Scan Results</h2>
                <div className="text-sm text-gray-400">
                  Found {scanResult.open_ports.length} open ports in {scanResult.scan_time}s
                </div>
              </div>

              {/* Scan Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                <div className="bg-[#0D0E10] rounded-lg p-3">
                  <div className="text-gray-400">Scanned Range</div>
                  <div className="text-white font-medium">
                    {scanResult.scan_range[0]} - {scanResult.scan_range[1]}
                  </div>
                </div>
                <div className="bg-[#0D0E10] rounded-lg p-3">
                  <div className="text-gray-400">Total Scanned</div>
                  <div className="text-white font-medium">{scanResult.total_scanned}</div>
                </div>
                <div className="bg-[#0D0E10] rounded-lg p-3">
                  <div className="text-gray-400">Open Ports</div>
                  <div className="text-white font-medium">{scanResult.open_ports.length}</div>
                </div>
                <div className="bg-[#0D0E10] rounded-lg p-3">
                  <div className="text-gray-400">Scan Time</div>
                  <div className="text-white font-medium">{scanResult.scan_time}s</div>
                </div>
              </div>

              {/* Open Ports List */}
              {scanResult.open_ports.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-md font-medium text-white mb-3">Open Ports</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {scanResult.open_ports.map((port, index) => (
                      <div key={index} className="bg-[#0D0E10] rounded-lg p-4 border border-[#2A2B2E]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <span className={`text-lg font-mono font-bold ${getPortColor(port.port)}`}>
                                {port.port}
                              </span>
                              <span className="text-sm text-gray-400">
                                {getPortDescription(port.port)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-300">
                              <div className="flex items-center space-x-1">
                                <span className="text-blue-400">Process:</span>
                                <span>{port.process_name}</span>
                                {port.process_id !== 'unknown' && (
                                  <>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-gray-400">PID: {port.process_id}</span>
                                  </>
                                )}
                              </div>
                              {port.process_command !== 'unknown' && (
                                <div className="text-xs text-gray-500 mt-1 truncate max-w-md">
                                  {port.process_command}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleClosePort(port.port)}
                            disabled={isClosingPort === port.port}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                          >
                            {isClosingPort === port.port ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                <span>Closing...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Close</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No Open Ports Found</h3>
                  <p className="text-gray-400 text-sm">
                    No open ports were detected in the scanned range. Your system appears secure!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
