package com.vish.fno.ChartsSimulator.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class ConfigurationValidator {
    private static final String ENV_PRODUCTION = "production";
    private static final String ENV_UNKNOWN = "unknown";

    @Value("${app.environment:unknown}")
    private String environment;

    @Value("${app.cors.allowed-origins:}")
    private String corsOrigins;

    @Value("${app.websocket.allowed-origins:}")
    private String wsOrigins;

    @Value("${server.port:9090}")
    private String serverPort;

    @EventListener(ApplicationReadyEvent.class)
    public void validateConfiguration() {
        List<String> warnings = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        // Validate environment
        if (ENV_UNKNOWN.equals(environment)) {
            warnings.add("Environment not explicitly set, defaulting to 'unknown'");
        }

        // Validate CORS origins for production
        if (ENV_PRODUCTION.equals(environment)) {
            if (corsOrigins.isEmpty() || corsOrigins.contains("*")) {
                errors.add("Production environment requires explicit CORS origins (no wildcards)");
            }
            if (wsOrigins.isEmpty() || wsOrigins.contains("*")) {
                errors.add("Production environment requires explicit WebSocket origins (no wildcards)");
            }
        }

        // Validate port
        try {
            int port = Integer.parseInt(serverPort);
            if (port < 1024 && ENV_PRODUCTION.equals(environment)) {
                warnings.add("Using privileged port " + port + " in production");
            }
        } catch (NumberFormatException e) {
            errors.add("Invalid server port configuration: " + serverPort);
        }

        // Log results
        if (!warnings.isEmpty()) {
            log.warn("Configuration warnings:");
            warnings.forEach(warning -> log.warn("  - {}", warning));
        }

        if (!errors.isEmpty()) {
            log.error("Configuration errors:");
            errors.forEach(error -> log.error("  - {}", error));
            throw new IllegalStateException("Invalid configuration detected. See logs for details.");
        }

        log.info("Configuration validation completed successfully");
        log.info("Environment: {}", environment);
        log.info("Server port: {}", serverPort);
        log.info("CORS origins: {}", corsOrigins);
        log.info("WebSocket origins: {}", wsOrigins);
    }
}
