
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Nginx Production Restart...${NC}"
echo "========================================"

# Function to print step
print_step() {
    echo -e "${YELLOW}📋 Step $1: $2${NC}"
}

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Success${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        exit 1
    fi
}

# Create logs directory
print_step "0" "Creating logs directory"
mkdir -p logs
check_success

# Step 1: Git pull latest changes
print_step "1" "Pulling latest changes from Git"
git pull origin main
check_success

# Step 2: Stop nginx containers
print_step "2" "Stopping nginx containers"
docker compose -f docker-compose.nginx.yml down
check_success

# Step 3: Clean up system
print_step "3" "Cleaning Docker system"
docker system prune -f
check_success

# Step 4: Remove old nginx images
print_step "4" "Removing old nginx images"
docker images | grep aisurvey | awk '{print $3}' | xargs -r docker rmi -f
check_success

# Step 5: Build nginx image (no cache)
print_step "5" "Building nginx production image (no cache)"
docker compose -f docker-compose.nginx.yml build --no-cache frontend-nginx
check_success

# Step 6: Start nginx container
print_step "6" "Starting nginx container"
docker compose -f docker-compose.nginx.yml up -d frontend-nginx
check_success

# Step 7: Wait for container to be ready
print_step "7" "Waiting for nginx to be ready"
echo "Waiting 20 seconds for build and nginx to start..."
sleep 20

# Step 8: Check container status
print_step "8" "Checking container status"
CONTAINER_STATUS=$(docker compose -f docker-compose.nginx.yml ps -q frontend-nginx | xargs docker inspect -f '{{.State.Status}}')
if [ "$CONTAINER_STATUS" = "running" ]; then
    echo -e "${GREEN}✅ Container is running${NC}"
else
    echo -e "${RED}❌ Container is not running. Status: $CONTAINER_STATUS${NC}"
    echo "Showing container logs:"
    docker compose -f docker-compose.nginx.yml logs frontend-nginx
    exit 1
fi

# Step 9: Test nginx configuration
print_step "9" "Testing nginx configuration"
docker compose -f docker-compose.nginx.yml exec frontend-nginx nginx -t
check_success

# Step 10: Test application availability
print_step "10" "Testing application availability"
sleep 5

# Test health endpoint
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️ Health check failed (HTTP: $HEALTH_STATUS)${NC}"
fi

# Test main page
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Main page is responding${NC}"
else
    echo -e "${YELLOW}⚠️ Main page might have issues (HTTP: $HTTP_STATUS)${NC}"
fi

# Step 11: Show final status
print_step "11" "Nginx production deployment completed"
echo -e "${GREEN}🎉 Nginx production restart completed successfully!${NC}"
echo "=================================================="
echo -e "${BLUE}📊 Container Status:${NC}"
docker compose -f docker-compose.nginx.yml ps

echo -e "${BLUE}🌐 Application URLs:${NC}"
echo "  - Production: http://64.226.77.9"
echo "  - Health Check: http://64.226.77.9/health"
echo "  - Nginx Status: http://64.226.77.9/nginx_status (localhost only)"

echo -e "${BLUE}📋 Useful Commands:${NC}"
echo "  - View logs: docker compose -f docker-compose.nginx.yml logs -f frontend-nginx"
echo "  - Stop app: docker compose -f docker-compose.nginx.yml down"
echo "  - Restart: docker compose -f docker-compose.nginx.yml restart frontend-nginx"
echo "  - Nginx reload: docker compose -f docker-compose.nginx.yml exec frontend-nginx nginx -s reload"

echo -e "${YELLOW}🔍 Log Files:${NC}"
echo "  - Access logs: tail -f logs/access.log"
echo "  - Error logs: tail -f logs/error.log"

echo -e "${GREEN}✨ Nginx production deployment completed at $(date)${NC}"

# Show recent access logs
if [ -f "logs/access.log" ]; then
    echo -e "\n${BLUE}📋 Recent Access Logs:${NC}"
    tail -5 logs/access.log
fi
