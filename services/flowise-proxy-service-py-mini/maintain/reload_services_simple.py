#!/usr/bin/env python3
"""
🔄 Simple Service Reload Script
Aggressively reloads backend and frontend services
Works without external dependencies
"""

import os
import sys
import time
import subprocess
import signal
from pathlib import Path

# ANSI color codes
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_step(text, color=Colors.BLUE):
    print(f"\n{color}{Colors.BOLD}🔹 {text}{Colors.END}")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.CYAN}ℹ️  {text}{Colors.END}")

def run_command(cmd, show_output=True):
    """Run a command and return success status"""
    try:
        if show_output:
            print_info(f"Running: {cmd}")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        
        if show_output and result.stdout.strip():
            print(result.stdout.strip())
        if show_output and result.stderr.strip():
            print(f"{Colors.YELLOW}{result.stderr.strip()}{Colors.END}")
            
        return result.returncode == 0
    except Exception as e:
        if show_output:
            print_error(f"Error: {e}")
        return False

def kill_processes_by_pattern(pattern, service_name):
    """Kill processes matching a pattern"""
    print_step(f"Stopping {service_name}")
    
    # Try to find and kill processes
    commands = [
        f"pkill -f '{pattern}'",
        f"pkill -9 -f '{pattern}'",  # Force kill
    ]
    
    for cmd in commands:
        if run_command(cmd, show_output=False):
            print_success(f"Killed {service_name} processes")
        time.sleep(1)

def check_and_create_venv():
    """Ensure virtual environment exists"""
    if not os.path.exists('venv/bin/activate'):
        print_step("Creating virtual environment")
        if run_command("python3 -m venv venv"):
            print_success("Virtual environment created")
            print_step("Installing requirements")
            run_command("source venv/bin/activate && pip install --upgrade pip")
            run_command("source venv/bin/activate && cd backend && pip install -r requirements.txt")
        else:
            print_error("Failed to create virtual environment")
            return False
    else:
        print_success("Virtual environment found")
    return True

def main():
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*50}")
    print("🔄 AGGRESSIVE SERVICE RELOAD")
    print(f"{'='*50}{Colors.END}")
    
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    print_info(f"Working in: {os.getcwd()}")
    
    # Step 1: Kill existing processes
    kill_processes_by_pattern("uvicorn.*main:app", "Backend")
    kill_processes_by_pattern("frontend_server.py", "Frontend")
    
    # Step 2: Clean up PID files
    print_step("Cleaning PID files")
    for pid_file in ['backend.pid', 'frontend.pid']:
        if os.path.exists(pid_file):
            os.remove(pid_file)
            print_success(f"Removed {pid_file}")
    
    # Step 3: Setup directories
    print_step("Setting up directories")
    for directory in ['logs', 'backend', 'frontend']:
        Path(directory).mkdir(exist_ok=True)
    print_success("Directories ready")
    
    # Step 4: Check virtual environment
    if not check_and_create_venv():
        return
    
    # Step 5: Clear old logs
    print_step("Clearing old logs")
    for log_file in ['logs/backend.log', 'logs/frontend.log']:
        if os.path.exists(log_file):
            open(log_file, 'w').close()
            print_success(f"Cleared {log_file}")
    
    # Step 6: Wait for ports to be free
    print_step("Waiting for ports to be available")
    time.sleep(3)
    
    # Step 7: Start backend
    print_step("Starting Backend Service (Port 5000)")
    backend_cmd = """
    source venv/bin/activate && \
    cd backend && \
    nohup python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload > ../logs/backend.log 2>&1 & \
    echo $! > ../backend.pid
    """
    if run_command(backend_cmd):
        time.sleep(2)
        if os.path.exists('backend.pid'):
            with open('backend.pid') as f:
                pid = f.read().strip()
                print_success(f"Backend started with PID: {pid}")
        else:
            print_error("Backend PID file not created")
    
    # Step 8: Start frontend
    print_step("Starting Frontend Service (Port 5002)")
    frontend_cmd = """
    source venv/bin/activate && \
    nohup python frontend_server.py > logs/frontend.log 2>&1 & \
    echo $! > frontend.pid
    """
    if run_command(frontend_cmd):
        time.sleep(2)
        if os.path.exists('frontend.pid'):
            with open('frontend.pid') as f:
                pid = f.read().strip()
                print_success(f"Frontend started with PID: {pid}")
        else:
            print_error("Frontend PID file not created")
    
    # Step 9: Test services
    print_step("Testing services")
    time.sleep(3)
    
    # Test backend
    if run_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:5000", show_output=False):
        print_success("Backend responding on port 5000")
    else:
        print_error("Backend not responding")
    
    # Test frontend
    if run_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:5002", show_output=False):
        print_success("Frontend responding on port 5002")
    else:
        print_error("Frontend not responding")
    
    # Step 10: Show status
    print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 RELOAD COMPLETE!{Colors.END}")
    print(f"\n{Colors.BOLD}Service URLs:{Colors.END}")
    print(f"🔗 Backend:    http://localhost:5000")
    print(f"🔗 Frontend:   http://localhost:5002") 
    print(f"🔗 Production: https://project-1-13.eduhk.hk/projectproxy/")
    
    print(f"\n{Colors.BOLD}Quick Commands:{Colors.END}")
    print("📋 View logs:     python view_logs.py")
    print("🔄 Reload again:  python reload_services.py")
    print("🛑 Stop services: kill $(cat *.pid)")
    
    # Ask if user wants to view logs
    try:
        view_logs = input(f"\n{Colors.YELLOW}View real-time logs now? (y/N): {Colors.END}").strip().lower()
        if view_logs in ['y', 'yes']:
            print_info("Starting log viewer...")
            os.system("python view_logs.py")
    except KeyboardInterrupt:
        print_info("\nReload complete!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_info("\nReload interrupted")
    except Exception as e:
        print_error(f"Error: {e}")