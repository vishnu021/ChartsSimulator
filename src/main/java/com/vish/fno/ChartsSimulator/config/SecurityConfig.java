package com.vish.fno.ChartsSimulator.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
public class SecurityConfig implements WebMvcConfigurer {

    @Value("${app.security.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    @Value("${app.security.rate-limit.requests-per-minute:60}")
    private int requestsPerMinute;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        if (rateLimitEnabled) {
            registry.addInterceptor(rateLimitInterceptor())
                    .addPathPatterns("/api/**", "/ws/**");
        }
        
        registry.addInterceptor(securityHeadersInterceptor())
                .addPathPatterns("/**");
    }

    @Bean
    public RateLimitInterceptor rateLimitInterceptor() {
        return new RateLimitInterceptor(requestsPerMinute);
    }

    @Bean
    public SecurityHeadersInterceptor securityHeadersInterceptor() {
        return new SecurityHeadersInterceptor();
    }

    public static class RateLimitInterceptor implements HandlerInterceptor {
        private final int requestsPerMinute;
        private final ConcurrentHashMap<String, ClientRequestTracker> clients = new ConcurrentHashMap<>();

        public RateLimitInterceptor(int requestsPerMinute) {
            this.requestsPerMinute = requestsPerMinute;
        }

        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
            String clientId = getClientId(request);
            ClientRequestTracker tracker = clients.computeIfAbsent(clientId, k -> new ClientRequestTracker());

            if (tracker.exceedsLimit(requestsPerMinute)) {
                response.setStatus(429); // Too Many Requests
                response.setHeader("Retry-After", "60");
                response.setHeader("X-RateLimit-Limit", String.valueOf(requestsPerMinute));
                response.setHeader("X-RateLimit-Remaining", "0");
                return false;
            }

            tracker.addRequest();
            response.setHeader("X-RateLimit-Limit", String.valueOf(requestsPerMinute));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, requestsPerMinute - tracker.getRequestCount())));
            
            return true;
        }

        private String getClientId(HttpServletRequest request) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                return xForwardedFor.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        }
    }

    public static class SecurityHeadersInterceptor implements HandlerInterceptor {
        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
            // Security headers
            response.setHeader("X-Content-Type-Options", "nosniff");
            response.setHeader("X-Frame-Options", "DENY");
            response.setHeader("X-XSS-Protection", "1; mode=block");
            response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
            response.setHeader("Content-Security-Policy", 
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "connect-src 'self' ws: wss:; " +
                "img-src 'self' data:;"
            );

            return true;
        }
    }

    private static class ClientRequestTracker {
        private final AtomicInteger requestCount = new AtomicInteger(0);
        private volatile long windowStart = System.currentTimeMillis();

        public boolean exceedsLimit(int limit) {
            long now = System.currentTimeMillis();
            if (now - windowStart > 60000) { // 1 minute window
                reset();
            }
            return requestCount.get() >= limit;
        }

        public void addRequest() {
            requestCount.incrementAndGet();
        }

        public int getRequestCount() {
            return requestCount.get();
        }

        private void reset() {
            requestCount.set(0);
            windowStart = System.currentTimeMillis();
        }
    }
}