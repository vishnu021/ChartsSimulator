package com.vish.fno.ChartsSimulator.config.properties;

import lombok.Builder;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotNull;

/**
 * Configuration properties for ticker data processing.
 * Binds properties from 'app.ticker' configuration section.
 *
 * @param deduplicateTimestamps Whether to handle duplicate timestamps by incrementing them
 */
@ConfigurationProperties("app.ticker")
@Builder
@Validated
public record TickerProperties(
    @NotNull
    Boolean deduplicateTimestamps
) {}