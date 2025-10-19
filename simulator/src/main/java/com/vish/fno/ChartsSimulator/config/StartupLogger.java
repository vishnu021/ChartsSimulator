package com.vish.fno.ChartsSimulator.config;

import com.vish.fno.ChartsSimulator.config.properties.ValidationProperties;
import com.vish.fno.utils.NetworkUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class StartupLogger {

    private final ValidationProperties validationProperties;

    @EventListener(ApplicationReadyEvent.class)
    public void logApplicationUrls() {
        try {
            int serverPort = validationProperties.serverPort();
            String environment = validationProperties.environment();
            String applicationName = validationProperties.applicationName();

            List<String> networkUrls = NetworkUtils.getNetworkUrls(serverPort);

            log.info("🚀 {} Application Started Successfully!", applicationName);
            log.info("📊 Environment: {}", environment);
            log.info("🌐 Application URLs:");
            log.info("   Local:    http://localhost:{}", serverPort);
            log.info("   Local:    http://127.0.0.1:{}", serverPort);

            for (String url : networkUrls) {
                log.info("   Network:  {}", url);
            }

            log.info("📡 API Documentation: http://localhost:{}/swagger-ui.html", serverPort);
            log.info("🔧 Configuration API: http://localhost:{}/api/config", serverPort);
            log.info("❤️  Health Check: http://localhost:{}/api/config/health", serverPort);
            log.info("📱 Access from mobile/other devices using the Network URLs above");

        } catch (java.net.SocketException e) {
            log.warn("Could not determine network URLs due to network error: {}", e.getMessage());
            log.info("🚀 {} Application Started on port {}", validationProperties.applicationName(), validationProperties.serverPort());
        } catch (RuntimeException e) {
            log.warn("Unexpected error while determining network URLs: {}", e.getMessage());
            log.info("🚀 {} Application Started on port {}", validationProperties.applicationName(), validationProperties.serverPort());
        }
    }

}
