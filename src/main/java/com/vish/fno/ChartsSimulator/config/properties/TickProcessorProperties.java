package com.vish.fno.ChartsSimulator.config.properties;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration properties for tick data processing
 */
@ConfigurationProperties("app.tick-processor")
@Validated
public record TickProcessorProperties(
    boolean enabled,

    @NotBlank(message = "Date cannot be blank when tick processor is enabled")
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Date must be in YYYY-MM-DD format")
    String date,

    @NotBlank(message = "Symbol cannot be blank when tick processor is enabled")
    String symbol,

    @NotBlank(message = "Output path cannot be blank")
    String outputPath,

    boolean deduplicateTimestamps,

    @Valid
    TimeFilter timeFilter
) {

    public record TimeFilter(
        boolean enabled,

        @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
                message = "Start time must be in HH:mm:ss format")
        String startTime,

        @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
                message = "End time must be in HH:mm:ss format")
        String endTime
    ) {}
}