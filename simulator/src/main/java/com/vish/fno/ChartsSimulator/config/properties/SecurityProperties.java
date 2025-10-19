package com.vish.fno.ChartsSimulator.config.properties;

import lombok.Builder;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Configuration properties for security settings.
 * Binds properties from 'app.security' configuration section.
 *
 * @param rateLimit Rate limiting configuration
 */
@ConfigurationProperties("app.security")
@Builder
@Validated
public record SecurityProperties(
    @Valid
    @NotNull
    RateLimit rateLimit
) {
    /**
     * Rate limiting configuration nested record.
     *
     * @param enabled             Whether rate limiting is enabled
     * @param requestsPerMinute   Maximum requests allowed per minute per client
     */
    public record RateLimit(
        @NotNull
        Boolean enabled,

        @Min(1)
        @NotNull
        Integer requestsPerMinute
    ) {}
}