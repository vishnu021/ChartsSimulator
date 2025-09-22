package com.vish.fno.ChartsSimulator.config;

import com.vish.fno.ChartsSimulator.config.properties.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Main application configuration class that enables configuration properties.
 * This class centralizes the registration of all configuration property classes
 * and provides a single entry point for configuration management.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Configuration
@EnableConfigurationProperties({
    ApplicationProperties.class,
    WebSocketProperties.class,
    CorsProperties.class,
    TickerProperties.class,
    SecurityProperties.class
})
public class ApplicationConfiguration {
    // This class serves as a configuration registry for property classes
    // No additional bean definitions needed as properties are auto-configured
}