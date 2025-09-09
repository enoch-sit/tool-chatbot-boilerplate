#!/bin/bash

# Script to automate changing Docker's default IP range to 10.20.0.0/24 (254 IPs) on Ubuntu with Snap-based Docker
# Run with sudo: sudo ./docker_ip_change_script.sh

set -e  # Exit on any error

# Configuration
DOCKER_CONFIG_PATH="/var/snap/docker/current/config/daemon.json"
SUBNET="10.20.0.0/24"
BIP="10.20.0.1/24"
SIZE=24

echo "Starting Docker IP change to $SUBNET..."

# Step 1: Create the directory if it doesn't exist
mkdir -p "$(dirname "$DOCKER_CONFIG_PATH")"

# Step 2: Create or update daemon.json
cat > "$DOCKER_CONFIG_PATH" << EOF
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

echo "Updated $DOCKER_CONFIG_PATH with new IP range."

# Step 3: Set permissions
chmod 644 "$DOCKER_CONFIG_PATH"

# Step 4: Full stop and start Docker (more reliable than restart for config apply)
echo "Stopping Docker service..."
snap stop docker
echo "Starting Docker service..."
snap start docker

# Wait for Docker to fully start and apply config
sleep 20

# Step 5: Verify Docker is running
if ! snap services docker | grep -q "docker.dockerd.*active"; then
    echo "Error: Docker service is not active. Check logs with 'snap logs docker'."
    exit 1
fi

echo "Docker started successfully."

# Step 6: Test the bridge IP
echo "Testing docker0 bridge IP:"
ip addr show docker0 | grep "inet $BIP" || echo "Bridge IP not yet showing $BIP"

if ip addr show docker0 | grep -q "inet $BIP"; then
    echo "Bridge IP test: SUCCESS ($BIP)"
else
    echo "Warning: docker0 still not showing $BIP. This may be normal if no containers are running."
fi

# Step 7: Test a container IP
echo "Testing container IP (running a temporary alpine container):"
docker run -d --name temp-test-container alpine sleep 10
sleep 2
CONTAINER_IP=$(docker exec temp-test-container ip route show default | awk '{print $3}' | head -1)
echo "Container default gateway (should be 10.20.0.1): $CONTAINER_IP"

if [[ "$CONTAINER_IP" == "10.20.0.1" ]]; then
    echo "Container IP test: SUCCESS (in 10.20.0.0/24 range)"
else
    echo "Container IP test: FAILED (expected 10.20.0.1, got $CONTAINER_IP). Check configuration."
    docker rm -f temp-test-container
    exit 1
fi

# Step 8: Remove testing Docker container
docker rm -f temp-test-container
echo "Test container removed."

# Optional: Bring up docker0 if DOWN
if ip link show docker0 | grep -q "state DOWN"; then
    ip link set docker0 up
    echo "Brought docker0 interface up."
fi

echo "All tests passed! Docker is now using 10.20.0.0/24 (254 IPs available)."
echo "You can run multiple containers now without IP conflicts."
