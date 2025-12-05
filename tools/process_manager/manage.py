#!/usr/bin/env python3
import json
import sys
import psutil
import os
import signal
from datetime import datetime

def get_process_list():
    """Get list of all processes sorted by memory usage"""
    processes = []
    
    for proc in psutil.process_iter(['pid', 'name', 'username', 'memory_info', 'cpu_percent', 'status', 'create_time', 'cmdline']):
        try:
            # Get process info
            pinfo = proc.info
            
            # Calculate memory usage in MB
            memory_mb = pinfo['memory_info'].rss / 1024 / 1024 if pinfo['memory_info'] else 0
            
            # Get command line (first 100 chars)
            cmdline = ' '.join(pinfo['cmdline']) if pinfo['cmdline'] else pinfo['name']
            if len(cmdline) > 100:
                cmdline = cmdline[:97] + "..."
            
            # Format create time
            create_time = datetime.fromtimestamp(pinfo['create_time']).strftime('%H:%M:%S') if pinfo['create_time'] else 'N/A'
            
            process_data = {
                'pid': pinfo['pid'],
                'name': pinfo['name'] or 'N/A',
                'username': pinfo['username'] or 'N/A',
                'memory_mb': round(memory_mb, 1),
                'cpu_percent': round(pinfo['cpu_percent'] or 0, 1),
                'status': pinfo['status'] or 'unknown',
                'create_time': create_time,
                'cmdline': cmdline
            }
            
            processes.append(process_data)
            
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            # Process disappeared or access denied, skip it
            continue
    
    # Sort by memory usage (descending)
    processes.sort(key=lambda x: x['memory_mb'], reverse=True)
    
    return processes

def kill_process(pid, force=False):
    """Kill a process by PID"""
    try:
        process = psutil.Process(pid)
        process_name = process.name()
        
        if force:
            # Force kill (SIGKILL)
            process.kill()
            action = "force killed"
        else:
            # Graceful termination (SIGTERM)
            process.terminate()
            action = "terminated"
        
        # Wait a bit to see if process actually died
        try:
            process.wait(timeout=3)
        except psutil.TimeoutExpired:
            if not force:
                # If graceful termination failed, try force kill
                process.kill()
                action = "force killed (after failed termination)"
        
        return {
            "success": True,
            "message": f"Process {process_name} (PID: {pid}) {action} successfully",
            "pid": pid,
            "name": process_name
        }
        
    except psutil.NoSuchProcess:
        return {
            "success": False,
            "message": f"Process with PID {pid} not found (may have already exited)",
            "pid": pid
        }
    except psutil.AccessDenied:
        return {
            "success": False,
            "message": f"Access denied: Cannot kill process {pid} (insufficient permissions)",
            "pid": pid
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error killing process {pid}: {str(e)}",
            "pid": pid
        }

def get_system_info():
    """Get system resource information"""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_info = {
            'total_gb': round(memory.total / 1024 / 1024 / 1024, 1),
            'used_gb': round(memory.used / 1024 / 1024 / 1024, 1),
            'available_gb': round(memory.available / 1024 / 1024 / 1024, 1),
            'percent': memory.percent
        }
        
        # Load average (Linux only)
        try:
            load_avg = os.getloadavg()
            load_average = {
                '1min': round(load_avg[0], 2),
                '5min': round(load_avg[1], 2),
                '15min': round(load_avg[2], 2)
            }
        except (OSError, AttributeError):
            load_average = None
        
        return {
            'cpu_percent': cpu_percent,
            'cpu_count': cpu_count,
            'memory': memory_info,
            'load_average': load_average
        }
    except Exception as e:
        return {
            'error': f"Error getting system info: {str(e)}"
        }

def main():
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        action = input_data.get('action', 'list')
        
        if action == 'list':
            # List all processes
            processes = get_process_list()
            system_info = get_system_info()
            
            result = {
                "success": True,
                "message": f"Found {len(processes)} processes",
                "processes": processes,
                "system_info": system_info,
                "timestamp": datetime.now().isoformat()
            }
            
        elif action == 'kill':
            # Kill a specific process
            pid = input_data.get('pid')
            force = input_data.get('force', False)
            
            if not pid:
                raise ValueError("PID is required for kill action")
            
            result = kill_process(int(pid), force)
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        print(json.dumps(result))
        
    except Exception as e:
        # Return error response
        error_result = {
            "success": False,
            "message": f"Error: {str(e)}",
            "error_type": type(e).__name__
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
