
#!/bin/bash

echo "🔄 Quick Nginx Production Restart Started..."

# Create logs directory
mkdir -p logs

# Stop, remove, build, start
docker compose -f docker-compose.nginx.yml down && \
docker compose -f docker-compose.nginx.yml build --no-cache frontend-nginx && \
docker compose -f docker-compose.nginx.yml up -d frontend-nginx && \
echo "✅ Quick nginx restart completed!" && \
sleep 15 && \
echo "📋 Checking status..." && \
docker compose -f docker-compose.nginx.yml ps && \
echo "🌐 App URL: http://64.226.77.9" && \
echo "🔍 Health Check: http://64.226.77.9/health" && \
echo "📋 View logs: docker compose -f docker-compose.nginx.yml logs -f frontend-nginx"
