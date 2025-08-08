package com.vish.fno.ChartsSimulator.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class StartupLogger {

    private static final Logger logger = LoggerFactory.getLogger(StartupLogger.class);

    @Value("${server.port:9090}")
    private int serverPort;

    @Value("${app.environment:development}")
    private String environment;

    @EventListener(ApplicationReadyEvent.class)
    public void logApplicationUrls() {
        try {
            List<String> networkUrls = getNetworkUrls();

            logger.info("🚀 ChartsSimulator Application Started Successfully!");
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
            logger.info("🚀 ChartsSimulator Application Started on port {}", serverPort);
        } catch (RuntimeException e) {
            logger.warn("Unexpected error while determining network URLs: {}", e.getMessage());
            logger.info("🚀 ChartsSimulator Application Started on port {}", serverPort);
        }
    }

    private List<String> getNetworkUrls() throws java.net.SocketException {
        List<String> urls = new ArrayList<>();

        for (NetworkInterface networkInterface : Collections.list(NetworkInterface.getNetworkInterfaces())) {
            if (networkInterface.isLoopback() || !networkInterface.isUp()) {
                continue;
            }

            for (InetAddress address : Collections.list(networkInterface.getInetAddresses())) {
                if (address.isSiteLocalAddress() && !address.isLoopbackAddress()) {
                    String hostAddress = address.getHostAddress();
                    // Filter out IPv6 addresses for simplicity
                    if (!hostAddress.contains(":")) {
                        urls.add("http://" + hostAddress + ":" + serverPort);
                    }
                }
            }
        }

        return urls;
    }
}
