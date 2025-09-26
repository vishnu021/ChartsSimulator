package com.vish.fno.ChartsSimulator.config.properties;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration properties for data access and external API settings
 */
@ConfigurationProperties("app.data")
@Validated
public record DataProperties(
    @NotBlank(message = "Base URL cannot be blank")
    String baseurl,

    @NotBlank(message = "Base log path cannot be blank")
    String baseLogPath
) {
}