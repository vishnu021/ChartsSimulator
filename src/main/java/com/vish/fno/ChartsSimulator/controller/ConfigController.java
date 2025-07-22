package com.vish.fno.ChartsSimulator.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/config")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ConfigController {

    @Value("${server.port:9090}")
    private String serverPort;

    @Value("${app.websocket.endpoint:/ws}")
    private String wsEndpoint;

    @Value("${app.environment:production}")
    private String environment;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getConfig(HttpServletRequest request) {
        Map<String, Object> config = new HashMap<>();
        
        // Dynamically detect the host and protocol from the request
        String protocol = request.getScheme(); // http or https
        String host = request.getServerName();
        int port = request.getServerPort();
        String wsProtocol = "https".equals(protocol) ? "wss" : "ws";
        
        // Build base URL from request
        String baseUrl;
        if ((port == 80 && "http".equals(protocol)) || (port == 443 && "https".equals(protocol))) {
            // Default ports, omit port number
            baseUrl = protocol + "://" + host;
        } else {
            // Non-default ports, include port number
            baseUrl = protocol + "://" + host + ":" + port;
        }
        
        // For production, prefer relative URLs for same-origin requests
        if ("production".equals(environment)) {
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
}