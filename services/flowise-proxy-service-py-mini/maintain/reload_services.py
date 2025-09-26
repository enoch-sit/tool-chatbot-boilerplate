#!/usr/bin/env python3
"""
🔄 Aggressive Service Reload & Log Viewer
Completely reloads backend and frontend services and shows real-time logs
Perfect for development when making frequent changes
"""

import os
import sys
import time
import subprocess
import signal
import psutil
import threading
from pathlib import Path

# ANSI color codes for better output
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

def print_banner(text, color=Colors.CYAN):
    """Print a colored banner"""
    print(f"\n{color}{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{color}{Colors.BOLD}{text.center(60)}{Colors.END}")
    print(f"{color}{Colors.BOLD}{'='*60}{Colors.END}")

def print_step(step_num, text, color=Colors.BLUE):
    """Print a numbered step"""
    print(f"\n{color}{Colors.BOLD}Step {step_num}: {text}{Colors.END}")

def print_success(text):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    """Print error message"""
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_info(text):
    """Print info message"""
    print(f"{Colors.CYAN}ℹ️  {text}{Colors.END}")

def run_command(cmd, description, capture_output=True, check=True, timeout=30):
    """Run a command with error handling and timeout"""
    try:
        print_info(f"Running: {cmd}")
        if capture_output:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout, check=check)
            if result.stdout.strip():
                print(f"{Colors.WHITE}{result.stdout.strip()}{Colors.END}")
            if result.stderr.strip():
                print(f"{Colors.YELLOW}{result.stderr.strip()}{Colors.END}")
            return result
        else:
            subprocess.run(cmd, shell=True, timeout=timeout, check=check)
            return None
    except subprocess.TimeoutExpired:
        print_error(f"Command timed out after {timeout}s: {cmd}")
        return None
    except subprocess.CalledProcessError as e:
        if check:
            print_error(f"Command failed: {cmd}")
            if hasattr(e, 'stdout') and e.stdout:
                print(f"{Colors.RED}{e.stdout}{Colors.END}")
            if hasattr(e, 'stderr') and e.stderr:
                print(f"{Colors.RED}{e.stderr}{Colors.END}")
        return e
    except Exception as e:
        print_error(f"Error running command '{cmd}': {e}")
        return None

def find_processes_by_pattern(patterns):
    """Find all processes matching given patterns"""
    found_processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = ' '.join(proc.info['cmdline'] or [])
            for pattern in patterns:
                if pattern.lower() in cmdline.lower():
                    found_processes.append({
                        'pid': proc.info['pid'],
                        'name': proc.info['name'],
                        'cmdline': cmdline
                    })
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return found_processes

def kill_processes_aggressively(patterns, service_name):
    """Aggressively kill processes matching patterns"""
    print_step("🔪", f"Killing {service_name} processes")
    
    processes = find_processes_by_pattern(patterns)
    
    if not processes:
        print_info(f"No {service_name} processes found")
        return
    
    print_info(f"Found {len(processes)} {service_name} processes:")
    for proc in processes:
        print(f"  PID {proc['pid']}: {proc['cmdline'][:80]}...")
    
    # Try graceful shutdown first
    for proc in processes:
        try:
            os.kill(proc['pid'], signal.SIGTERM)
            print_info(f"Sent SIGTERM to PID {proc['pid']}")
        except ProcessLookupError:
            pass  # Process already dead
        except PermissionError:
            print_warning(f"Permission denied killing PID {proc['pid']}")
    
    # Wait a bit
    time.sleep(2)
    
    # Force kill remaining processes
    remaining = find_processes_by_pattern(patterns)
    for proc in remaining:
        try:
            os.kill(proc['pid'], signal.SIGKILL)
            print_info(f"Force killed PID {proc['pid']}")
        except ProcessLookupError:
            pass  # Process already dead
        except PermissionError:
            print_warning(f"Permission denied force killing PID {proc['pid']}")
    
    # Final check
    time.sleep(1)
    final_check = find_processes_by_pattern(patterns)
    if final_check:
        print_warning(f"{len(final_check)} {service_name} processes still running")
        for proc in final_check:
            print(f"  Stubborn PID {proc['pid']}: {proc['name']}")
    else:
        print_success(f"All {service_name} processes terminated")

def check_port_availability(port):
    """Check if a port is available"""
    try:
        result = run_command(f"netstat -tuln | grep :{port}", "Check port", capture_output=True, check=False)
        if result and result.returncode == 0:
            print_warning(f"Port {port} is still in use:")
            print(f"{Colors.YELLOW}{result.stdout.strip()}{Colors.END}")
            return False
        else:
            print_success(f"Port {port} is available")
            return True
    except:
        return True

def activate_venv_and_run(cmd, description):
    """Run command in virtual environment"""
    venv_cmd = f"source venv/bin/activate && {cmd}"
    return run_command(venv_cmd, description, capture_output=False, check=False)

def setup_directories():
    """Ensure required directories exist"""
    print_step("📁", "Setting up directories")
    
    dirs_to_create = ['logs', 'backend', 'frontend']
    for dir_name in dirs_to_create:
        Path(dir_name).mkdir(exist_ok=True)
        print_success(f"Directory '{dir_name}' ready")

def tail_log_file(log_file, prefix, color):
    """Tail a log file in a separate thread"""
    def tail_worker():
        try:
            # Use tail -f to follow the file
            process = subprocess.Popen(['tail', '-f', log_file], 
                                     stdout=subprocess.PIPE, 
                                     stderr=subprocess.PIPE, 
                                     text=True)
            
            for line in iter(process.stdout.readline, ''):
                if line.strip():
                    timestamp = time.strftime('%H:%M:%S')
                    print(f"{color}[{timestamp} {prefix}]{Colors.END} {line.rstrip()}")
        except Exception as e:
            print_error(f"Error tailing {log_file}: {e}")
    
    thread = threading.Thread(target=tail_worker, daemon=True)
    thread.start()
    return thread

def main():
    """Main reload function"""
    print_banner("🔄 AGGRESSIVE SERVICE RELOAD & LOG VIEWER", Colors.MAGENTA)
    print_info("This script will:")
    print("  • Aggressively kill all backend/frontend processes")
    print("  • Clean up PID files and ports")
    print("  • Restart services with fresh configuration")
    print("  • Display real-time logs from both services")
    
    # Confirm action
    try:
        confirm = input(f"\n{Colors.YELLOW}Continue? (y/N): {Colors.END}").strip().lower()
        if confirm not in ['y', 'yes']:
            print_info("Operation cancelled")
            return
    except KeyboardInterrupt:
        print_info("\nOperation cancelled")
        return
    
    # Change to project directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    print_info(f"Working directory: {os.getcwd()}")
    
    # Step 1: Setup directories
    setup_directories()
    
    # Step 2: Aggressive process termination
    print_step("💀", "Aggressive Process Termination")
    
    backend_patterns = ['uvicorn', 'main:app', 'fastapi', 'python.*main.py']
    frontend_patterns = ['frontend_server.py', 'python.*frontend_server']
    
    kill_processes_aggressively(backend_patterns, "Backend")
    kill_processes_aggressively(frontend_patterns, "Frontend")
    
    # Step 3: Clean up PID files
    print_step("🧹", "Cleaning up PID files and ports")
    
    pid_files = ['backend.pid', 'frontend.pid']
    for pid_file in pid_files:
        if os.path.exists(pid_file):
            os.remove(pid_file)
            print_success(f"Removed {pid_file}")
        else:
            print_info(f"{pid_file} not found")
    
    # Check port availability
    check_port_availability(5000)
    check_port_availability(5002)
    
    # Wait for ports to be released
    print_info("Waiting 3 seconds for ports to be released...")
    time.sleep(3)
    
    # Step 4: Verify virtual environment
    print_step("🐍", "Verifying Python virtual environment")
    
    if not os.path.exists('venv/bin/activate'):
        print_error("Virtual environment not found. Creating one...")
        run_command("python3 -m venv venv", "Create virtual environment")
        run_command("source venv/bin/activate && pip install --upgrade pip", "Upgrade pip")
        run_command("source venv/bin/activate && cd backend && pip install -r requirements.txt", "Install requirements")
    else:
        print_success("Virtual environment found")
    
    # Step 5: Check configuration
    print_step("⚙️", "Checking configuration")
    
    env_file = Path('backend/.env')
    if env_file.exists():
        print_success("Found backend/.env configuration")
        # Show current config (without sensitive data)
        with open(env_file) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    if 'key' in key.lower() or 'password' in key.lower() or 'secret' in key.lower():
                        value = '***HIDDEN***'
                    print(f"  {key}={value}")
    else:
        print_warning("Backend/.env not found! This may cause issues.")
        print_info("Expected configuration:")
        print("  FLOWISE_API_URL=http://localhost:3000  # or https://project-1-13.eduhk.hk")
        print("  BASE_PATH=/projectproxy")
        print("  HOST=0.0.0.0")
        print("  PORT=5000")
    
    # Step 6: Start services
    print_step("🚀", "Starting services")
    
    # Clear old logs
    log_files = ['logs/backend.log', 'logs/frontend.log']
    for log_file in log_files:
        if os.path.exists(log_file):
            open(log_file, 'w').close()  # Truncate log file
    
    print_info("Starting backend service...")
    backend_cmd = "cd backend && nohup python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload > ../logs/backend.log 2>&1 & echo $! > ../backend.pid"
    activate_venv_and_run(backend_cmd, "Start backend")
    
    time.sleep(2)  # Give backend time to start
    
    print_info("Starting frontend service...")
    frontend_cmd = "nohup python frontend_server.py > logs/frontend.log 2>&1 & echo $! > frontend.pid"
    activate_venv_and_run(frontend_cmd, "Start frontend")
    
    time.sleep(2)  # Give frontend time to start
    
    # Step 7: Verify services are running
    print_step("✅", "Verifying services")
    
    # Check PIDs
    pid_files_status = []
    for pid_file in pid_files:
        if os.path.exists(pid_file):
            with open(pid_file) as f:
                pid = f.read().strip()
                try:
                    os.kill(int(pid), 0)  # Test if process exists
                    print_success(f"{pid_file}: PID {pid} is running")
                    pid_files_status.append(True)
                except (ProcessLookupError, ValueError):
                    print_error(f"{pid_file}: PID {pid} is not running")
                    pid_files_status.append(False)
        else:
            print_error(f"{pid_file}: File not found")
            pid_files_status.append(False)
    
    # Check ports
    port_status = []
    for port in [5000, 5002]:
        result = run_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{port}", 
                           f"Test port {port}", capture_output=True, check=False)
        if result and result.stdout.strip() in ['200', '404', '422']:  # Any HTTP response is good
            print_success(f"Port {port}: Service responding")
            port_status.append(True)
        else:
            print_error(f"Port {port}: No response")
            port_status.append(False)
    
    # Step 8: Show service URLs
    print_step("🌐", "Service URLs")
    print(f"{Colors.GREEN}Backend API:{Colors.END} http://localhost:5000")
    print(f"{Colors.GREEN}Backend Docs:{Colors.END} http://localhost:5000/docs")
    print(f"{Colors.GREEN}Frontend:{Colors.END} http://localhost:5002")
    print(f"{Colors.GREEN}Production URL:{Colors.END} https://project-1-13.eduhk.hk/projectproxy/")
    
    # Step 9: Start log monitoring
    if all(pid_files_status):
        print_step("📋", "Starting real-time log monitoring")
        print_info("Press Ctrl+C to stop log monitoring")
        print_info("Logs will continue running in background")
        
        # Start log tailing threads
        backend_thread = None
        frontend_thread = None
        
        if os.path.exists('logs/backend.log'):
            backend_thread = tail_log_file('logs/backend.log', 'BACKEND', Colors.CYAN)
        
        if os.path.exists('logs/frontend.log'):
            frontend_thread = tail_log_file('logs/frontend.log', 'FRONTEND', Colors.MAGENTA)
        
        try:
            print(f"\n{Colors.BOLD}=== REAL-TIME LOGS (Ctrl+C to stop) ==={Colors.END}")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print_info("\nStopping log monitoring...")
            print_info("Services are still running in background")
    else:
        print_error("Some services failed to start. Check the logs:")
        print("  tail -f logs/backend.log")
        print("  tail -f logs/frontend.log")
    
    # Final status
    print_banner("🎉 RELOAD COMPLETE", Colors.GREEN)
    print_success("Services have been aggressively reloaded!")
    print()
    print("📊 Manual log commands:")
    print("  Backend: tail -f logs/backend.log")
    print("  Frontend: tail -f logs/frontend.log")
    print("  Both: tail -f logs/*.log")
    print()
    print("🔄 To reload again:")
    print("  python reload_services.py")
    print()
    print("🛑 To stop services:")
    print("  kill $(cat backend.pid frontend.pid)")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_info("\nScript interrupted by user")
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()