#!/bin/bash
# filepath: services/ToolsServer/simplePathToolWithDefaultMap/rebuild.sh

echo "🔄 Starting aggressive Docker rebuild..."

# Stop all services
echo "📦 Stopping Docker services..."
sudo docker compose down --volumes --remove-orphans

# Kill any remaining containers
echo "🛑 Killing remaining containers..."
sudo docker kill $(sudo docker ps -q) 2>/dev/null || true

# Remove all containers and images
echo "🗑️ Removing containers and images..."
sudo docker rm -f $(sudo docker ps -aq) 2>/dev/null || true
sudo docker rmi -f $(sudo docker images -q) 2>/dev/null || true

# Nuclear cleanup - remove everything
echo "🧹 Nuclear cleanup - removing all Docker resources..."
sudo docker system prune -af --volumes
sudo docker builder prune -af

# Force rebuild with zero cache
echo "🏗️ Force rebuilding image with no cache..."
sudo docker build --no-cache --pull --force-rm -t simple-path-tool .

# Start fresh
echo "🚀 Starting fresh containers..."
sudo docker compose up -d --force-recreate

# Show status
echo "📊 Container status:"
sudo docker compose ps

echo "✅ Aggressive rebuild complete!"
echo "🌐 API should be available at: http://localhost:8000/simpletool"

# Optional: Test the API
echo ""
echo "🧪 Testing API in 5 seconds..."
sleep 5
curl -s http://localhost:8000/simpletool/health || echo "❌ Health check failed"

echo ""
echo "🎯 To test pathfinding, use:"
echo 'curl -X POST http://localhost:8000/simpletool/path \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer your-secret-api-key-change-this" \'
echo '  -d '"'"'{"start": "Post Office", "end": "Bank"}'"'"