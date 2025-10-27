package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.Signal;
import com.vish.fno.models.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.*;
import com.vish.fno.ChartsSimulator.service.strategy.Strategy;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
 *   <li><b>PhaseAnalysisManager:</b> Manages market phase detection and filtering</li>
 *   <li><b>MetricsCalculator:</b> Computes statistics (pure functions)</li>
 * </ul>
 *
 * <p><b>Execution Flow:</b></p>
 * <ol>
 *   <li><b>Update Phase:</b> PhaseAnalysisManager detects current market phase</li>
 *   <li><b>Check Exits:</b> OrderManager checks stop/target/signals → PortfolioManager updates cash</li>
 *   <li><b>Detect Signals:</b> Strategy detects signals on growing historical data (filtered by phase if enabled)</li>
 *   <li><b>Evaluate Entry:</b> OrderManager validates entry → PortfolioManager deducts cash</li>
 *   <li><b>Record Snapshots:</b> PortfolioManager tracks portfolio value over time</li>
 *   <li><b>Calculate Results:</b> MetricsCalculator computes final metrics</li>
 * </ol>
 *
 * <p><b>Key Improvements:</b></p>
 * <ul>
 *   <li><b>2.1.0:</b> Reduced from 463 lines to ~180 lines (60% reduction)</li>
 *   <li><b>2.3.0:</b> Extracted phase logic into PhaseAnalysisManager</li>
 *   <li>Single Responsibility: Engine only orchestrates, delegates details</li>
 *   <li>Open/Closed: Easy to extend with new managers without modifying engine</li>
 *   <li>Dependency Inversion: Engine depends on abstractions (managers), not concrete implementations</li>
 *   <li>Better testability: Each manager can be tested independently</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 2.0.0
 * @version 2.3.0 - Extracted phase analysis logic into PhaseAnalysisManager
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
    private final PhaseAnalysisManager phaseManager;

    // Execution state
    private Optional<ActiveOrder> activeOrder = Optional.empty();
    private Optional<Signal> currentSignal = Optional.empty();
    private final List<Ticker> historicalTickers = new ArrayList<>();

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
        this.phaseManager = new PhaseAnalysisManager(backtestProperties);

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
        phaseManager.validatePhaseConfig();

        log.info("🚀 Starting backtest: strategy={}, tickers={}, capital={}, phaseDetection={}, phaseFiltering={}",
                strategy.getStrategyName(), tickers.size(), portfolioManager.getInitialCapital(),
                phaseManager.isPhaseDetectionEnabled(), phaseManager.isPhaseFilteringEnabled());

        log.info(phaseManager.getPhaseFilteringStatusMessage());

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

        // 1. Update phase if enabled
        phaseManager.updatePhase(tick, historicalTickers);

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
        // Check if current phase is allowed for trading
        if (!phaseManager.isPhaseAllowedForTrading()) {
            log.trace("Skipping signal detection - current phase {} not in allowed phases {}",
                     phaseManager.getCurrentPhase(), phaseManager.getAllowedPhases());
            return;
        }

        Optional<Signal> signal = strategy.detectSignal(historicalTickers);

        if (signal.isPresent()) {
            currentSignal = signal;
            phaseManager.logSignalWithPhase(
                currentSignal.get().emissionTime(),
                currentSignal.get().type().toString(),
                currentSignal.get().price()
            );
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
                phaseManager.getCurrentPhase()
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
                phaseManager.isPhaseDetectionEnabled()
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
            LocalDateTime signalExpiry = LocalDateTime.parse(
                signal.expiryTime(),
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")
            );
            java.time.LocalDateTime current = LocalDateTime.parse(
                currentTime,
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")
            );
            return current.isAfter(signalExpiry);
        } catch (Exception e) {
            log.error("Error checking signal expiry: signal={}, current={}", signal.expiryTime(), currentTime, e);
            return false; // If parsing fails, assume not expired
        }
    }
}
