#!/bin/bash

# Universal script to change Docker's default IP range to 10.20.0.0/24 on any Ubuntu Docker installation
# Detects installation type (standard, snap, docker.io) and applies appropriate configuration
# Run with sudo: sudo ./universal_docker_ip_change_script.sh

set -e  # Exit on any error

# Configuration
SUBNET="10.20.0.0/24"
BIP="10.20.0.1/24"
SIZE=24
DOCKER_CONFIG_STANDARD="/etc/docker/daemon.json"
DOCKER_CONFIG_SNAP="/var/snap/docker/current/config/daemon.json"

echo "========================================="
echo "Universal Docker IP Change Script"
echo "Target IP range: $SUBNET"
echo "========================================="

# Function to create daemon.json content
create_daemon_config() {
    local config_file="$1"
    echo "Creating Docker daemon configuration at: $config_file"
    
    mkdir -p "$(dirname "$config_file")"
    
    cat > "$config_file" << EOF
{
    "log-level": "error",
    "bip": "$BIP",
    "default-address-pools": [
        {
            "base": "$SUBNET",
            "size": $SIZE
        }
    ]
}
EOF
    
    chmod 644 "$config_file"
    echo "Configuration file created successfully."
}

# Function to restart Docker service
restart_docker_service() {
    local service_type="$1"
    echo "Restarting Docker ($service_type)..."
    
    case $service_type in
        "snap")
            snap stop docker
            sleep 5
            snap start docker
            sleep 20
            ;;
        "systemd")
            systemctl stop docker
            sleep 5
            systemctl start docker
            sleep 15
            ;;
        "service")
            service docker stop
            sleep 5
            service docker start
            sleep 15
            ;;
    esac
    
    echo "Docker service restarted."
}

# Function to verify Docker is running
verify_docker_running() {
    echo "Verifying Docker is running..."
    
    # Try multiple ways to check Docker status
    if command -v snap >/dev/null 2>&1 && snap list docker >/dev/null 2>&1; then
        if snap services docker | grep -q "docker.dockerd.*active"; then
            echo "✓ Docker (snap) is active"
            return 0
        fi
    fi
    
    if systemctl is-active docker >/dev/null 2>&1; then
        echo "✓ Docker (systemd) is active"
        return 0
    fi
    
    if service docker status >/dev/null 2>&1; then
        echo "✓ Docker (service) is active"
        return 0
    fi
    
    # Final test - can we run docker commands?
    if docker info >/dev/null 2>&1; then
        echo "✓ Docker is responding to commands"
        return 0
    fi
    
    echo "✗ Docker does not appear to be running properly"
    return 1
}

echo "Step 1: Detecting Docker installation type..."

# Check if Docker is installed via snap
if command -v snap >/dev/null 2>&1 && snap list docker >/dev/null 2>&1; then
    echo "✓ Snap-based Docker installation detected"
    DOCKER_TYPE="snap"
    CONFIG_PATH="$DOCKER_CONFIG_SNAP"
    
# Check for standard Docker installation
elif [ -d "/etc/docker" ] || command -v dockerd >/dev/null 2>&1; then
    echo "✓ Standard Docker installation detected"
    DOCKER_TYPE="systemd"
    CONFIG_PATH="$DOCKER_CONFIG_STANDARD"
    
# Check if docker command exists
elif command -v docker >/dev/null 2>&1; then
    echo "✓ Docker command found, assuming standard installation"
    DOCKER_TYPE="systemd"
    CONFIG_PATH="$DOCKER_CONFIG_STANDARD"
    
else
    echo "✗ No Docker installation detected. Please install Docker first."
    exit 1
fi

echo "Using configuration path: $CONFIG_PATH"

echo ""
echo "Step 2: Backing up existing configuration (if any)..."
if [ -f "$CONFIG_PATH" ]; then
    cp "$CONFIG_PATH" "${CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✓ Backup created: ${CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
else
    echo "No existing configuration found."
fi

echo ""
echo "Step 3: Creating new Docker daemon configuration..."
create_daemon_config "$CONFIG_PATH"

echo ""
echo "Step 4: Restarting Docker service..."
restart_docker_service "$DOCKER_TYPE"

echo ""
echo "Step 5: Verifying Docker is running..."
if ! verify_docker_running; then
    echo "ERROR: Docker failed to start properly after configuration change."
    echo "Check logs with one of these commands:"
    echo "  - journalctl -u docker"
    echo "  - snap logs docker"
    echo "  - service docker status"
    exit 1
fi

echo ""
echo "Step 6: Testing new IP configuration..."

# Test bridge IP (may not show until containers run)
echo "Checking docker0 bridge IP:"
if ip addr show docker0 2>/dev/null | grep -q "inet $BIP"; then
    echo "✓ Bridge IP shows $BIP"
else
    echo "⚠ Bridge IP not yet showing $BIP (normal if no containers running)"
fi

# Test with a temporary container
echo "Testing with temporary container..."
if docker run -d --name temp-ip-test alpine sleep 10 >/dev/null 2>&1; then
    sleep 3
    
    # Get container's gateway IP
    CONTAINER_GW=$(docker exec temp-ip-test ip route show default 2>/dev/null | awk '{print $3}' | head -1)
    
    if [[ "$CONTAINER_GW" == "10.20.0.1" ]]; then
        echo "✓ Container test: SUCCESS (gateway is 10.20.0.1)"
        SUCCESS=true
    else
        echo "✗ Container test: FAILED (expected 10.20.0.1, got $CONTAINER_GW)"
        SUCCESS=false
    fi
    
    # Cleanup
    docker rm -f temp-ip-test >/dev/null 2>&1
    
    if [ "$SUCCESS" = true ]; then
        echo ""
        echo "========================================="
        echo "✓ SUCCESS: Docker IP change completed!"
        echo "========================================="
        echo "Docker is now using IP range: $SUBNET"
        echo "Available IPs: 10.20.0.2 - 10.20.0.254 (253 containers)"
        echo "Gateway: 10.20.0.1"
        echo ""
        echo "Verify with: docker network inspect bridge"
        echo "========================================="
    else
        echo ""
        echo "❌ FAILED: IP configuration did not apply correctly."
        echo "Check Docker logs and daemon.json configuration."
        exit 1
    fi
else
    echo "⚠ Could not run test container, but configuration has been applied."
    echo "Try running: docker run --rm alpine ip route"
fi

echo "Script completed."
