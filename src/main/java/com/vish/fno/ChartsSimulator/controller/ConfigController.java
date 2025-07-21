package com.vish.fno.ChartsSimulator.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
    public ResponseEntity<Map<String, Object>> getConfig() {
        Map<String, Object> config = new HashMap<>();
        
        // Determine base URLs dynamically
        String protocol = "development".equals(environment) ? "http" : "https";
        String wsProtocol = "development".equals(environment) ? "ws" : "wss";
        
        // For production, use relative URLs that work with any domain
        if ("production".equals(environment)) {
            config.put("apiUrl", "");  // Relative URL for same origin
            config.put("wsUrl", "/ws");  // Relative WebSocket URL
        } else {
            // For development, use localhost
            config.put("apiUrl", protocol + "://localhost:" + serverPort);
            config.put("wsUrl", protocol + "://localhost:" + serverPort + wsEndpoint);
        }
        
        config.put("environment", environment);
        config.put("wsEndpoint", wsEndpoint);
        config.put("version", "1.0.0");
        
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