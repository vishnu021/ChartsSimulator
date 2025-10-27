package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.backtest.MarketPhase;
import com.vish.fno.models.Candlestick;
import com.vish.fno.models.Ticker;
import com.vish.fno.utils.CandleUtils;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;

/**
 * Manages market phase detection and analysis for backtesting.
 *
 * <p><b>Responsibilities:</b></p>
 * <ul>
 *   <li>Track current market phase using Wyckoff methodology</li>
 *   <li>Maintain candlestick data for phase detection</li>
 *   <li>Filter trading signals based on allowed market phases</li>
 *   <li>Validate phase configuration settings</li>
 *   <li>Optimize phase detection by avoiding redundant calculations</li>
 * </ul>
 *
 * <p><b>Design Philosophy:</b></p>
 * <ul>
 *   <li><b>Separation of Concerns:</b> Isolates phase analysis logic from BacktestEngine</li>
 *   <li><b>Single Responsibility:</b> Handles only phase-related operations</li>
 *   <li><b>Performance:</b> Caches calculations and updates only on minute boundaries</li>
 *   <li><b>Configurability:</b> Supports independent phase detection and filtering</li>
 * </ul>
 *
 * <p><b>Usage Example:</b></p>
 * <pre>
 * PhaseAnalysisManager phaseManager = new PhaseAnalysisManager(backtestProperties);
 *
 * // Update phase for each tick
 * phaseManager.updatePhase(tick, historicalTickers);
 *
 * // Check if current phase allows trading
 * if (phaseManager.isPhaseAllowedForTrading()) {
 *     // Execute trading logic
 * }
 * </pre>
 *
 * @author ChartsSimulator
 * @since 2.3.0
 * @see PhaseDetector
 * @see BacktestProperties
 * @see MarketPhase
 */
@Slf4j
public class PhaseAnalysisManager {

    private final BacktestProperties backtestProperties;

    // Phase detection state
    @Getter
    private MarketPhase currentPhase = MarketPhase.UNKNOWN;
    private final List<Candlestick> candlesticks = new ArrayList<>();
    private String lastProcessedMinute = null;

    /**
     * Creates a new phase analysis manager.
     *
     * @param backtestProperties Backtest configuration properties
     */
    public PhaseAnalysisManager(BacktestProperties backtestProperties) {
        this.backtestProperties = backtestProperties;
    }

    // ==================== PHASE DETECTION ====================

    /**
     * Updates candlesticks and detects current market phase.
     *
     * <p><b>Optimization:</b> Only recalculates candlesticks when minute boundary changes
     * to avoid redundant processing on every tick.</p>
     *
     * @param tick Current tick data
     * @param historicalTickers All tickers up to current moment (for candlestick calculation)
     */
    public void updatePhase(Ticker tick, List<Ticker> historicalTickers) {
        if (!backtestProperties.phaseDetectionEnabled()) {
            return; // Skip if phase detection is disabled
        }

        updateCandlesticks(tick, historicalTickers);
        currentPhase = PhaseDetector.detectPhase(candlesticks, currentPhase);
    }

    /**
     * Updates candlesticks from tick data.
     * Only recalculates when minute boundary changes to avoid redundant processing.
     *
     * @param tick Current tick
     * @param historicalTickers Historical tick data for candlestick calculation
     */
    private void updateCandlesticks(Ticker tick, List<Ticker> historicalTickers) {
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

    // ==================== PHASE FILTERING ====================

    /**
     * Checks if the current market phase is allowed for trading.
     *
     * <p><b>Filtering Rules:</b></p>
     * <ul>
     *   <li>If phase filtering is disabled, all phases are allowed (returns true)</li>
     *   <li>If phase filtering is enabled, checks if current phase is in allowed list</li>
     *   <li>Phase detection must be enabled for filtering to work</li>
     * </ul>
     *
     * @return true if current phase allows trading, false otherwise
     */
    public boolean isPhaseAllowedForTrading() {
        // If filtering is disabled, allow all phases
        if (!backtestProperties.phaseFilteringEnabled()) {
            return true;
        }

        // Check if current phase is in allowed list
        return backtestProperties.isPhaseAllowed(currentPhase);
    }

    // ==================== CONFIGURATION ====================

    /**
     * Checks if phase detection is enabled.
     *
     * @return true if phase detection is enabled
     */
    public boolean isPhaseDetectionEnabled() {
        return backtestProperties.phaseDetectionEnabled();
    }

    /**
     * Checks if phase filtering is enabled.
     *
     * @return true if phase filtering is enabled
     */
    public boolean isPhaseFilteringEnabled() {
        return backtestProperties.phaseFilteringEnabled();
    }

    /**
     * Gets the list of allowed phases for trading.
     *
     * @return List of allowed phase names, empty if all phases are allowed
     */
    public List<String> getAllowedPhases() {
        return backtestProperties.allowedPhases();
    }

    // ==================== VALIDATION ====================

    /**
     * Validates phase configuration and logs warnings if inconsistent.
     *
     * <p><b>Validation Rules:</b></p>
     * <ul>
     *   <li>Phase filtering requires phase detection to be enabled</li>
     *   <li>If filtering is enabled, at least one allowed phase should be configured</li>
     * </ul>
     */
    public void validatePhaseConfig() {
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
     * Logs phase-related information for signal detection.
     *
     * @param signalTime Time when signal was detected
     * @param signalType Type of signal (BUY/SELL)
     * @param signalPrice Price at which signal was detected
     */
    public void logSignalWithPhase(String signalTime, String signalType, double signalPrice) {
        if (backtestProperties.phaseDetectionEnabled()) {
            log.debug("[{}] 📊 New signal detected: type={}, price={}, phase={}",
                     signalTime, signalType, signalPrice, currentPhase);
        } else {
            log.debug("[{}] 📊 New signal detected: type={}, price={}",
                     signalTime, signalType, signalPrice);
        }
    }

    /**
     * Gets phase filtering status message for logging.
     *
     * @return Human-readable status message
     */
    public String getPhaseFilteringStatusMessage() {
        if (backtestProperties.phaseFilteringEnabled()) {
            return "📊 Phase filtering enabled - allowed phases: " + backtestProperties.allowedPhases();
        } else if (backtestProperties.phaseDetectionEnabled()) {
            return "📊 Phase detection enabled (reporting only - no filtering)";
        } else {
            return "📊 Phase detection disabled";
        }
    }
}
