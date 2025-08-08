package com.vish.fno.ChartsSimulator.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
    private static final int ONE_YEAR_SECONDS = 31_536_000; // 365 days
    private static final int ONE_DAY_SECONDS = 86_400; // 24 hours

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Handle Next.js build assets with long cache
        registry.addResourceHandler("/_next/**")
                .addResourceLocations("classpath:/static/_next/")
                .setCachePeriod(ONE_YEAR_SECONDS);

        // Handle static assets
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(ONE_DAY_SECONDS);

        // Handle favicon
        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("classpath:/static/favicon.ico")
                .setCachePeriod(ONE_DAY_SECONDS);

        // Handle other static files (images, etc.) but NOT html files
        registry.addResourceHandler("/*.js", "/*.css", "/*.ico", "/*.png", "/*.jpg", "/*.jpeg", "/*.gif", "/*.svg", "/*.woff", "/*.woff2", "/*.ttf", "/*.eot")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(ONE_DAY_SECONDS);

        // Handle all other requests - fallback for SPA routing
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(0);
    }
}
