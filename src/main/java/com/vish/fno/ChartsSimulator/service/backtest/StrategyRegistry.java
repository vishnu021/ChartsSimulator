package com.vish.fno.ChartsSimulator.service.backtest;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Registry service for managing trading strategies.
 *
 * <p>Auto-discovers all Strategy beans at startup and provides
 * lookup and validation capabilities. Supports strategy listing
 * for API exposure.</p>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Slf4j
@Service
public class StrategyRegistry {

    private final Map<String, Strategy> strategies;

    /**
     * Constructor that auto-registers all Strategy beans.
     *
     * @param strategyBeans List of all Strategy beans injected by Spring
     */
    public StrategyRegistry(List<Strategy> strategyBeans) {
        this.strategies = strategyBeans.stream()
            .collect(Collectors.toMap(
                Strategy::getStrategyName,
                Function.identity()
            ));

        log.info("📋 Registered {} strategies: {}", strategies.size(), strategies.keySet());
    }

    /**
     * Get strategy by name.
     *
     * @param name Strategy name (case-sensitive)
     * @return Strategy instance
     * @throws IllegalArgumentException if strategy not found
     */
    public Strategy getStrategy(String name) {
        return Optional.ofNullable(strategies.get(name))
            .orElseThrow(() -> new IllegalArgumentException(
                "Strategy not found: " + name + ". Available: " + strategies.keySet()
            ));
    }

    /**
     * Get all available strategy names.
     *
     * @return List of strategy names
     */
    public List<String> getAvailableStrategies() {
        return new ArrayList<>(strategies.keySet());
    }

    /**
     * Check if strategy exists.
     *
     * @param name Strategy name
     * @return true if strategy exists
     */
    public boolean hasStrategy(String name) {
        return strategies.containsKey(name);
    }
}
