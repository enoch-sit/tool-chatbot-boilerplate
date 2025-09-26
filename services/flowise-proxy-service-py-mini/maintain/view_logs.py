#!/usr/bin/env python3
"""
📋 Real-time Log Viewer
Shows live backend and frontend logs with color coding
"""

import os
import sys
import time
import subprocess
import threading
import signal
from pathlib import Path

# ANSI color codes
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_banner():
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}")
    print("📋 REAL-TIME LOG VIEWER")
    print(f"{'='*60}{Colors.END}")
    print("Showing live logs from both backend and frontend services")
    print(f"{Colors.YELLOW}Press Ctrl+C to stop{Colors.END}\n")

def tail_log_file(log_file, service_name, color):
    """Tail a log file and print with colors"""
    def tail_worker():
        try:
            # Check if file exists, create if not
            if not os.path.exists(log_file):
                Path(log_file).touch()
                print(f"{color}[{service_name}] Log file created: {log_file}{Colors.END}")
            
            # Use tail -f to follow the file
            process = subprocess.Popen(['tail', '-f', log_file], 
                                     stdout=subprocess.PIPE, 
                                     stderr=subprocess.STDOUT,
                                     text=True,
                                     universal_newlines=True)
            
            while True:
                line = process.stdout.readline()
                if line:
                    timestamp = time.strftime('%H:%M:%S')
                    clean_line = line.rstrip()
                    if clean_line:  # Only print non-empty lines
                        print(f"{color}[{timestamp} {service_name}]{Colors.END} {clean_line}")
                elif process.poll() is not None:
                    break
                    
        except Exception as e:
            print(f"{Colors.RED}[{service_name}] Error reading log: {e}{Colors.END}")
    
    thread = threading.Thread(target=tail_worker, daemon=True)
    thread.start()
    return thread

def check_services_running():
    """Check if services are running"""
    services_status = {}
    
    # Check PID files
    pid_files = {
        'backend.pid': 'Backend',
        'frontend.pid': 'Frontend'
    }
    
    for pid_file, service_name in pid_files.items():
        if os.path.exists(pid_file):
            try:
                with open(pid_file, 'r') as f:
                    pid = int(f.read().strip())
                # Check if process is running
                os.kill(pid, 0)
                services_status[service_name] = f"Running (PID {pid})"
            except (ProcessLookupError, ValueError, OSError):
                services_status[service_name] = "Not running (stale PID file)"
        else:
            services_status[service_name] = "Not running (no PID file)"
    
    return services_status

def show_service_status():
    """Show current service status"""
    print(f"{Colors.BOLD}Current Service Status:{Colors.END}")
    status = check_services_running()
    
    for service, state in status.items():
        if "Running" in state:
            print(f"  {Colors.GREEN}✅ {service}: {state}{Colors.END}")
        else:
            print(f"  {Colors.RED}❌ {service}: {state}{Colors.END}")
    
    print()

def show_log_files_info():
    """Show information about log files"""
    log_files = ['logs/backend.log', 'logs/frontend.log']
    print(f"{Colors.BOLD}Log Files:{Colors.END}")
    
    for log_file in log_files:
        if os.path.exists(log_file):
            try:
                size = os.path.getsize(log_file)
                mtime = os.path.getmtime(log_file)
                mtime_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mtime))
                print(f"  📄 {log_file}: {size} bytes, modified {mtime_str}")
            except:
                print(f"  📄 {log_file}: exists")
        else:
            print(f"  ❌ {log_file}: not found")
    
    print()

def main():
    """Main log viewer function"""
    print_banner()
    
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Show service status
    show_service_status()
    show_log_files_info()
    
    # Setup log files
    log_dir = Path('logs')
    log_dir.mkdir(exist_ok=True)
    
    backend_log = log_dir / 'backend.log'
    frontend_log = log_dir / 'frontend.log'
    
    # Create log files if they don't exist
    backend_log.touch()
    frontend_log.touch()
    
    # Start tailing threads
    print(f"{Colors.BOLD}Starting real-time log monitoring...{Colors.END}")
    
    backend_thread = tail_log_file(str(backend_log), 'BACKEND', Colors.CYAN)
    frontend_thread = tail_log_file(str(frontend_log), 'FRONTEND', Colors.MAGENTA)
    
    # Show legend
    print(f"{Colors.CYAN}[BACKEND]{Colors.END} = Backend service logs")
    print(f"{Colors.MAGENTA}[FRONTEND]{Colors.END} = Frontend service logs")
    print("-" * 60)
    
    try:
        # Keep main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Log monitoring stopped by user{Colors.END}")
        print("Services continue running in background")
        
        print(f"\n{Colors.BOLD}Manual log commands:{Colors.END}")
        print(f"  Backend:  tail -f {backend_log}")
        print(f"  Frontend: tail -f {frontend_log}")
        print(f"  Both:     tail -f logs/*.log")
        
        print(f"\n{Colors.BOLD}Service management:{Colors.END}")
        print("  Status:  python view_logs.py")
        print("  Reload:  python reload_services_simple.py") 
        print("  Stop:    kill $(cat *.pid)")

def signal_handler(signum, frame):
    """Handle Ctrl+C gracefully"""
    print(f"\n\n{Colors.YELLOW}Received signal {signum}, stopping...{Colors.END}")
    sys.exit(0)

if __name__ == "__main__":
    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        main()
    except Exception as e:
        print(f"\n{Colors.RED}Unexpected error: {e}{Colors.END}")
        sys.exit(1)