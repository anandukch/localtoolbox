import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Process {
  pid: number;
  name: string;
  username: string;
  memory_mb: number;
  cpu_percent: number;
  status: string;
  create_time: string;
  cmdline: string;
}

interface SystemInfo {
  cpu_percent: number;
  cpu_count: number;
  memory: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    percent: number;
  };
  load_average?: {
    '1min': number;
    '5min': number;
    '15min': number;
  };
}

interface ProcessListResponse {
  success: boolean;
  message: string;
  processes: Process[];
  system_info: SystemInfo;
  timestamp: string;
}

interface KillResponse {
  success: boolean;
  message: string;
  pid: number;
  name?: string;
}

export const ProcessManager: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(5);
  const [sortBy, setSortBy] = useState<'memory' | 'cpu' | 'name' | 'pid'>('memory');
  const [filterText, setFilterText] = useState<string>('');
  const [selectedPid, setSelectedPid] = useState<number | null>(null);

  const fetchProcesses = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await invoke('run_python_tool', {
        tool: 'process_manager',
        params: {
          action: 'list'
        }
      }) as ProcessListResponse;

      if (response.success) {
        setProcesses(response.processes);
        setSystemInfo(response.system_info);
      } else {
        setError(response.message);
      }
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : error instanceof Error 
          ? error.message 
          : JSON.stringify(error);
      setError(`Failed to fetch processes: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const killProcess = async (pid: number, force: boolean = false) => {
    try {
      const response = await invoke('run_python_tool', {
        tool: 'process_manager',
        params: {
          action: 'kill',
          pid: pid,
          force: force
        }
      }) as KillResponse;

      if (response.success) {
        setSuccessMessage(response.message);
        setTimeout(() => setSuccessMessage(''), 5000);
        // Refresh the process list
        fetchProcesses();
      } else {
        setError(response.message);
        setTimeout(() => setError(''), 5000);
      }
    } catch (error) {
      const errorMessage = typeof error === 'string' 
  ? error 
  : error instanceof Error 
    ? error.message 
    : JSON.stringify(error);
setError(`Failed to fetch processes: ${errorMessage}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchProcesses, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchProcesses]);

  // Initial load
  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  // Filter and sort processes
  const filteredAndSortedProcesses = processes
    .filter(proc => 
      filterText === '' || 
      proc.name.toLowerCase().includes(filterText.toLowerCase()) ||
      proc.cmdline.toLowerCase().includes(filterText.toLowerCase()) ||
      proc.pid.toString().includes(filterText)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'memory':
          return b.memory_mb - a.memory_mb;
        case 'cpu':
          return b.cpu_percent - a.cpu_percent;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'pid':
          return a.pid - b.pid;
        default:
          return 0;
      }
    });

  const formatMemory = (mb: number) => {
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running': return 'text-green-400';
      case 'sleeping': return 'text-blue-400';
      case 'stopped': return 'text-red-400';
      case 'zombie': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Process Manager
          </h1>
          <p className="text-gray-400 text-sm">
            View and manage system processes, similar to the top command
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* System Info */}
        {systemInfo && (
          <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
            <h2 className="text-lg font-medium text-white mb-4">System Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#2A2B2E] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">CPU Usage</h3>
                <div className="text-2xl font-bold text-white">{systemInfo.cpu_percent}%</div>
                <div className="text-sm text-gray-400">{systemInfo.cpu_count} cores</div>
              </div>
              
              <div className="bg-[#2A2B2E] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Memory Usage</h3>
                <div className="text-2xl font-bold text-white">{systemInfo.memory.percent}%</div>
                <div className="text-sm text-gray-400">
                  {systemInfo.memory.used_gb} / {systemInfo.memory.total_gb} GB
                </div>
              </div>

              {systemInfo.load_average && (
                <div className="bg-[#2A2B2E] rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Load Average</h3>
                  <div className="text-sm text-white">
                    1m: {systemInfo.load_average['1min']}<br/>
                    5m: {systemInfo.load_average['5min']}<br/>
                    15m: {systemInfo.load_average['15min']}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E] mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={fetchProcesses}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-300">
                Auto-refresh every
              </label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-1 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                }}
              >
                <option value={2}>2s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-1 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                }}
              >
                <option value="memory">Memory</option>
                <option value="cpu">CPU</option>
                <option value="name">Name</option>
                <option value="pid">PID</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Filter processes..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white placeholder-gray-400 text-sm"
            />
          </div>
        </div>

        {/* Process List */}
        <div className="bg-[#1A1B1E] rounded-xl border border-[#2A2B2E] overflow-hidden">
          <div className="p-4 border-b border-[#2A2B2E]">
            <h2 className="text-lg font-medium text-white">
              Processes ({filteredAndSortedProcesses.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#2A2B2E]">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300 font-medium">PID</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-medium">User</th>
                  <th className="px-4 py-3 text-right text-gray-300 font-medium">Memory</th>
                  <th className="px-4 py-3 text-right text-gray-300 font-medium">CPU%</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-medium">Started</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-medium">Command</th>
                  <th className="px-4 py-3 text-center text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProcesses.map((process, index) => (
                  <tr 
                    key={process.pid}
                    className={`border-b border-[#2A2B2E] hover:bg-[#2A2B2E] ${
                      selectedPid === process.pid ? 'bg-blue-900/30' : ''
                    }`}
                    onClick={() => setSelectedPid(selectedPid === process.pid ? null : process.pid)}
                  >
                    <td className="px-4 py-3 text-white font-mono">{process.pid}</td>
                    <td className="px-4 py-3 text-white">{process.name}</td>
                    <td className="px-4 py-3 text-gray-300">{process.username}</td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {formatMemory(process.memory_mb)}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {process.cpu_percent}%
                    </td>
                    <td className={`px-4 py-3 ${getStatusColor(process.status)}`}>
                      {process.status}
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono">{process.create_time}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate" title={process.cmdline}>
                      {process.cmdline}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            killProcess(process.pid, false);
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          title="Terminate (SIGTERM)"
                        >
                          Term
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Force kill process ${process.name} (PID: ${process.pid})?`)) {
                              killProcess(process.pid, true);
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          title="Force Kill (SIGKILL)"
                        >
                          Kill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedProcesses.length === 0 && !isLoading && (
            <div className="p-8 text-center text-gray-400">
              No processes found matching your filter.
            </div>
          )}
        </div>

        {/* Selected Process Details */}
        {selectedPid && (
          <div className="mt-6 bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
            <h3 className="text-lg font-medium text-white mb-4">
              Process Details (PID: {selectedPid})
            </h3>
            {(() => {
              const selectedProcess = processes.find(p => p.pid === selectedPid);
              if (!selectedProcess) return <p className="text-gray-400">Process not found</p>;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong className="text-gray-300">Name:</strong> {selectedProcess.name}</div>
                  <div><strong className="text-gray-300">PID:</strong> {selectedProcess.pid}</div>
                  <div><strong className="text-gray-300">User:</strong> {selectedProcess.username}</div>
                  <div><strong className="text-gray-300">Status:</strong> <span className={getStatusColor(selectedProcess.status)}>{selectedProcess.status}</span></div>
                  <div><strong className="text-gray-300">Memory:</strong> {formatMemory(selectedProcess.memory_mb)}</div>
                  <div><strong className="text-gray-300">CPU:</strong> {selectedProcess.cpu_percent}%</div>
                  <div className="md:col-span-2"><strong className="text-gray-300">Command:</strong> {selectedProcess.cmdline}</div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
