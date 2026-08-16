
#!/bin/bash

echo "📋 Nginx Log Monitoring Options:"
echo "1) Container logs (docker)"
echo "2) Access logs (file)"
echo "3) Error logs (file)"
echo "4) All logs (combined)"
read -p "Select option (1-4): " choice

case $choice in
    1)
        echo "📋 Following container logs..."
        docker compose -f docker-compose.nginx.yml logs -f --timestamps frontend-nginx
        ;;
    2)
        echo "📋 Following access logs..."
        if [ -f "logs/access.log" ]; then
            tail -f logs/access.log
        else
            echo "Access log file not found. Starting container logs instead..."
            docker compose -f docker-compose.nginx.yml logs -f frontend-nginx
        fi
        ;;
    3)
        echo "📋 Following error logs..."
        if [ -f "logs/error.log" ]; then
            tail -f logs/error.log
        else
            echo "Error log file not found. Starting container logs instead..."
            docker compose -f docker-compose.nginx.yml logs -f frontend-nginx
        fi
        ;;
    4)
        echo "📋 Following all logs..."
        if [ -f "logs/access.log" ] && [ -f "logs/error.log" ]; then
            tail -f logs/access.log logs/error.log
        else
            docker compose -f docker-compose.nginx.yml logs -f frontend-nginx
        fi
        ;;
    *)
        echo "📋 Default: Following container logs..."
        docker compose -f docker-compose.nginx.yml logs -f --timestamps frontend-nginx
        ;;
esac
