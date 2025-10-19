package com.vish.fno.ChartsSimulator.config;

import com.vish.fno.ChartsSimulator.config.properties.CorsProperties;
import com.vish.fno.ChartsSimulator.config.properties.ValidationProperties;
import com.vish.fno.ChartsSimulator.config.properties.WebSocketProperties;
import com.vish.fno.utils.ValidationUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConfigurationValidator {
    private static final String ENV_PRODUCTION = "production";
    private static final String ENV_UNKNOWN = "unknown";

    private final ValidationProperties validationProperties;
    private final CorsProperties corsProperties;
    private final WebSocketProperties webSocketProperties;

    @EventListener(ApplicationReadyEvent.class)
    public void validateConfiguration() {
        List<String> warnings = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        String environment = validationProperties.environment();
        String corsOrigins = String.join(",", corsProperties.allowedOrigins());
        String wsOrigins = String.join(",", webSocketProperties.allowedOrigins());
        int serverPort = validationProperties.serverPort();

        // Validate environment
        if (ENV_UNKNOWN.equals(environment)) {
            warnings.add("Environment not explicitly set, defaulting to 'unknown'");
        }

        // Validate CORS origins for production
        if (ENV_PRODUCTION.equals(environment)) {
            if (corsOrigins.isEmpty() || ValidationUtils.containsWildcards(corsOrigins)) {
                errors.add("Production environment requires explicit CORS origins (no wildcards)");
            }
            if (wsOrigins.isEmpty() || ValidationUtils.containsWildcards(wsOrigins)) {
                errors.add("Production environment requires explicit WebSocket origins (no wildcards)");
            }
        }

        // Validate port
        if (!ValidationUtils.isValidPort(serverPort)) {
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
