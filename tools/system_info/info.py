#!/usr/bin/env python3
"""
System Information Tool
Displays hardware and software information using psutil
"""

import sys
import json
import platform
import os
from datetime import datetime

try:
    import psutil
except ImportError as e:
    print(json.dumps({
        "success": False,
        "message": f"Missing dependency: {str(e)}. Please install psutil."
    }))
    sys.exit(1)


def get_size(bytes, suffix="B"):
    """
    Scale bytes to its proper format
    e.g: 1253656 => '1.20MB'
    """
    factor = 1024
    for unit in ["", "K", "M", "G", "T", "P"]:
        if bytes < factor:
            return f"{bytes:.2f}{unit}{suffix}"
        bytes /= factor


def get_system_info():
    """
    Collect comprehensive system information
    
    Returns:
        dict: System information including CPU, memory, disk, network, etc.
    """
    try:
        info = {}
        
        # System Information
        uname = platform.uname()
        info["system"] = {
            "os": uname.system,
            "node_name": uname.node,
            "release": uname.release,
            "version": uname.version,
            "machine": uname.machine,
            "processor": uname.processor or platform.processor(),
            "python_version": platform.python_version()
        }
        
        # Boot Time
        boot_time_timestamp = psutil.boot_time()
        bt = datetime.fromtimestamp(boot_time_timestamp)
        info["boot_time"] = {
            "timestamp": boot_time_timestamp,
            "formatted": f"{bt.year}/{bt.month}/{bt.day} {bt.hour}:{bt.minute}:{bt.second}"
        }
        
        # CPU Information
        cpu_freq = psutil.cpu_freq()
        info["cpu"] = {
            "physical_cores": psutil.cpu_count(logical=False),
            "total_cores": psutil.cpu_count(logical=True),
            "max_frequency": f"{cpu_freq.max:.2f}Mhz" if cpu_freq else "N/A",
            "min_frequency": f"{cpu_freq.min:.2f}Mhz" if cpu_freq else "N/A",
            "current_frequency": f"{cpu_freq.current:.2f}Mhz" if cpu_freq else "N/A",
            "usage_per_core": [f"{percentage}%" for percentage in psutil.cpu_percent(percpu=True, interval=1)],
            "total_usage": f"{psutil.cpu_percent()}%"
        }
        
        # Memory Information
        svmem = psutil.virtual_memory()
        info["memory"] = {
            "total": get_size(svmem.total),
            "available": get_size(svmem.available),
            "used": get_size(svmem.used),
            "percentage": f"{svmem.percent}%",
            "total_bytes": svmem.total,
            "available_bytes": svmem.available,
            "used_bytes": svmem.used
        }
        
        # Swap Memory
        swap = psutil.swap_memory()
        info["swap"] = {
            "total": get_size(swap.total),
            "free": get_size(swap.free),
            "used": get_size(swap.used),
            "percentage": f"{swap.percent}%"
        }
        
        # Disk Information
        partitions = psutil.disk_partitions()
        disk_info = []
        for partition in partitions:
            try:
                partition_usage = psutil.disk_usage(partition.mountpoint)
                disk_info.append({
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total": get_size(partition_usage.total),
                    "used": get_size(partition_usage.used),
                    "free": get_size(partition_usage.free),
                    "percentage": f"{partition_usage.percent}%"
                })
            except PermissionError:
                continue
        info["disk"] = disk_info
        
        # Network Information
        if_addrs = psutil.net_if_addrs()
        network_info = []
        for interface_name, interface_addresses in if_addrs.items():
            for address in interface_addresses:
                if str(address.family) == 'AddressFamily.AF_INET':
                    network_info.append({
                        "interface": interface_name,
                        "ip_address": address.address,
                        "netmask": address.netmask,
                        "broadcast_ip": address.broadcast
                    })
        info["network"] = network_info
        
        # Network Statistics
        net_io = psutil.net_io_counters()
        info["network_stats"] = {
            "bytes_sent": get_size(net_io.bytes_sent),
            "bytes_received": get_size(net_io.bytes_recv),
            "packets_sent": net_io.packets_sent,
            "packets_received": net_io.packets_recv
        }
        
        # Battery Information (if available)
        battery = psutil.sensors_battery()
        if battery:
            info["battery"] = {
                "percentage": f"{battery.percent}%",
                "power_plugged": battery.power_plugged,
                "time_left": f"{battery.secsleft // 3600}h {(battery.secsleft % 3600) // 60}m" if battery.secsleft != psutil.POWER_TIME_UNLIMITED else "Charging"
            }
        else:
            info["battery"] = None
        
        return {
            "success": True,
            "data": info
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Error collecting system info: {str(e)}"
        }


def main():
    """Main function to handle JSON input/output"""
    try:
        # Read JSON input from stdin (if any)
        try:
            input_data = json.loads(sys.stdin.read())
        except:
            input_data = {}
        
        # Get system information
        result = get_system_info()
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": f"Unexpected error: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
