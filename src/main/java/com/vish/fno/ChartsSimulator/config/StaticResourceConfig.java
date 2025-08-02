package com.vish.fno.ChartsSimulator.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Handle Next.js build assets with long cache
        registry.addResourceHandler("/_next/**")
                .addResourceLocations("classpath:/static/_next/")
                .setCachePeriod(31536000); // 1 year cache for immutable assets

        // Handle static assets
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(86400); // 1 day cache

        // Handle favicon
        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("classpath:/static/favicon.ico")
                .setCachePeriod(86400);

        // Handle other static files (images, etc.) but NOT html files
        registry.addResourceHandler("/*.js", "/*.css", "/*.ico", "/*.png", "/*.jpg", "/*.jpeg", "/*.gif", "/*.svg", "/*.woff", "/*.woff2", "/*.ttf", "/*.eot")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(86400);

        // Handle all other requests - fallback for SPA routing
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(0);
    }
}
