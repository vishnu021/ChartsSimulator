package com.vish.fno.ChartsSimulator.config;

import com.vish.fno.ChartsSimulator.config.properties.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration class to enable all configuration properties
 */
@Configuration
@EnableConfigurationProperties({
    ApplicationProperties.class,
    DataProperties.class,
    FuturesProperties.class,
    TickProcessorProperties.class,
    ValidationProperties.class,
    WebSocketProperties.class,
    CorsProperties.class,
    TickerProperties.class,
    SecurityProperties.class
})
public class ApplicationConfiguration {
}