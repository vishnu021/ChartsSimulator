#!/bin/bash
# build.sh - Complete build script

echo "🚀 Starting ChartsSimulator build process..."

# Build with different profiles
case "${1:-prod}" in
  "dev")
    echo "📦 Building for development (backend only)..."
    ./mvnw clean package -Pdev -DskipTests
    ;;
  "fast")
    echo "⚡ Fast build (backend only, no tests)..."
    ./mvnw clean package -Pfast
    ;;
  "prod"|*)
    echo "🏭 Building for production (frontend + backend)..."
    ./mvnw clean package -Pprod
    ;;
esac

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📦 JAR file location: target/ChartsSimulator-0.0.1-SNAPSHOT.jar"
    echo ""
    echo "🚀 To run the application:"
    echo "   java -jar target/ChartsSimulator-0.0.1-SNAPSHOT.jar"
    echo ""
    echo "🌐 Access the application at: http://localhost:9090"
else
    echo "❌ Build failed!"
    exit 1
fi

---

# run.sh - Development run script
#!/bin/bash
echo "🚀 Starting ChartsSimulator in development mode..."

# Check if we want to build first
if [ "$1" = "--build" ] || [ "$1" = "-b" ]; then
    echo "📦 Building application first..."
    ./build.sh dev
    if [ $? -ne 0 ]; then
        echo "❌ Build failed!"
        exit 1
    fi
fi

# Run the application
echo "🏃 Running Spring Boot application..."
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

---

# deploy.sh - Production deployment script
#!/bin/bash
echo "🚀 Building and deploying ChartsSimulator..."

# Build for production
echo "📦 Building production package..."
./build.sh prod

if [ $? -eq 0 ]; then
    echo "✅ Production build completed!"

    # Copy to deployment directory (customize as needed)
    DEPLOY_DIR="${DEPLOY_DIR:-./deploy}"
    mkdir -p $DEPLOY_DIR

    cp target/ChartsSimulator-0.0.1-SNAPSHOT.jar $DEPLOY_DIR/charts-simulator.jar

    echo "📦 Application deployed to: $DEPLOY_DIR/charts-simulator.jar"
    echo ""
    echo "🚀 To run in production:"
    echo "   java -jar $DEPLOY_DIR/charts-simulator.jar --spring.profiles.active=prod"
    echo ""
    echo "🌐 Production URL: http://localhost:9090"
else
    echo "❌ Production build failed!"
    exit 1
fi
