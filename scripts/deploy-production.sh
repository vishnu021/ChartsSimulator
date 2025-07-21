#!/bin/bash
# Production deployment script
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
APP_NAME="charts-simulator"
VERSION="${VERSION:-$(date +%Y%m%d-%H%M%S)}"
DEPLOY_ENV="${DEPLOY_ENV:-production}"

echo "🚀 Starting production deployment for $APP_NAME"
echo "Version: $VERSION"
echo "Environment: $DEPLOY_ENV"

# Validate environment variables
required_vars=(
    "CORS_ALLOWED_ORIGINS"
    "WS_ALLOWED_ORIGINS"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo "❌ Missing required environment variables:"
    printf "  - %s\n" "${missing_vars[@]}"
    echo ""
    echo "Please set these variables before deployment:"
    echo "export CORS_ALLOWED_ORIGINS='https://yourdomain.com'"
    echo "export WS_ALLOWED_ORIGINS='https://yourdomain.com'"
    exit 1
fi

# Build application
echo "📦 Building application..."
cd "$PROJECT_ROOT"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./mvnw clean

# Run tests
echo "🧪 Running tests..."
./mvnw test

# Build production package
echo "🏗️ Building production package..."
./mvnw package -Pprod -DskipTests

# Verify build
JAR_FILE="target/ChartsSimulator-0.0.1-SNAPSHOT.jar"
if [[ ! -f "$JAR_FILE" ]]; then
    echo "❌ Build failed: JAR file not found"
    exit 1
fi

echo "✅ Build completed successfully"
echo "📦 JAR file: $JAR_FILE"
echo "📊 JAR size: $(du -h "$JAR_FILE" | cut -f1)"

# Create deployment package
DEPLOY_DIR="deploy-$VERSION"
mkdir -p "$DEPLOY_DIR"

# Copy artifacts
cp "$JAR_FILE" "$DEPLOY_DIR/$APP_NAME.jar"
cp Dockerfile "$DEPLOY_DIR/"
cp docker-compose.yml "$DEPLOY_DIR/" 2>/dev/null || true

# Create deployment script
cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

APP_NAME="charts-simulator"
JAR_FILE="$APP_NAME.jar"

# Validate JAR file exists
if [[ ! -f "$JAR_FILE" ]]; then
    echo "❌ JAR file not found: $JAR_FILE"
    exit 1
fi

# Set production environment variables
export APP_ENVIRONMENT=production
export SPRING_PROFILES_ACTIVE=prod
export SERVER_PORT=${SERVER_PORT:-9090}

# JVM optimization for production
export JAVA_OPTS="${JAVA_OPTS:--Xmx1g -Xms512m -XX:+UseG1GC -XX:+UseStringDeduplication -XX:MaxGCPauseMillis=200}"

echo "🚀 Starting $APP_NAME in production mode..."
echo "Port: $SERVER_PORT"
echo "Profile: $SPRING_PROFILES_ACTIVE"
echo "JVM Options: $JAVA_OPTS"

# Start application
exec java $JAVA_OPTS -jar "$JAR_FILE"
EOF

chmod +x "$DEPLOY_DIR/start.sh"

# Create environment template
cat > "$DEPLOY_DIR/.env.template" << 'EOF'
# Production Environment Configuration
# Copy this file to .env and configure for your environment

# Server Configuration
SERVER_PORT=9090
APP_ENVIRONMENT=production

# CORS Configuration (REQUIRED)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
WS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=30

# JVM Configuration
JAVA_OPTS=-Xmx1g -Xms512m -XX:+UseG1GC
EOF

# Create systemd service file
cat > "$DEPLOY_DIR/$APP_NAME.service" << EOF
[Unit]
Description=Charts Simulator Application
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/$APP_NAME
ExecStart=/opt/$APP_NAME/start.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$APP_NAME

# Environment file
EnvironmentFile=-/opt/$APP_NAME/.env

[Install]
WantedBy=multi-user.target
EOF

# Create README for deployment
cat > "$DEPLOY_DIR/README.md" << 'EOF'
# Charts Simulator Production Deployment

## Quick Start

1. Copy deployment files to server:
   ```bash
   scp -r deploy-* user@server:/opt/charts-simulator/
   ```

2. Configure environment:
   ```bash
   cp .env.template .env
   # Edit .env with your configuration
   ```

3. Start application:
   ```bash
   ./start.sh
   ```

## Systemd Service

To run as a system service:

1. Copy service file:
   ```bash
   sudo cp charts-simulator.service /etc/systemd/system/
   ```

2. Enable and start:
   ```bash
   sudo systemctl enable charts-simulator
   sudo systemctl start charts-simulator
   ```

## Health Checks

- Health: http://localhost:9090/api/health
- Detailed: http://localhost:9090/api/health/detailed
- Ready: http://localhost:9090/api/health/ready
- Live: http://localhost:9090/api/health/live

## Monitoring

Check logs:
```bash
sudo journalctl -u charts-simulator -f
```

Check status:
```bash
sudo systemctl status charts-simulator
```
EOF

echo "✅ Deployment package created: $DEPLOY_DIR"
echo ""
echo "📋 Deployment checklist:"
echo "  1. Review $DEPLOY_DIR/.env.template"
echo "  2. Copy $DEPLOY_DIR to your server"
echo "  3. Configure environment variables"
echo "  4. Run deployment script"
echo ""
echo "🔗 Useful commands:"
echo "  Deploy: scp -r $DEPLOY_DIR user@server:/opt/charts-simulator/"
echo "  Check health: curl http://server:9090/api/health"
echo ""
echo "🎉 Production deployment package ready!"