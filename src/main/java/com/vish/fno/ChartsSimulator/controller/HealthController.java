package com.vish.fno.ChartsSimulator.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @Value("${app.environment:unknown}")
    private String environment;

    @Value("${spring.application.name:ChartsSimulator}")
    private String applicationName;

    private final Instant startTime = Instant.now();

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        
        health.put("status", "UP");
        health.put("application", applicationName);
        health.put("environment", environment);
        health.put("timestamp", Instant.now().toString());
        health.put("uptime", getUptime());
        
        return ResponseEntity.ok(health);
    }

    @GetMapping("/detailed")
    public ResponseEntity<Map<String, Object>> detailedHealth() {
        Map<String, Object> health = new HashMap<>();
        
        // Basic info
        health.put("status", "UP");
        health.put("application", applicationName);
        health.put("environment", environment);
        health.put("timestamp", Instant.now().toString());
        health.put("uptime", getUptime());
        
        // System metrics
        health.put("system", getSystemMetrics());
        health.put("memory", getMemoryMetrics());
        
        return ResponseEntity.ok(health);
    }

    @GetMapping("/ready")
    public ResponseEntity<Map<String, String>> readiness() {
        Map<String, String> status = new HashMap<>();
        
        // Check if application is ready to serve traffic
        // Add your readiness checks here (database connections, etc.)
        
        status.put("status", "READY");
        status.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(status);
    }

    @GetMapping("/live")
    public ResponseEntity<Map<String, String>> liveness() {
        Map<String, String> status = new HashMap<>();
        
        // Basic liveness check
        status.put("status", "ALIVE");
        status.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(status);
    }

    private long getUptime() {
        return Instant.now().toEpochMilli() - startTime.toEpochMilli();
    }

    private Map<String, Object> getSystemMetrics() {
        Map<String, Object> system = new HashMap<>();
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        
        system.put("processors", osBean.getAvailableProcessors());
        system.put("loadAverage", osBean.getSystemLoadAverage());
        system.put("osName", osBean.getName());
        system.put("osVersion", osBean.getVersion());
        
        return system;
    }

    private Map<String, Object> getMemoryMetrics() {
        Map<String, Object> memory = new HashMap<>();
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        Runtime runtime = Runtime.getRuntime();
        
        memory.put("heap", Map.of(
            "used", memoryBean.getHeapMemoryUsage().getUsed(),
            "max", memoryBean.getHeapMemoryUsage().getMax(),
            "committed", memoryBean.getHeapMemoryUsage().getCommitted()
        ));
        
        memory.put("nonHeap", Map.of(
            "used", memoryBean.getNonHeapMemoryUsage().getUsed(),
            "max", memoryBean.getNonHeapMemoryUsage().getMax(),
            "committed", memoryBean.getNonHeapMemoryUsage().getCommitted()
        ));
        
        memory.put("jvm", Map.of(
            "total", runtime.totalMemory(),
            "free", runtime.freeMemory(),
            "max", runtime.maxMemory()
        ));
        
        return memory;
    }
}