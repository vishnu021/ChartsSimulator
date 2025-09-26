package com.vish.fno.ChartsSimulator.config;

import com.vish.fno.ChartsSimulator.config.properties.SecurityProperties;
import com.vish.fno.ChartsSimulator.util.NetworkUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig implements WebMvcConfigurer {
    private static final int RETRY_AFTER_SECONDS = 60;
    private static final long ONE_MINUTE_MS = 60_000L;

    private final SecurityProperties securityProperties;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        if (securityProperties.rateLimit().enabled()) {
            registry.addInterceptor(rateLimitInterceptor())
                    .addPathPatterns("/api/**", "/ws/**");
        }

        registry.addInterceptor(securityHeadersInterceptor())
                .addPathPatterns("/**");
    }

    @Bean
    public RateLimitInterceptor rateLimitInterceptor() {
        return new RateLimitInterceptor(securityProperties.rateLimit().requestsPerMinute());
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
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setHeader("Retry-After", String.valueOf(RETRY_AFTER_SECONDS));
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
            return NetworkUtils.getClientIpAddress(
                request.getHeader("X-Forwarded-For"),
                request.getRemoteAddr()
            );
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
            if (now - windowStart > ONE_MINUTE_MS) { // 1 minute window
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
