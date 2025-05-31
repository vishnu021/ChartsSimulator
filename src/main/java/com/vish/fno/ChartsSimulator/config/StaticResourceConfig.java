// src/main/java/com/vish/fno/ChartsSimulator/config/StaticResourceConfig.java
package com.vish.fno.ChartsSimulator.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve Next.js _next assets (JS, CSS, etc.)
        registry.addResourceHandler("/_next/**")
                .addResourceLocations("classpath:/static/_next/")
                .setCachePeriod(31536000); // 1 year cache for immutable assets

        // Serve static files (images, favicon, etc.)
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(86400); // 1 day cache

        // Serve favicon specifically
        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("classpath:/static/favicon.ico")
                .setCachePeriod(86400);

        // Serve all other files from static directory
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(0); // No cache for HTML files (for updates)
    }
}
