import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SystemData {
  system: {
    os: string;
    node_name: string;
    release: string;
    version: string;
    machine: string;
    processor: string;
    python_version: string;
  };
  boot_time: {
    timestamp: number;
    formatted: string;
  };
  cpu: {
    physical_cores: number;
    total_cores: number;
    max_frequency: string;
    min_frequency: string;
    current_frequency: string;
    usage_per_core: string[];
    total_usage: string;
  };
  memory: {
    total: string;
    available: string;
    used: string;
    percentage: string;
    total_bytes: number;
    available_bytes: number;
    used_bytes: number;
  };
  swap: {
    total: string;
    free: string;
    used: string;
    percentage: string;
  };
  disk: Array<{
    device: string;
    mountpoint: string;
    fstype: string;
    total: string;
    used: string;
    free: string;
    percentage: string;
  }>;
  network: Array<{
    interface: string;
    ip_address: string;
    netmask: string;
    broadcast_ip: string;
  }>;
  network_stats: {
    bytes_sent: string;
    bytes_received: string;
    packets_sent: number;
    packets_received: number;
  };
  battery: {
    percentage: string;
    power_plugged: boolean;
    time_left: string;
  } | null;
}

interface SystemInfoResponse {
  success: boolean;
  data?: SystemData;
  message?: string;
}

export const SystemInfo: React.FC = () => {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchSystemInfo = async () => {
    try {
      setError('');
      const result = await invoke('run_python_tool', {
        tool: 'system_info',
        params: {}
      }) as SystemInfoResponse;

      if (result.success && result.data) {
        setSystemData(result.data);
      } else {
        setError(result.message || 'Failed to fetch system information');
      }
    } catch (err) {
      const errorMessage = typeof err === 'string' 
        ? err 
        : err instanceof Error 
          ? err.message 
          : JSON.stringify(err);
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchSystemInfo();
      }, 5000); // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="w-1 h-6 bg-blue-500 rounded-full mr-3"></span>
        {title}
      </h3>
      {children}
    </div>
  );

  const InfoRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-[#2A2B2E] last:border-b-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );

  const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => {
    const getColor = () => {
      if (percentage > 90) return 'bg-red-500';
      if (percentage > 70) return 'bg-yellow-500';
      if (percentage > 50) return 'bg-green-500';
      return 'bg-blue-500';
    };

    return (
      <div className="w-full bg-[#2A2B2E] rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0D0E10] p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading system information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-[#0D0E10] p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchSystemInfo}
              className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!systemData) {
    return null;
  }

  return (
    <div className="flex-1 bg-[#0D0E10] p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">System Information</h2>
            <p className="text-gray-400">Hardware and software details</p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-[#1A1B1E] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span>Auto-refresh (5s)</span>
            </label>
            <button
              onClick={fetchSystemInfo}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* System Information */}
          <InfoCard title="System">
            <div className="space-y-1">
              <InfoRow label="Operating System" value={`${systemData.system.os} ${systemData.system.release}`} />
              <InfoRow label="Hostname" value={systemData.system.node_name} />
              <InfoRow label="Machine" value={systemData.system.machine} />
              <InfoRow label="Processor" value={systemData.system.processor} />
              <InfoRow label="Python Version" value={systemData.system.python_version} />
              <InfoRow label="Boot Time" value={systemData.boot_time.formatted} />
            </div>
          </InfoCard>

          {/* CPU Information */}
          <InfoCard title="CPU">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Physical Cores" value={systemData.cpu.physical_cores} />
                <InfoRow label="Total Cores" value={systemData.cpu.total_cores} />
                <InfoRow label="Max Frequency" value={systemData.cpu.max_frequency} />
                <InfoRow label="Current Frequency" value={systemData.cpu.current_frequency} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Total CPU Usage</span>
                  <span className="text-white font-medium">{systemData.cpu.total_usage}</span>
                </div>
                <ProgressBar percentage={parseFloat(systemData.cpu.total_usage)} />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Per Core Usage</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {systemData.cpu.usage_per_core.map((usage, index) => (
                    <div key={index} className="bg-[#0D0E10] rounded-lg p-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">Core {index}</span>
                        <span className="text-xs text-white">{usage}</span>
                      </div>
                      <ProgressBar percentage={parseFloat(usage)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </InfoCard>

          {/* Memory Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Memory (RAM)">
              <div className="space-y-4">
                <InfoRow label="Total" value={systemData.memory.total} />
                <InfoRow label="Available" value={systemData.memory.available} />
                <InfoRow label="Used" value={systemData.memory.used} />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Usage</span>
                    <span className="text-white font-medium">{systemData.memory.percentage}</span>
                  </div>
                  <ProgressBar percentage={parseFloat(systemData.memory.percentage)} />
                </div>
              </div>
            </InfoCard>

            <InfoCard title="Swap Memory">
              <div className="space-y-4">
                <InfoRow label="Total" value={systemData.swap.total} />
                <InfoRow label="Free" value={systemData.swap.free} />
                <InfoRow label="Used" value={systemData.swap.used} />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Usage</span>
                    <span className="text-white font-medium">{systemData.swap.percentage}</span>
                  </div>
                  <ProgressBar percentage={parseFloat(systemData.swap.percentage)} />
                </div>
              </div>
            </InfoCard>
          </div>

          {/* Disk Information */}
          <InfoCard title="Disk Partitions">
            <div className="space-y-4">
              {systemData.disk.map((disk, index) => (
                <div key={index} className="bg-[#0D0E10] rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-white font-medium">{disk.mountpoint}</p>
                      <p className="text-xs text-gray-400">{disk.device} ({disk.fstype})</p>
                    </div>
                    <span className="text-white font-medium">{disk.percentage}</span>
                  </div>
                  <ProgressBar percentage={parseFloat(disk.percentage)} />
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-gray-400">Total: </span>
                      <span className="text-white">{disk.total}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Used: </span>
                      <span className="text-white">{disk.used}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Free: </span>
                      <span className="text-white">{disk.free}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>

          {/* Network Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Network Interfaces">
              <div className="space-y-3">
                {systemData.network.map((net, index) => (
                  <div key={index} className="bg-[#0D0E10] rounded-lg p-3">
                    <p className="text-white font-medium mb-1">{net.interface}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">IP Address:</span>
                        <span className="text-white">{net.ip_address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Netmask:</span>
                        <span className="text-white">{net.netmask}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>

            <InfoCard title="Network Statistics">
              <div className="space-y-1">
                <InfoRow label="Bytes Sent" value={systemData.network_stats.bytes_sent} />
                <InfoRow label="Bytes Received" value={systemData.network_stats.bytes_received} />
                <InfoRow label="Packets Sent" value={systemData.network_stats.packets_sent.toLocaleString()} />
                <InfoRow label="Packets Received" value={systemData.network_stats.packets_received.toLocaleString()} />
              </div>
            </InfoCard>
          </div>

          {/* Battery Information */}
          {systemData.battery && (
            <InfoCard title="Battery">
              <div className="space-y-4">
                <InfoRow label="Status" value={systemData.battery.power_plugged ? 'Charging' : 'Discharging'} />
                <InfoRow label="Time Left" value={systemData.battery.time_left} />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Battery Level</span>
                    <span className="text-white font-medium">{systemData.battery.percentage}</span>
                  </div>
                  <ProgressBar percentage={parseFloat(systemData.battery.percentage)} />
                </div>
              </div>
            </InfoCard>
          )}
        </div>
      </div>
    </div>
  );
};
