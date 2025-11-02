package com.vish.fno.ChartsSimulator.cache;

import com.vish.fno.models.Candlestick;
import com.vish.fno.models.Ticker;
import com.vish.fno.utils.CandleUtils;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Shared cache for historical ticker data across all backtest simulations.
 *
 * <p><b>Design Philosophy:</b></p>
 * <ul>
 *   <li><b>Isolation:</b> Separates cache from simulation state (BacktestEngine)</li>
 *   <li><b>Sharing:</b> Single instance shared across all simulations to save memory</li>
 *   <li><b>Thread-Safety:</b> Uses ConcurrentHashMap for concurrent access</li>
 *   <li><b>Eviction Policy:</b> Only evicts when cache becomes enormously large (>100K entries per key)</li>
 * </ul>
 *
 * <p><b>Key Structure:</b> (symbol, date) → List of historical tickers</p>
 *
 * <p><b>Memory Management:</b></p>
 * <ul>
 *   <li>Default: No eviction (strategies need full historical context)</li>
 *   <li>Emergency: Evicts oldest 50% when entry exceeds 100,000 tickers</li>
 *   <li>Assumption: Typical day has ~20,000-30,000 ticks, so 100K is 3-5 days worth</li>
 *   <li>Eviction can be disabled via EVICTION_ENABLED flag (useful for testing)</li>
 * </ul>
 *
 * <p><b>Candlestick Conversion:</b></p>
 * <ul>
 *   <li>Provides utility methods to convert cached tickers to minute candlesticks</li>
 *   <li>Uses CandleUtils for efficient grouping and conversion</li>
 *   <li>Returns both completed and all candlesticks</li>
 * </ul>
 *
 * <p><b>Usage Example:</b></p>
 * <pre>{@code
 * TradeSimulationCache cache = TradeSimulationCache.getInstance();
 * cache.addTicker("NIFTY", "2025-10-01", ticker);
 * List<Ticker> history = cache.getHistoricalTickers("NIFTY", "2025-10-01");
 * List<Candlestick> candles = cache.getMinuteCandlesticks("NIFTY", "2025-10-01");
 * }</pre>
 *
 * @author ChartsSimulator
 * @since 3.0.0
 */
@Slf4j
public class TradeSimulationCache {

    private static final TradeSimulationCache INSTANCE = new TradeSimulationCache();

    // Eviction control
    private static final boolean EVICTION_ENABLED = true;  // Set to false to disable eviction
    private static final int MAX_TICKERS_PER_KEY = 100_000;
    private static final double EVICTION_PERCENTAGE = 0.5; // Keep 50% when evicting

    // Key: "symbol:date", Value: List of historical tickers
    private final Map<String, List<Ticker>> cache = new ConcurrentHashMap<>();

    // Private constructor for singleton
    private TradeSimulationCache() {
        log.info("TradeSimulationCache initialized");
    }

    /**
     * Gets the singleton instance of TradeSimulationCache.
     *
     * @return Singleton cache instance
     */
    public static TradeSimulationCache getInstance() {
        return INSTANCE;
    }

    /**
     * Adds a ticker to the cache for the given symbol and date.
     *
     * <p>If EVICTION_ENABLED and cache size exceeds MAX_TICKERS_PER_KEY,
     * the oldest 50% of entries are evicted.</p>
     *
     * @param symbol Trading symbol
     * @param date Trading date
     * @param ticker Ticker to add
     */
    public void addTicker(String symbol, String date, Ticker ticker) {
        String key = createKey(symbol, date);
        cache.computeIfAbsent(key, k -> new ArrayList<>()).add(ticker);

        // Check if eviction is needed (only if enabled)
        if (EVICTION_ENABLED) {
            List<Ticker> tickers = cache.get(key);
            if (tickers.size() > MAX_TICKERS_PER_KEY) {
                evictOldestEntries(key, tickers);
            }
        }
    }

    /**
     * Adds multiple tickers in bulk (more efficient than individual adds).
     *
     * @param symbol Trading symbol
     * @param date Trading date
     * @param tickers List of tickers to add
     */
    public void addTickers(String symbol, String date, List<Ticker> tickers) {
        String key = createKey(symbol, date);
        cache.computeIfAbsent(key, k -> new ArrayList<>()).addAll(tickers);

        // Check if eviction is needed (only if enabled)
        if (EVICTION_ENABLED) {
            List<Ticker> cachedTickers = cache.get(key);
            if (cachedTickers.size() > MAX_TICKERS_PER_KEY) {
                evictOldestEntries(key, cachedTickers);
            }
        }
    }

    /**
     * Gets historical tickers for the given symbol and date.
     *
     * <p><b>IMPORTANT:</b> Returns an UNMODIFIABLE view to prevent accidental modification.
     * The internal list is still mutable (for performance), but callers cannot modify it.</p>
     *
     * @param symbol Trading symbol
     * @param date Trading date
     * @return Unmodifiable list of historical tickers (empty if not found)
     */
    public List<Ticker> getHistoricalTickers(String symbol, String date) {
        String key = createKey(symbol, date);
        return List.copyOf(cache.getOrDefault(key, List.of()));
    }

    /**
     * Gets the latest ticker for the given symbol and date.
     *
     * @param symbol Trading symbol
     * @param date Trading date
     * @return Latest ticker, or null if no tickers exist
     */
    public Ticker getLatestTicker(String symbol, String date) {
        List<Ticker> tickers = cache.get(createKey(symbol, date));
        return (tickers == null || tickers.isEmpty()) ? null : tickers.get(tickers.size() - 1);
    }

    /**
     * Gets the number of tickers cached for the given symbol and date.
     *
     * @param symbol Trading symbol
     * @param date Trading date
     * @return Number of tickers in cache
     */
    public int size(String symbol, String date) {
        List<Ticker> tickers = cache.get(createKey(symbol, date));
        return (tickers == null) ? 0 : tickers.size();
    }

    /**
     * Clears all cached data for the given symbol and date.
     *
     * @param symbol Trading symbol
     * @param date Trading date
     */
    public void clear(String symbol, String date) {
        String key = createKey(symbol, date);
        List<Ticker> removed = cache.remove(key);
        if (removed != null) {
            log.info("Cleared cache for {}: {} tickers removed", key, removed.size());
        }
    }

    /**
     * Clears the entire cache.
     *
     * <p><b>WARNING:</b> Use with caution. Only call between backtest runs or tests.</p>
     */
    public void clearAll() {
        int totalEntries = cache.values().stream().mapToInt(List::size).sum();
        cache.clear();
        log.info("Cleared entire cache: {} tickers removed from {} keys", totalEntries, cache.size());
    }

    /**
     * Gets statistics about the cache.
     *
     * @return Map containing cache statistics
     */
    public Map<String, Object> getStatistics() {
        int totalKeys = cache.size();
        int totalTickers = cache.values().stream().mapToInt(List::size).sum();
        int avgTickersPerKey = (totalKeys == 0) ? 0 : totalTickers / totalKeys;
        int maxTickersPerKey = cache.values().stream().mapToInt(List::size).max().orElse(0);

        return Map.of(
            "totalKeys", totalKeys,
            "totalTickers", totalTickers,
            "avgTickersPerKey", avgTickersPerKey,
            "maxTickersPerKey", maxTickersPerKey,
            "maxAllowedPerKey", MAX_TICKERS_PER_KEY,
            "evictionEnabled", EVICTION_ENABLED
        );
    }

    // ==================== CANDLESTICK CONVERSION ====================

    /**
     * Converts cached tickers to minute candlesticks.
     *
     * <p>Groups all historical tickers by minute and builds candlesticks using CandleUtils.
     * Returns all candlesticks including the last incomplete one.</p>
     *
     * <p><b>Usage Example:</b></p>
     * <pre>{@code
     * TradeSimulationCache cache = TradeSimulationCache.getInstance();
     * List<Candlestick> allCandles = cache.getMinuteCandlesticks("NIFTY", "2025-10-01");
     * List<Candlestick> completed = cache.getCompletedMinuteCandlesticks("NIFTY", "2025-10-01");
     * }</pre>
     *
     * @param symbol Trading symbol
     * @param date Trading date
     * @return List of minute candlesticks (includes incomplete last candle)
     */
    public List<Candlestick> getMinuteCandlesticks(String symbol, String date) {
        List<Ticker> tickers = getHistoricalTickers(symbol, date);
        if (tickers.isEmpty()) {
            return List.of();
        }
        return CandleUtils.groupTickersByMinute(tickers);
    }

    /**
     * Converts cached tickers to completed minute candlesticks only.
     *
     * <p>Groups all historical tickers by minute and builds candlesticks using CandleUtils.
     * Returns only completed candlesticks (excludes the last incomplete one).</p>
     *
     * <p><b>Usage Example:</b></p>
     * <pre>{@code
     * TradeSimulationCache cache = TradeSimulationCache.getInstance();
     * List<Candlestick> completed = cache.getCompletedMinuteCandlesticks("NIFTY", "2025-10-01");
     * completed.forEach(candle -> log.info("Completed candle: {}", candle));
     * }</pre>
     *
     * @param symbol Trading symbol
     * @param date Trading date
     * @return List of completed minute candlesticks (excludes last incomplete candle)
     */
    public List<Candlestick> getCompletedMinuteCandlesticks(String symbol, String date) {
        List<Ticker> tickers = getHistoricalTickers(symbol, date);
        if (tickers.isEmpty()) {
            return List.of();
        }
        return CandleUtils.getCompletedCandlesticksFromTickers(tickers);
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Creates a unique cache key from symbol and date.
     */
    private String createKey(String symbol, String date) {
        return symbol + ":" + date;
    }

    /**
     * Evicts the oldest 50% of entries when cache exceeds threshold.
     */
    private void evictOldestEntries(String key, List<Ticker> tickers) {
        int currentSize = tickers.size();
        int targetSize = (int) (currentSize * EVICTION_PERCENTAGE);
        int toRemove = currentSize - targetSize;

        log.warn("Cache size exceeded for {}: {} tickers. Evicting oldest {} entries (keeping {})",
                key, currentSize, toRemove, targetSize);

        // Remove oldest entries (from the beginning)
        tickers.subList(0, toRemove).clear();
    }
}
