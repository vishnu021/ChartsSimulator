package com.vish.fno.ChartsSimulator.config;

import com.vish.fno.ChartsSimulator.config.properties.ValidationProperties;
import com.vish.fno.ChartsSimulator.util.NetworkUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class StartupLogger {

    private static final Logger logger = LoggerFactory.getLogger(StartupLogger.class);

    private final ValidationProperties validationProperties;

    @EventListener(ApplicationReadyEvent.class)
    public void logApplicationUrls() {
        try {
            int serverPort = validationProperties.serverPort();
            String environment = validationProperties.environment();
            String applicationName = validationProperties.applicationName();

            List<String> networkUrls = NetworkUtils.getNetworkUrls(serverPort);

            logger.info("🚀 {} Application Started Successfully!", applicationName);
            logger.info("📊 Environment: {}", environment);
            logger.info("🌐 Application URLs:");
            logger.info("   Local:    http://localhost:{}", serverPort);
            logger.info("   Local:    http://127.0.0.1:{}", serverPort);

            for (String url : networkUrls) {
                logger.info("   Network:  {}", url);
            }

            logger.info("📡 API Documentation: http://localhost:{}/swagger-ui.html", serverPort);
            logger.info("🔧 Configuration API: http://localhost:{}/api/config", serverPort);
            logger.info("❤️  Health Check: http://localhost:{}/api/config/health", serverPort);
            logger.info("📱 Access from mobile/other devices using the Network URLs above");

        } catch (java.net.SocketException e) {
            logger.warn("Could not determine network URLs due to network error: {}", e.getMessage());
            logger.info("🚀 {} Application Started on port {}", validationProperties.applicationName(), validationProperties.serverPort());
        } catch (RuntimeException e) {
            logger.warn("Unexpected error while determining network URLs: {}", e.getMessage());
            logger.info("🚀 {} Application Started on port {}", validationProperties.applicationName(), validationProperties.serverPort());
        }
    }

}
