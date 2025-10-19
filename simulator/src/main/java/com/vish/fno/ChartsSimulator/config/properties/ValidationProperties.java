package com.vish.fno.ChartsSimulator.config.properties;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration properties for application validation and monitoring
 */
@ConfigurationProperties("app.validation")
@Validated
public record ValidationProperties(
    @NotBlank(message = "Environment cannot be blank")
    String environment,

    @NotBlank(message = "Application name cannot be blank")
    String applicationName,

    @Min(value = 1024, message = "Server port must be at least 1024")
    @Max(value = 65535, message = "Server port must be at most 65535")
    int serverPort
) {

    public boolean isProduction() {
        return "production".equalsIgnoreCase(environment);
    }

    public boolean isDevelopment() {
        return "development".equalsIgnoreCase(environment) || "dev".equalsIgnoreCase(environment);
    }

    public boolean isLocal() {
        return "local".equalsIgnoreCase(environment);
    }
}