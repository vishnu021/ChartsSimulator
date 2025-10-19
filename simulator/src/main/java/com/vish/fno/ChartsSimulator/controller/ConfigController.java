package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.phaseanalyzer.analysis.WyckoffAnalysisService;
import com.vish.fno.ChartsSimulator.config.properties.ValidationProperties;
import com.vish.fno.ChartsSimulator.config.properties.WebSocketProperties;
import com.vish.fno.ChartsSimulator.util.NetworkUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class ConfigController {

    private final ValidationProperties validationProperties;
    private final WebSocketProperties webSocketProperties;
    private final WyckoffAnalysisService wyckoffAnalysisService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getConfig(HttpServletRequest request) {
        Map<String, Object> config = new HashMap<>();

        // Dynamically detect the host and protocol from the request
        String protocol = request.getScheme(); // http or https
        String host = request.getServerName();
        int port = request.getServerPort();
        String wsProtocol = NetworkUtils.getWebSocketProtocol(protocol);
        String wsEndpoint = webSocketProperties.endpoint();
        String environment = validationProperties.environment();

        // Build base URL from request
        String baseUrl = NetworkUtils.buildBaseUrl(protocol, host, port);

        // For production, prefer relative URLs for same-origin requests
        if (validationProperties.isProduction()) {
            config.put("apiUrl", "");  // Relative URL for same origin
            config.put("wsUrl", wsProtocol + "://" + host + (port != 80 && port != 443 ? ":" + port : "") + wsEndpoint);
        } else {
            // For development, use the detected host (supports both localhost and network access)
            config.put("apiUrl", baseUrl);
            config.put("wsUrl", wsProtocol + "://" + host + (port != 80 && port != 443 ? ":" + port : "") + wsEndpoint);
        }

        config.put("environment", environment);
        config.put("wsEndpoint", wsEndpoint);
        config.put("version", "1.0.0");
        config.put("detectedHost", host);
        config.put("detectedPort", port);
        config.put("detectedProtocol", protocol);

        return ResponseEntity.ok(config);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "ChartsSimulator");
        health.put("timestamp", java.time.Instant.now().toString());
        return ResponseEntity.ok(health);
    }

    @GetMapping("/wyckoff")
    public ResponseEntity<Map<String, String>> getWyckoffAnalyzer() {
        Map<String, String> analyzer = new HashMap<>();
        analyzer.put("analyzerInfo", wyckoffAnalysisService.getAnalyzerInfo());
        analyzer.put("timestamp", java.time.Instant.now().toString());
        return ResponseEntity.ok(analyzer);
    }
}