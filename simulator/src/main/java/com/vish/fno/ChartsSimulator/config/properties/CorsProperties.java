package com.vish.fno.ChartsSimulator.config.properties;

import lombok.Builder;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Configuration properties for CORS (Cross-Origin Resource Sharing) settings.
 * Binds properties from 'app.cors' configuration section.
 *
 * @param allowedOrigins    Comma-separated list of allowed origins
 * @param allowedMethods    Comma-separated list of allowed HTTP methods
 * @param allowedHeaders    Comma-separated list of allowed headers
 * @param allowCredentials  Whether to allow credentials in CORS requests
 */
@ConfigurationProperties("app.cors")
@Builder
@Validated
public record CorsProperties(
    @NotBlank
    String allowedOrigins,

    @NotBlank
    String allowedMethods,

    @NotBlank
    String allowedHeaders,

    @NotNull
    Boolean allowCredentials
) {}