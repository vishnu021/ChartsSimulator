package com.vish.fno.ChartsSimulator.config;

import com.vish.fno.ChartsSimulator.config.properties.ApplicationProperties;
import com.vish.fno.ChartsSimulator.config.properties.CorsProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web configuration class for CORS and MVC settings.
 * Configures Cross-Origin Resource Sharing based on environment.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {
    private static final String ENV_PRODUCTION = "production";

    private final CorsProperties corsProperties;
    private final ApplicationProperties applicationProperties;

    /**
     * Configures CORS mappings based on environment.
     * Production environments have more restrictive CORS policies.
     *
     * @param registry CORS registry for configuration
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = corsProperties.allowedOrigins().split(",");
        String[] methods = corsProperties.allowedMethods().split(",");
        String[] headers = corsProperties.allowedHeaders().split(",");

        // More restrictive CORS for production
        if (ENV_PRODUCTION.equals(applicationProperties.environment())) {
            registry.addMapping("/api/**")
                    .allowedOrigins(origins)
                    .allowedMethods(methods)
                    .allowedHeaders(headers)
                    .allowCredentials(corsProperties.allowCredentials())
                    .maxAge(3600);
        } else {
            // Development mode - more permissive
            registry.addMapping("/**")
                    .allowedOriginPatterns("*")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
        }
    }
}
