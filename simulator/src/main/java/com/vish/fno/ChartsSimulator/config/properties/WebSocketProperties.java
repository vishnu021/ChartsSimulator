package com.vish.fno.ChartsSimulator.config.properties;

import lombok.Builder;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Configuration properties for WebSocket settings.
 * Binds properties from 'app.websocket' configuration section.
 *
 * @param messageDelay      Delay between messages in milliseconds (minimum 1ms)
 * @param tickerDelay      Delay between ticker updates in milliseconds (minimum 1ms)
 * @param endpoint         WebSocket endpoint path
 * @param allowedOrigins   Comma-separated list of allowed origins for CORS
 */
@ConfigurationProperties("app.websocket")
@Builder
@Validated
public record WebSocketProperties(
    @Min(1)
    @NotNull
    Long messageDelay,

    @Min(1)
    @NotNull
    Long tickerDelay,

    @NotBlank
    String endpoint,

    @NotBlank
    String allowedOrigins
) {}