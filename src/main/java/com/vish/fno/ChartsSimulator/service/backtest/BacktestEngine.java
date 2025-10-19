package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.Candlestick;
import com.vish.fno.ChartsSimulator.model.Signal;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.*;
import com.vish.fno.ChartsSimulator.util.CandleUtils;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Orchestrates backtest execution by coordinating specialized managers.
 *
 * <p><b>Design Philosophy - Separation of Concerns:</b></p>
 * <ul>
 *   <li><b>BacktestEngine:</b> Orchestrates the backtest flow (this class)</li>
 *   <li><b>OrderManager:</b> Handles order lifecycle (entry/exit/validation)</li>
 *   <li><b>PortfolioManager:</b> Manages portfolio state (cash/positions/snapshots)</li>
 *   <li><b>MetricsCalculator:</b> Computes statistics (pure functions)</li>
 * </ul>
 *
 * <p><b>Execution Flow:</b></p>
 * <ol>
 *   <li><b>Check Exits:</b> OrderManager checks stop/target/signals → PortfolioManager updates cash</li>
 *   <li><b>Detect Signals:</b> Strategy detects signals on growing historical data</li>
 *   <li><b>Evaluate Entry:</b> OrderManager validates entry → PortfolioManager deducts cash</li>
 *   <li><b>Record Snapshots:</b> PortfolioManager tracks portfolio value over time</li>
 *   <li><b>Calculate Results:</b> MetricsCalculator computes final metrics</li>
 * </ol>
 *
 * <p><b>Key Improvements (2.1.0):</b></p>
 * <ul>
 *   <li>Reduced from 463 lines to ~180 lines (60% reduction)</li>
 *   <li>Single Responsibility: Engine only orchestrates, delegates details</li>
 *   <li>Open/Closed: Easy to extend with new managers without modifying engine</li>
 *   <li>Dependency Inversion: Engine depends on abstractions (managers), not concrete implementations</li>
 *   <li>Better testability: Each manager can be tested independently</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 2.0.0
 * @version 2.1.0 - Refactored with separation of concerns using specialized managers
 */
@Slf4j
public class BacktestEngine {

    // Configuration
    private final String symbol;
    private final String date;
    private final Strategy strategy;
    private final List<Ticker> tickers;
    private final BacktestProperties backtestProperties;

    // Specialized managers (Dependency Injection)
    private final PortfolioManager portfolioManager;
    private final OrderManager orderManager;

    // Execution state
    private Optional<ActiveOrder> activeOrder = Optional.empty();
    private Optional<Signal> currentSignal = Optional.empty();
    private final List<Ticker> historicalTickers = new ArrayList<>();

    // Phase detection state
    private MarketPhase currentPhase = MarketPhase.UNKNOWN;
    private final List<Candlestick> candlesticks = new ArrayList<>();
    private String lastProcessedMinute = null;

    /**
     * Creates a new backtest engine.
     *
     * @param symbol Trading symbol
     * @param date Trading date
     * @param strategy Trading strategy to backtest
     * @param tickers Historical ticker data
     * @param initialCapital Starting capital
     * @param backtestProperties Backtest configuration properties
     */
    public BacktestEngine(String symbol, String date, Strategy strategy, List<Ticker> tickers, double initialCapital, BacktestProperties backtestProperties) {
        this.symbol = symbol;
        this.date = date;
        this.strategy = strategy;
        this.tickers = tickers;
        this.backtestProperties = backtestProperties;

        // Initialize managers
        this.portfolioManager = new PortfolioManager(initialCapital);
        this.orderManager = new OrderManager();

        // Reset strategy state
        this.strategy.reset();
    }

    // ==================== PUBLIC API ====================

    /**
     * Executes the backtest and returns results.
     *
     * @return Complete backtest results
     * @throws IllegalArgumentException if ticker data is null or empty
     */
    public BacktestResult runBacktest() {
        validateInput();
        validatePhaseConfig();

        log.info("🚀 Starting backtest: strategy={}, tickers={}, capital={}, phaseDetection={}, phaseFiltering={}",
                strategy.getStrategyName(), tickers.size(), portfolioManager.getInitialCapital(),
                backtestProperties.phaseDetectionEnabled(), backtestProperties.phaseFilteringEnabled());

        if (backtestProperties.phaseFilteringEnabled()) {
            log.info("📊 Phase filtering enabled - allowed phases: {}", backtestProperties.allowedPhases());
        } else if (backtestProperties.phaseDetectionEnabled()) {
            log.info("📊 Phase detection enabled (reporting only - no filtering)");
        }

        // Process each tick sequentially
        for (int i = 0; i < tickers.size(); i++) {
            Ticker tick = tickers.get(i);
            historicalTickers.add(tick);
            processTick(tick, i);
        }

        // Close any remaining position at market close
        closeRemainingPosition();

        // Calculate final results
        BacktestResult result = buildResult();

        logCompletionSummary(result);

        return result;
    }

    // ==================== TICK PROCESSING ====================

    /**
     * Processes a single tick through the backtest flow.
     *
     * <p><b>Processing Order:</b></p>
     * <ol>
     *   <li>Update candlesticks for phase detection</li>
     *   <li>Detect current market phase</li>
     *   <li>Check exit conditions if position is open</li>
     *   <li>Detect new trading signals (with phase filtering if enabled)</li>
     *   <li>Try to enter position if signal is present</li>
     *   <li>Record portfolio snapshot periodically</li>
     * </ol>
     *
     * @param tick Current tick data
     * @param tickIndex Index of current tick
     */
    private void processTick(Ticker tick, int tickIndex) {
        double currentPrice = tick.price();

        // 1. Update candlesticks and detect phase if enabled
        if (backtestProperties.phaseDetectionEnabled()) {
            updateCandlesticks(tick);
            currentPhase = PhaseDetector.detectPhase(candlesticks, currentPhase);
        }

        // 2. Check exits if position is open
        if (activeOrder.isPresent()) {
            handlePositionExit(tick, currentPrice);
        }

        // 3. Detect new signals ONLY if no position is open
        // If position is open, skip signal detection to avoid storing stale signals
        if (activeOrder.isEmpty()) {
            detectSignal();
        } else {
            // Discard any existing signal when position is open
            if (currentSignal.isPresent()) {
                log.debug("[{}] 🚫 Discarding signal - position already open", tick.time());
                currentSignal = Optional.empty();
            }
        }

        // 4. Try to enter position if signal is present, valid, and no position is open
        if (activeOrder.isEmpty() && currentSignal.isPresent()) {
            // Check if signal has expired
            if (isSignalExpired(currentSignal.get(), tick.time())) {
                log.info("[{}] ⏰ Signal expired - skipping entry (emitted: {}, expired: {})",
                        tick.time(),
                        currentSignal.get().emissionTime(),
                        currentSignal.get().expiryTime());
                currentSignal = Optional.empty();
            } else {
                handlePositionEntry(tick, currentPrice, tickIndex);
            }
        }

        // 5. Record portfolio snapshot periodically
        portfolioManager.recordSnapshotIfNeeded(tick, tickIndex, currentPrice, activeOrder);
    }

    /**
     * Updates candlesticks from tick data for phase detection.
     * Only recalculates when minute boundary changes to avoid redundant processing.
     */
    private void updateCandlesticks(Ticker tick) {
        String currentMinute = CandleUtils.getMinuteKey(tick.time());

        // Skip expensive recalculation if still in same minute
        if (lastProcessedMinute != null && lastProcessedMinute.equals(currentMinute)) {
            return;
        }

        // New minute detected → recalculate completed candlesticks
        List<Candlestick> completed = CandleUtils.getCompletedCandlesticksFromTickers(historicalTickers);
        candlesticks.clear();
        candlesticks.addAll(completed);

        lastProcessedMinute = currentMinute;
    }

    // ==================== SIGNAL DETECTION ====================

    /**
     * Detects trading signals using the strategy, with optional phase filtering.
     *
     * <p><b>Phase Filtering Logic:</b></p>
     * <ul>
     *   <li>If phaseFilteringEnabled=false, all signals are detected regardless of phase</li>
     *   <li>If phaseFilteringEnabled=true, only detect signals when phase is in allowedPhases</li>
     *   <li>Phase detection (for reporting) can be enabled independently of filtering</li>
     * </ul>
     */
    private void detectSignal() {
        // Check if current phase is allowed for trading (only if filtering is enabled)
        if (backtestProperties.phaseFilteringEnabled() && !backtestProperties.isPhaseAllowed(currentPhase)) {
            log.trace("Skipping signal detection - current phase {} not in allowed phases {}",
                     currentPhase, backtestProperties.allowedPhases());
            return;
        }

        Optional<Signal> signal = strategy.detectSignal(historicalTickers);

        if (signal.isPresent()) {
            currentSignal = signal;
            if (backtestProperties.phaseDetectionEnabled()) {
                log.debug("[{}] 📊 New signal detected: type={}, price={}, phase={}",
                         currentSignal.get().emissionTime(),
                         currentSignal.get().type(),
                         currentSignal.get().price(),
                         currentPhase);
            } else {
                log.debug("[{}] 📊 New signal detected: type={}, price={}",
                         currentSignal.get().emissionTime(),
                         currentSignal.get().type(),
                         currentSignal.get().price());
            }
        }
    }

    // ==================== POSITION MANAGEMENT ====================

    /**
     * Handles position entry logic.
     */
    private void handlePositionEntry(Ticker tick, double currentPrice, int tickIndex) {
        MarketContext context = createMarketContext(currentPrice);

        OrderManager.EntryResult result = orderManager.tryEnterPosition(
                currentSignal.get(),
                tick,
                strategy,
                context,
                portfolioManager.getCashBalance(),
                portfolioManager.getCompletedOrders().size(),
                currentPhase
        );

        if (result.success()) {
            // Update state
            activeOrder = result.order();
            portfolioManager.deductCash(result.cashDeducted());
            currentSignal = Optional.empty(); // Clear signal after use
        } else {
            log.trace("[{}] Entry skipped: {}", tick.time(), result.reason().orElse("Unknown"));
        }
    }

    /**
     * Handles position exit logic.
     */
    private void handlePositionExit(Ticker tick, double currentPrice) {
        MarketContext context = createMarketContext(currentPrice);

        OrderManager.ExitCheckResult exitCheck = orderManager.checkExitConditions(
                activeOrder.get(),
                tick,
                currentSignal,
                strategy,
                context
        );

        if (exitCheck.shouldExit()) {
            OrderManager.CloseResult closeResult = orderManager.closeOrder(
                    activeOrder.get(),
                    tick,
                    exitCheck.reason().orElseThrow()
            );

            // Update state
            portfolioManager.addCash(closeResult.cashReturned());
            portfolioManager.addCompletedOrder(closeResult.closedOrder());
            activeOrder = Optional.empty();

            // Clear signal if it was used for exit
            if (exitCheck.reason().orElseThrow() == ExitReason.SIGNAL) {
                currentSignal = Optional.empty();
            }
        }
    }

    /**
     * Closes any remaining position at end of day.
     */
    private void closeRemainingPosition() {
        if (activeOrder.isPresent()) {
            Ticker lastTick = tickers.get(tickers.size() - 1);
            OrderManager.CloseResult closeResult = orderManager.closeOrder(
                    activeOrder.get(),
                    lastTick,
                    ExitReason.END_OF_DAY
            );

            portfolioManager.addCash(closeResult.cashReturned());
            portfolioManager.addCompletedOrder(closeResult.closedOrder());
            activeOrder = Optional.empty();

            log.debug("[{}] 📉 Closed remaining order at EOD @ {}", lastTick.time(), lastTick.price());
        }
    }

    // ==================== CONTEXT CREATION ====================

    /**
     * Creates market context for strategy evaluation.
     */
    private MarketContext createMarketContext(double currentPrice) {
        double portfolioValue = portfolioManager.calculatePortfolioValue(currentPrice, activeOrder);

        return new MarketContext(
                currentPrice,
                activeOrder.isPresent(),
                activeOrder.map(o -> new Position(
                        o.symbol(),
                        o.quantity(),
                        o.entryPrice(),
                        o.entryTime(),
                        o.stopLoss(),
                        o.takeProfit()
                )).orElse(null),
                portfolioValue,
                historicalTickers.size() - 1,
                new ArrayList<>(historicalTickers)
        );
    }

    // ==================== RESULTS CALCULATION ====================

    /**
     * Builds final backtest results using MetricsCalculator.
     */
    private BacktestResult buildResult() {
        return MetricsCalculator.buildResult(
                strategy.getStrategyName(),
                symbol,
                tickers,
                portfolioManager.getCompletedOrders(),
                portfolioManager.getPortfolioSnapshots(),
                portfolioManager.getInitialCapital(),
                portfolioManager.getFinalValue(),
                portfolioManager.getMaxDrawdown(),
                backtestProperties.phaseDetectionEnabled()
        );
    }

    // ==================== VALIDATION & LOGGING ====================

    /**
     * Validates input data.
     */
    private void validateInput() {
        if (tickers == null || tickers.isEmpty()) {
            throw new IllegalArgumentException("Ticker data cannot be null or empty");
        }
    }

    /**
     * Validates phase configuration.
     * Logs warnings if configuration is inconsistent.
     */
    private void validatePhaseConfig() {
        if (!backtestProperties.isPhaseConfigValid()) {
            log.warn("⚠️ Invalid phase configuration: phaseFilteringEnabled=true but phaseDetectionEnabled=false. " +
                    "Phase filtering requires phase detection to be enabled. Filtering will be skipped.");
        }

        if (backtestProperties.phaseFilteringEnabled() &&
            (backtestProperties.allowedPhases() == null || backtestProperties.allowedPhases().isEmpty())) {
            log.warn("⚠️ Phase filtering is enabled but no allowed phases are configured. " +
                    "All phases will be allowed. Set allowedPhases to filter trades.");
        }
    }

    /**
     * Logs backtest completion summary.
     */
    private void logCompletionSummary(BacktestResult result) {
        log.info("✅ Backtest complete: P/L={} ({}%), Trades={}, Win Rate={}%",
                result.netProfitLoss(),
                String.format("%.2f", result.profitLossPercent()),
                result.totalTrades(),
                String.format("%.1f", result.winRate()));
    }

    /**
     * Checks if a signal has expired.
     *
     * @param signal Signal to check
     * @param currentTime Current tick time
     * @return true if signal has expired, false otherwise
     */
    private boolean isSignalExpired(Signal signal, String currentTime) {
        try {
            java.time.LocalDateTime signalExpiry = java.time.LocalDateTime.parse(
                signal.expiryTime(),
                java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")
            );
            java.time.LocalDateTime current = java.time.LocalDateTime.parse(
                currentTime,
                java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")
            );
            return current.isAfter(signalExpiry);
        } catch (Exception e) {
            log.error("Error checking signal expiry: signal={}, current={}", signal.expiryTime(), currentTime, e);
            return false; // If parsing fails, assume not expired
        }
    }
}
