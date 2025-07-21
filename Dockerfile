# Multi-stage Docker build for optimization
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ ./
RUN npm run build

# Backend build stage
FROM maven:3.9.5-openjdk-17-slim AS backend-builder

WORKDIR /app
COPY pom.xml ./
COPY src ./src

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/frontend/out ./src/main/resources/static/

RUN mvn clean package -DskipTests -Pprod

# Final runtime stage
FROM openjdk:17-jre-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create app directory
WORKDIR /app

# Copy the jar file
COPY --from=backend-builder /app/target/ChartsSimulator-0.0.1-SNAPSHOT.jar app.jar

# Create logs directory and set ownership
RUN mkdir -p /app/logs && chown -R appuser:appuser /app

# Switch to app user
USER appuser

# Environment variables with secure defaults
ENV SERVER_PORT=9090
ENV APP_ENVIRONMENT=production
ENV JAVA_OPTS="-Xmx512m -Xms256m -XX:+UseG1GC -XX:+UseStringDeduplication"

# Health check using the new health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${SERVER_PORT:-9090}/api/health || exit 1

# Expose port
EXPOSE ${SERVER_PORT:-9090}

# Run application with optimized JVM settings
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
