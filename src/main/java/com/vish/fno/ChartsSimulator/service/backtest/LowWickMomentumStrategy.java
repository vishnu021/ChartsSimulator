package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.Candlestick;
import com.vish.fno.ChartsSimulator.model.SignificantMove;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.MarketContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Low Wick Momentum Strategy - Trades strong buying pressure candles.
 *
 * <p><b>Algorithm Description:</b></p>
 * This strategy identifies candles with minimal upper wick (less than 5%), which indicates
 * strong buying pressure with no rejection at higher prices. When buyers dominate and push
 * price near the high without sellers stepping in, it signals potential continuation.
 *
 * <p><b>Signal Detection Logic:</b></p>
 * <ol>
 *   <li>Convert tick data to 1-minute candlesticks (OHLC)</li>
 *   <li>When candle completes, calculate upper wick percentage</li>
 *   <li>Upper Wick % = ((High - Close) / Close) × 100</li>
 *   <li>If upper wick < 5%, generate buy signal (strong momentum)</li>
 *   <li>Entry at candle close price (last price of the minute)</li>
 * </ol>
 *
 * <p><b>Entry Rules:</b></p>
 * <ul>
 *   <li>Candle closes with upper wick less than 5% of close price</li>
 *   <li>Indicates strong buying pressure (no rejection at highs)</li>
 *   <li>Entry at candle close price</li>
 *   <li>Only enter if no position is currently open</li>
 * </ul>
 *
 * <p><b>Exit Rules:</b></p>
 * <ul>
 *   <li><b>Stop Loss:</b> Below candle's low (support level where buyers entered)</li>
 *   <li><b>Take Profit:</b> Entry + 2× risk (risk-reward ratio 1:2)</li>
 *   <li>Example: Entry @ 100, Low @ 98 → Risk = 2 → Target = 100 + 2×2 = 104</li>
 * </ul>
 *
 * <p><b>Parameters:</b></p>
 * <ul>
 *   <li>maxUpperWickPercent: 5.0% - Maximum upper wick allowed for signal</li>
 *   <li>riskRewardRatio: 2.0 - Target is 2× the risk (1:2 R:R)</li>
 *   <li>minCandleBody: 0.1% - Minimum body size to avoid doji candles</li>
 * </ul>
 *
 * <p><b>Candle Anatomy Example:</b></p>
 * <pre>
 * High:  105  ─┐
 *            │ │ Upper Wick (105-103=2)
 * Close: 103 ─┤ ┐
 *            │ │ │ Body (103-99=4)
 * Open:   99 ─┘ │
 *            │   │ Lower Wick (99-97=2)
 * Low:    97  ─┘
 *
 * Upper Wick % = (105-103)/103 × 100 = 1.94%  ✅ < 5% → BUY SIGNAL
 * </pre>
 *
 * <p><b>Pattern Example:</b></p>
 * <pre>
 * Time:    9:20    9:21    9:22    9:23
 * OHLC:    99/102  102/105 105/107 107/110
 *          /100    /104    /106    /108
 *
 * Candle @ 9:21: High=105, Close=104
 * Upper Wick = (105-104)/104 × 100 = 0.96% ✅ < 5%
 *
 * BUY SIGNAL @ 104
 * Stop: 102 (candle low) → Risk = 2 points
 * Target: 104 + 2×2 = 108 → R:R = 1:2
 * </pre>
 *
 * <p><b>Strategy Characteristics:</b></p>
 * <ul>
 *   <li>Type: Momentum / Trend Following</li>
 *   <li>Best For: Trending markets with strong directional moves</li>
 *   <li>Signal Quality: High frequency (many signals per day)</li>
 *   <li>Holding Period: Short term (minutes to hours)</li>
 *   <li>Risk-Reward: Fixed 1:2 ratio (50% win rate = breakeven)</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 2.1.0
 * @version 1.0.0
 * @see Strategy
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LowWickMomentumStrategy implements Strategy {

    private final BacktestProperties backtestProperties;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    // Strategy parameters
    private static final double MAX_UPPER_WICK_PERCENT = 5.0;  // Max 5% upper wick
    private static final double RISK_REWARD_RATIO = 2.0;       // Target = 2× risk (1:2)
    private static final double MIN_CANDLE_BODY_PERCENT = 0.1; // Min 0.1% body to avoid doji

    // Stateful caching (cleared on reset())
    private final List<Candlestick> candlesticks = new ArrayList<>();
    private int lastProcessedTickIndex = -1;
    private Candlestick currentCandle = null;
    private String lastProcessedMinute = null;

    // Track last signal's candle to avoid duplicate signals
    private SignalState lastSignalState = null;

    // Runtime override fields
    private Double stopLossPercentOverride;
    private Double takeProfitPercentOverride;

    /**
     * Internal record to track signal state for stop/target calculation.
     */
    private record SignalState(
        Candlestick signalCandle,
        double entryPrice,
        double stopPrice,
        double targetPrice,
        String signalTime
    ) {}

    @Override
    public void reset() {
        candlesticks.clear();
        lastProcessedTickIndex = -1;
        currentCandle = null;
        lastProcessedMinute = null;
        lastSignalState = null;
        stopLossPercentOverride = null;
        takeProfitPercentOverride = null;
        log.debug("LowWickMomentumStrategy state reset");
    }

    @Override
    public List<SignificantMove> detectSignals(List<Ticker> tickers, double threshold) {
        if (tickers == null || tickers.isEmpty()) {
            return List.of();
        }

        // Process only new tickers to build candlesticks incrementally
        updateCandlesticks(tickers);

        // Detect low wick momentum signals from completed candles
        return detectLowWickSignals(tickers);
    }

    /**
     * Incrementally builds 1-minute candlesticks from tick data.
     */
    private void updateCandlesticks(List<Ticker> tickers) {
        // Only process new tickers since last call
        for (int i = lastProcessedTickIndex + 1; i < tickers.size(); i++) {
            Ticker tick = tickers.get(i);
            String minute = getMinuteKey(tick.time());

            if (!minute.equals(lastProcessedMinute)) {
                // New minute - finalize current candle and start new one
                if (currentCandle != null) {
                    candlesticks.add(currentCandle);
                    log.trace("Finalized candle: {} | O:{} H:{} L:{} C:{} | Body:{}% UpperWick:{}%",
                        currentCandle.timestamp(),
                        String.format("%.2f", currentCandle.open()),
                        String.format("%.2f", currentCandle.high()),
                        String.format("%.2f", currentCandle.low()),
                        String.format("%.2f", currentCandle.close()),
                        String.format("%.2f", calculateBodyPercent(currentCandle)),
                        String.format("%.2f", calculateUpperWickPercent(currentCandle)));
                }
                currentCandle = Candlestick.create(minute, tick.price());
                lastProcessedMinute = minute;
            } else {
                // Same minute - update current candle
                currentCandle = currentCandle.update(tick.price());
            }

            lastProcessedTickIndex = i;
        }
    }

    /**
     * Detects low upper wick candles and generates momentum signals.
     */
    private List<SignificantMove> detectLowWickSignals(List<Ticker> tickers) {
        if (candlesticks.isEmpty()) {
            return List.of();
        }

        List<SignificantMove> signals = new ArrayList<>();
        Ticker currentTick = tickers.get(tickers.size() - 1);

        // Check the most recently completed candle (not the current forming one)
        // We need at least 1 completed candle
        if (candlesticks.isEmpty()) {
            return List.of();
        }

        Candlestick lastCompletedCandle = candlesticks.get(candlesticks.size() - 1);

        // Avoid duplicate signals - only check if this candle hasn't generated signal yet
        if (lastSignalState != null && lastSignalState.signalCandle.timestamp().equals(lastCompletedCandle.timestamp())) {
            return List.of(); // Already generated signal for this candle
        }

        // Calculate upper wick percentage
        double upperWickPercent = calculateUpperWickPercent(lastCompletedCandle);
        double bodyPercent = calculateBodyPercent(lastCompletedCandle);

        // Check if candle meets criteria
        if (upperWickPercent < MAX_UPPER_WICK_PERCENT && bodyPercent > MIN_CANDLE_BODY_PERCENT) {
            // Strong momentum candle! Generate buy signal
            double entryPrice = lastCompletedCandle.close();
            double stopPrice = lastCompletedCandle.low();
            double risk = entryPrice - stopPrice;
            double targetPrice = entryPrice + (risk * RISK_REWARD_RATIO);

            // Calculate as percentages for BacktestEngine
            double stopPercent = ((entryPrice - stopPrice) / entryPrice) * 100.0;
            double targetPercent = ((targetPrice - entryPrice) / entryPrice) * 100.0;

            // Store signal state for stop/target calculation
            lastSignalState = new SignalState(
                lastCompletedCandle,
                entryPrice,
                stopPrice,
                targetPrice,
                currentTick.time()
            );

            log.info("[{}] 🎯 LOW WICK SIGNAL: Candle closed @ {} with only {}% upper wick (max {}%). Entry: {}, Stop: {} ({}%), Target: {} ({}%), R:R = 1:{}",
                currentTick.time(),
                String.format("%.2f", entryPrice),
                String.format("%.2f", upperWickPercent),
                MAX_UPPER_WICK_PERCENT,
                String.format("%.2f", entryPrice),
                String.format("%.2f", stopPrice),
                String.format("%.2f", stopPercent),
                String.format("%.2f", targetPrice),
                String.format("%.2f", targetPercent),
                String.format("%.1f", RISK_REWARD_RATIO));

            // Generate signal
            signals.add(new SignificantMove(
                lastCompletedCandle.timestamp(),  // Candle timestamp
                currentTick.time(),               // Signal emission time
                entryPrice,                       // Entry at candle close
                "dip",                           // Buy signal
                upperWickPercent                 // Store wick % for analysis
            ));
        }

        return signals;
    }

    /**
     * Calculates upper wick percentage.
     * Upper Wick % = ((High - Close) / Close) × 100
     */
    private double calculateUpperWickPercent(Candlestick candle) {
        if (candle.close() == 0) return 0.0;
        double upperWick = candle.high() - candle.close();
        return (upperWick / candle.close()) * 100.0;
    }

    /**
     * Calculates candle body percentage.
     * Body % = |Close - Open| / Close × 100
     */
    private double calculateBodyPercent(Candlestick candle) {
        if (candle.close() == 0) return 0.0;
        double body = Math.abs(candle.close() - candle.open());
        return (body / candle.close()) * 100.0;
    }

    /**
     * Extracts minute-level timestamp from full timestamp.
     * Example: "2025-10-01 09:25:14.123" → "2025-10-01 09:25:00.000"
     */
    private String getMinuteKey(String timestamp) {
        LocalDateTime dt = LocalDateTime.parse(timestamp, FORMATTER);
        return dt.withSecond(0).withNano(0).format(FORMATTER);
    }

    @Override
    public String getStrategyName() {
        return "low-wick-momentum";
    }

    @Override
    public Map<String, Object> getParameters() {
        return Map.of(
            "maxUpperWickPercent", MAX_UPPER_WICK_PERCENT,
            "riskRewardRatio", RISK_REWARD_RATIO,
            "minCandleBodyPercent", MIN_CANDLE_BODY_PERCENT
        );
    }

    @Override
    public boolean shouldBuy(SignificantMove signal, MarketContext context) {
        if (context.hasOpenPosition()) {
            log.trace("Skipping buy signal - position already open");
            return false;
        }

        boolean isDip = "dip".equalsIgnoreCase(signal.type());
        if (isDip && lastSignalState != null) {
            log.debug("[{}] 📊 Buy signal confirmed @ {} | Upper wick: {}% | Stop: {}, Target: {}",
                signal.emissionTime(),
                String.format("%.2f", lastSignalState.entryPrice),
                String.format("%.2f", signal.magnitude()),
                String.format("%.2f", lastSignalState.stopPrice),
                String.format("%.2f", lastSignalState.targetPrice));
        }
        return isDip;
    }

    @Override
    public boolean shouldSell(SignificantMove signal, MarketContext context) {
        // This strategy only generates buy signals
        // Exits are handled by stop loss / take profit
        return false;
    }

    @Override
    public int calculatePositionSize(double capital, double price, double riskPercent) {
        int lotSize = backtestProperties.lotSize();

        if (backtestProperties.fixedQuantity() > 0) {
            int quantity = backtestProperties.fixedQuantity();
            quantity = (quantity / lotSize) * lotSize;
            log.debug("Position size: {} shares (FIXED quantity, lot size {})", quantity, lotSize);
            return quantity;
        }

        double positionPercent = backtestProperties.positionSizePercent();
        double riskCapital = capital * (positionPercent / 100.0);
        int quantity = (int) Math.floor(riskCapital / price);
        quantity = (quantity / lotSize) * lotSize;

        log.debug("Position size: {} shares (capital: {}, price: {}, position%: {}%, lot size: {})",
            quantity, capital, price, positionPercent, lotSize);
        return quantity;
    }

    @Override
    public double getStopLossPercent() {
        if (stopLossPercentOverride != null) {
            return stopLossPercentOverride;
        }

        // Calculate stop loss based on last signal state if available
        if (lastSignalState != null) {
            double entryPrice = lastSignalState.entryPrice;
            double stopPrice = lastSignalState.stopPrice;
            double stopPercent = ((entryPrice - stopPrice) / entryPrice) * 100.0;

            log.debug("Dynamic stop loss: entry={}, stop={}, percent={}%",
                entryPrice, stopPrice, String.format("%.2f", stopPercent));
            return stopPercent;
        }

        return backtestProperties.stopLossPercent();
    }

    @Override
    public void setStopLossPercent(double stopLossPercent) {
        this.stopLossPercentOverride = stopLossPercent;
        log.debug("Stop loss percent overridden to {}%", stopLossPercent);
    }

    @Override
    public double getTakeProfitPercent() {
        if (takeProfitPercentOverride != null) {
            return takeProfitPercentOverride;
        }

        // Calculate target based on last signal state if available
        if (lastSignalState != null) {
            double entryPrice = lastSignalState.entryPrice;
            double targetPrice = lastSignalState.targetPrice;
            double targetPercent = ((targetPrice - entryPrice) / entryPrice) * 100.0;

            log.debug("Dynamic take profit: entry={}, target={}, percent={}%",
                entryPrice, targetPrice, String.format("%.2f", targetPercent));
            return targetPercent;
        }

        return backtestProperties.takeProfitPercent();
    }

    @Override
    public void setTakeProfitPercent(double takeProfitPercent) {
        this.takeProfitPercentOverride = takeProfitPercent;
        log.debug("Take profit percent overridden to {}%", takeProfitPercent);
    }
}
