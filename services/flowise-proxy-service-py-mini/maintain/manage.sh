#!/bin/bash

# Simple Service Management Script
# Usage: ./manage.sh [start|stop|restart|status|logs]

# --- Configuration ---
# Get the absolute path of the project directory, which is one level up from this script
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Define directories and file paths
BACKEND_DIR="$PROJECT_DIR/backend"
LOGS_DIR="$PROJECT_DIR/logs"
VENV_DIR="$PROJECT_DIR/venv"

BACKEND_PID_FILE="$PROJECT_DIR/backend.pid"
FRONTEND_PID_FILE="$PROJECT_DIR/frontend.pid"

BACKEND_LOG_FILE="$LOGS_DIR/backend.log"
FRONTEND_LOG_FILE="$LOGS_DIR/frontend.log"

# --- Utility Functions ---

# Activate the Python virtual environment
activate_venv() {
    if [ -d "$VENV_DIR" ]; then
        echo "Activating virtual environment..."
        source "$VENV_DIR/bin/activate"
    else
        echo "⚠️ Warning: Virtual environment not found at '$VENV_DIR'."
        echo "Please run the setup steps from the deployment guide to create it."
        # Exit if venv is critical for the next step
        return 1 
    fi
    return 0
}

# Check if a process is running based on its PID file
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ] && ps -p $(cat "$pid_file") > /dev/null; then
        return 0 # Process is running
    else
        return 1 # Process is not running
    fi
}

# --- Core Service Functions ---

# Start the backend service (Uvicorn)
start_backend() {
    if is_running "$BACKEND_PID_FILE"; then
        echo "✅ Backend is already running (PID: $(cat "$BACKEND_PID_FILE"))."
        return
    fi
    
    echo "🚀 Starting backend service..."
    mkdir -p "$LOGS_DIR"
    
    cd "$BACKEND_DIR"
    # Start in background, redirect output to log, and save PID
    nohup python -m uvicorn main:app --host 0.0.0.0 --port 5000 > "$BACKEND_LOG_FILE" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
    cd "$PROJECT_DIR"
    
    sleep 1 # Give it a moment to start
    if is_running "$BACKEND_PID_FILE"; then
        echo "✅ Backend started successfully (PID: $(cat "$BACKEND_PID_FILE"))."
    else
        echo "❌ Error: Failed to start backend. Check logs for details:"
        echo "   $BACKEND_LOG_FILE"
    fi
}

# Start the frontend service
start_frontend() {
    if is_running "$FRONTEND_PID_FILE"; then
        echo "✅ Frontend is already running (PID: $(cat "$FRONTEND_PID_FILE"))."
        return
    fi

    echo "🚀 Starting frontend service..."
    mkdir -p "$LOGS_DIR"
    
    cd "$PROJECT_DIR"
    nohup python frontend_server.py > "$FRONTEND_LOG_FILE" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
    
    sleep 1
    if is_running "$FRONTEND_PID_FILE"; then
        echo "✅ Frontend started successfully (PID: $(cat "$FRONTEND_PID_FILE"))."
    else
        echo "❌ Error: Failed to start frontend. Check logs for details:"
        echo "   $FRONTEND_LOG_FILE"
    fi
}

# Stop a service using its PID file
stop_service() {
    local service_name=$1
    local pid_file=$2

    if is_running "$pid_file"; then
        echo "🛑 Stopping $service_name (PID: $(cat "$pid_file"))..."
        kill $(cat "$pid_file")
        rm -f "$pid_file"
        echo "✅ $service_name stopped."
    else
        echo "☑️ $service_name is not running."
        rm -f "$pid_file" # Clean up stale PID file if it exists
    fi
}

# --- Main Commands ---

# Command to start all services
start() {
    echo "--- Starting All Services ---"
    if ! activate_venv; then return; fi
    start_backend
    start_frontend
    echo "---------------------------"
    status
}

# Command to stop all services
stop() {
    echo "--- Stopping All Services ---"
    stop_service "Backend" "$BACKEND_PID_FILE"
    stop_service "Frontend" "$FRONTEND_PID_FILE"
    echo "---------------------------"
}

# Command to show the status of services
status() {
    echo "--- Service Status ---"
    # Backend Status
    if is_running "$BACKEND_PID_FILE"; then
        echo "🟢 Backend:  Running (PID: $(cat "$BACKEND_PID_FILE")) | Port: 5000"
    else
        echo "🔴 Backend:  Stopped"
    fi

    # Frontend Status
    if is_running "$FRONTEND_PID_FILE"; then
        echo "🟢 Frontend: Running (PID: $(cat "$FRONTEND_PID_FILE")) | Port: 5002"
    else
        echo "🔴 Frontend: Stopped"
    fi
    echo "----------------------"
}

# Command to display logs
logs() {
    echo "--- Displaying Logs (Press Ctrl+C to exit) ---"
    # Tail both logs simultaneously
    tail -f "$BACKEND_LOG_FILE" "$FRONTEND_LOG_FILE"
}

# --- Script Entrypoint ---

# Change to the project directory to ensure correct relative paths
cd "$PROJECT_DIR"

# Parse command-line argument
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        echo "--- Restarting All Services ---"
        stop
        sleep 1 # Wait a second before starting again
        start
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac

exit 0
