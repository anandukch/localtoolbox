#!/usr/bin/env python3
"""
Port Scanner Tool

This script scans for open ports on localhost and can identify processes using those ports.
It can also attempt to close ports by terminating the associated processes.

Usage:
    python scan.py

Input (JSON via stdin):
    {
        "action": "scan" | "close",
        "port_range": [start_port, end_port],  // Optional, defaults to [1, 65535]
        "common_ports_only": true | false,     // Optional, defaults to false
        "port_to_close": 8080                  // Required for "close" action
    }

Output (JSON to stdout):
    {
        "success": true,
        "action": "scan",
        "open_ports": [
            {
                "port": 8080,
                "protocol": "tcp",
                "process_name": "node",
                "process_id": 12345,
                "process_command": "node server.js"
            }
        ],
        "scan_range": [1, 1000],
        "total_scanned": 1000,
        "scan_time": 2.5
    }
"""

import sys
import json
import socket
import subprocess
import time
import os
import signal
from typing import List, Dict, Optional, Tuple

# Common ports to scan when common_ports_only is True
COMMON_PORTS = [
    21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995,  # Standard services
    1433, 1521, 3306, 5432, 6379, 27017,              # Databases
    3000, 3001, 4000, 5000, 5173, 8000, 8080, 8443,   # Development servers
    9000, 9001, 9090, 3030, 4200, 5500, 8888, 9999    # More dev ports
]

def scan_port(host: str, port: int, timeout: float = 0.1) -> bool:
    """Check if a port is open on the given host."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            return result == 0
    except Exception:
        return False

def get_process_info(port: int) -> Optional[Dict[str, str]]:
    """Get information about the process using a specific port."""
    try:
        # Use netstat to find the process using the port
        if os.name == 'nt':  # Windows
            cmd = f'netstat -ano | findstr :{port}'
        else:  # Linux/Unix
            cmd = f'netstat -tlnp 2>/dev/null | grep :{port}'
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0 and result.stdout.strip():
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if f':{port}' in line:
                    parts = line.split()
                    if len(parts) > 6:
                        # Extract PID from the last column (format: PID/process_name)
                        pid_info = parts[-1]
                        if '/' in pid_info:
                            pid, process_name = pid_info.split('/', 1)
                        else:
                            pid = pid_info
                            process_name = "unknown"
                        
                        # Get more detailed process info
                        try:
                            if os.name != 'nt':
                                ps_result = subprocess.run(
                                    ['ps', '-p', pid, '-o', 'comm='], 
                                    capture_output=True, text=True
                                )
                                if ps_result.returncode == 0:
                                    process_name = ps_result.stdout.strip()
                                
                                # Get command line
                                ps_cmd_result = subprocess.run(
                                    ['ps', '-p', pid, '-o', 'args='], 
                                    capture_output=True, text=True
                                )
                                command = ps_cmd_result.stdout.strip() if ps_cmd_result.returncode == 0 else "unknown"
                            else:
                                command = "unknown"
                            
                            return {
                                "process_id": pid,
                                "process_name": process_name,
                                "process_command": command
                            }
                        except Exception:
                            return {
                                "process_id": pid,
                                "process_name": process_name,
                                "process_command": "unknown"
                            }
        
        # Fallback: try lsof on Unix systems
        if os.name != 'nt':
            try:
                lsof_result = subprocess.run(
                    ['lsof', '-i', f':{port}', '-t'], 
                    capture_output=True, text=True
                )
                if lsof_result.returncode == 0 and lsof_result.stdout.strip():
                    pid = lsof_result.stdout.strip().split('\n')[0]
                    
                    # Get process name
                    ps_result = subprocess.run(
                        ['ps', '-p', pid, '-o', 'comm='], 
                        capture_output=True, text=True
                    )
                    process_name = ps_result.stdout.strip() if ps_result.returncode == 0 else "unknown"
                    
                    # Get command
                    ps_cmd_result = subprocess.run(
                        ['ps', '-p', pid, '-o', 'args='], 
                        capture_output=True, text=True
                    )
                    command = ps_cmd_result.stdout.strip() if ps_cmd_result.returncode == 0 else "unknown"
                    
                    return {
                        "process_id": pid,
                        "process_name": process_name,
                        "process_command": command
                    }
            except Exception:
                pass
        
        return None
    except Exception:
        return None

def close_port(port: int) -> Tuple[bool, str]:
    """Attempt to close a port by terminating the process using it."""
    try:
        process_info = get_process_info(port)
        if not process_info:
            return False, f"No process found using port {port}"
        
        pid = int(process_info["process_id"])
        process_name = process_info["process_name"]
        
        # Try to terminate the process gracefully first
        try:
            if os.name == 'nt':  # Windows
                subprocess.run(['taskkill', '/PID', str(pid)], check=True)
            else:  # Linux/Unix
                os.kill(pid, signal.SIGTERM)
            
            # Wait a bit and check if process is still running
            time.sleep(1)
            
            # Check if port is still open
            if not scan_port('127.0.0.1', port):
                return True, f"Successfully closed port {port} (terminated {process_name}, PID: {pid})"
            
            # If still running, force kill
            if os.name == 'nt':
                subprocess.run(['taskkill', '/F', '/PID', str(pid)], check=True)
            else:
                os.kill(pid, signal.SIGKILL)
            
            time.sleep(1)
            
            if not scan_port('127.0.0.1', port):
                return True, f"Successfully closed port {port} (force killed {process_name}, PID: {pid})"
            else:
                return False, f"Failed to close port {port} - process may be protected"
                
        except ProcessLookupError:
            return True, f"Process using port {port} was already terminated"
        except PermissionError:
            return False, f"Permission denied - cannot terminate process using port {port}"
        except Exception as e:
            return False, f"Failed to terminate process using port {port}: {str(e)}"
            
    except Exception as e:
        return False, f"Error closing port {port}: {str(e)}"

def scan_ports(host: str, port_range: List[int], common_ports_only: bool = False) -> List[Dict]:
    """Scan for open ports and return detailed information."""
    open_ports = []
    
    if common_ports_only:
        ports_to_scan = [p for p in COMMON_PORTS if port_range[0] <= p <= port_range[1]]
    else:
        ports_to_scan = range(port_range[0], port_range[1] + 1)
    
    for port in ports_to_scan:
        if scan_port(host, port):
            port_info = {
                "port": port,
                "protocol": "tcp",
                "process_name": "unknown",
                "process_id": "unknown",
                "process_command": "unknown"
            }
            
            # Get process information
            process_info = get_process_info(port)
            if process_info:
                port_info.update(process_info)
            
            open_ports.append(port_info)
    
    return open_ports

def main():
    try:
        # Read JSON input from stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            raise ValueError("No input data received")
        
        data = json.loads(input_data)
        
        # Validate required fields
        if 'action' not in data:
            raise ValueError("Missing required field: action")
        
        action = data['action']
        
        if action == "scan":
            # Default port range
            port_range = data.get('port_range', [1, 65535])
            common_ports_only = data.get('common_ports_only', False)
            
            if len(port_range) != 2 or port_range[0] > port_range[1]:
                raise ValueError("Invalid port_range: must be [start_port, end_port]")
            
            # Limit scan range for safety
            if port_range[1] - port_range[0] > 10000 and not common_ports_only:
                port_range[1] = port_range[0] + 10000
            
            start_time = time.time()
            open_ports = scan_ports('127.0.0.1', port_range, common_ports_only)
            scan_time = time.time() - start_time
            
            if common_ports_only:
                total_scanned = len([p for p in COMMON_PORTS if port_range[0] <= p <= port_range[1]])
            else:
                total_scanned = min(port_range[1] - port_range[0] + 1, 10001)
            
            result = {
                "success": True,
                "action": "scan",
                "open_ports": open_ports,
                "scan_range": port_range,
                "total_scanned": total_scanned,
                "scan_time": round(scan_time, 2),
                "common_ports_only": common_ports_only
            }
            
        elif action == "close":
            if 'port_to_close' not in data:
                raise ValueError("Missing required field for close action: port_to_close")
            
            port_to_close = data['port_to_close']
            success, message = close_port(port_to_close)
            
            result = {
                "success": success,
                "action": "close",
                "port": port_to_close,
                "message": message
            }
            
        else:
            raise ValueError(f"Invalid action: {action}. Must be 'scan' or 'close'")
        
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        error_result = {
            "success": False,
            "message": f"Invalid JSON input: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)
        
    except Exception as e:
        error_result = {
            "success": False,
            "message": f"Error: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
