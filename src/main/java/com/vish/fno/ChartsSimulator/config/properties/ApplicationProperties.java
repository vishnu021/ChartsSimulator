package com.vish.fno.ChartsSimulator.config.properties;

import lombok.Builder;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/**
 * Configuration properties for application-wide settings.
 * Binds properties from 'app' configuration section.
 *
 * @param environment   Current application environment (development, staging, production)
 * @param baseurl      Base URL for external API calls
 * @param baseLogPath  Base path for log files
 */
@ConfigurationProperties("app")
@Builder
@Validated
public record ApplicationProperties(
    @NotBlank
    String environment,

    @NotBlank
    String baseurl,

    @NotBlank
    String baseLogPath
) {}