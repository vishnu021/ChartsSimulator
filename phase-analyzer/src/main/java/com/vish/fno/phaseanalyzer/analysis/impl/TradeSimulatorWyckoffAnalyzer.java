package com.vish.fno.phaseanalyzer.analysis.impl;

import com.vish.fno.phaseanalyzer.analysis.WyckoffPhaseAnalyzer;
import com.vish.fno.phaseanalyzer.analysis.model.WyckoffPhase;
import com.vish.fno.phaseanalyzer.model.Candle;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;

import java.util.*;
import static java.lang.Math.*;

/**
 * Trade Simulator Wyckoff + Heikin Ashi Analyzer
 *
 * Purpose: Detect market regimes, classify Wyckoff phases, and generate trade signals
 * for 1-minute OHLCV data with entry confirmations using candlestick patterns.
 *
 * Key Features:
 * - Market Regime Detection: Trend (UP/DOWN), Range-bound, Wicky
 * - Wyckoff Phase Classification without volume
 * - Heikin Ashi smoothing for clarity
 * - Candlestick pattern recognition (Hammer, Inverted Hammer)
 * - Trade signal generation with Entry, Stop Loss, Take Profit
 */
@RequiredArgsConstructor
public class TradeSimulatorWyckoffAnalyzer implements WyckoffPhaseAnalyzer {

    private final Params p;

    @Getter
    @Accessors(fluent = true)
    public static class Params {
        // Market structure
        private int structureLookback = 20;        // Bars for HH/HL/LL/LH detection
        private double minSwingMove = 0.0015;      // 0.15% minimum move for swing

        // Range detection
        private int rangeLookback = 30;            // Bars to detect range
        private double rangeWidthPct = 0.004;      // 0.4% max width for range
        private int atrPeriod = 14;                // ATR period

        // Wicky market detection
        private double wickRatio = 0.6;            // Wick must be 60% of total candle
        private double minWickSizePct = 0.001;     // 0.1% minimum wick size

        // Heikin Ashi trend
        private int haFastEma = 9;                 // Fast EMA for HA
        private int haSlowEma = 21;                // Slow EMA for HA

        // Candlestick patterns
        private double hammerBodyRatio = 0.33;     // Body <= 33% of total range
        private double hammerWickMultiple = 2.0;   // Lower wick >= 2x body

        // Trade signals
        private double slMultiplier = 1.5;         // Stop loss ATR multiplier
        private double tpRatio = 2.0;              // Risk:Reward ratio

        // Phase detection
        private int minPhaseLength = 5;            // Minimum bars per phase
        private int trendConfirmBars = 3;          // Bars to confirm trend

        // Safety
        private int minBars = 50;                  // Minimum bars to analyze
    }

    // Market regime enumeration
    public enum MarketRegime {
        TREND_UP, TREND_DOWN, RANGE, WICKY, UNKNOWN
    }

    // Trade signal structure
    public static class TradeSignal {
        public final int barIndex;
        public final String timestamp;
        public final String type; // "LONG" or "SHORT"
        public final double entry;
        public final double stopLoss;
        public final double takeProfit;
        public final String reason;
        public final WyckoffPhase phase;
        public final MarketRegime regime;
        public final double confidence;

        public TradeSignal(int barIndex, String timestamp, String type, double entry,
                          double stopLoss, double takeProfit, String reason,
                          WyckoffPhase phase, MarketRegime regime, double confidence) {
            this.barIndex = barIndex;
            this.timestamp = timestamp;
            this.type = type;
            this.entry = entry;
            this.stopLoss = stopLoss;
            this.takeProfit = takeProfit;
            this.reason = reason;
            this.phase = phase;
            this.regime = regime;
            this.confidence = confidence;
        }
    }

    // Store trade signals for retrieval
    private final List<TradeSignal> tradeSignals = Collections.synchronizedList(new ArrayList<>());

    @Override
    public List<WyckoffPhase.WyckoffPhaseData> analyzeWyckoffPhases(List<Candle> candles) {
        if (candles == null || candles.size() < p.minBars()) return List.of();

        final int n = candles.size();
        tradeSignals.clear(); // Reset signals for new analysis

        // Extract OHLC data
        double[] open = new double[n], high = new double[n], low = new double[n], close = new double[n];
        String[] timestamps = new String[n];

        for (int i = 0; i < n; i++) {
            Candle c = candles.get(i);
            open[i] = c.open();
            high[i] = c.high();
            low[i] = c.low();
            close[i] = c.close();
            timestamps[i] = String.valueOf(i); // Use index as timestamp if not available
        }

        // Calculate Heikin Ashi
        HeikinAshi ha = calculateHeikinAshi(open, high, low, close);

        // Calculate indicators
        double[] atr = calculateATR(high, low, close, p.atrPeriod());
        double[] haFastEma = ema(ha.close, p.haFastEma());
        double[] haSlowEma = ema(ha.close, p.haSlowEma());

        // Detect market structure (HH, HL, LL, LH)
        MarketStructure[] structure = detectMarketStructure(high, low, close, p.structureLookback(), p.minSwingMove());

        // Detect market regimes
        MarketRegime[] regimes = detectMarketRegimes(open, high, low, close, atr, structure);

        // Detect candlestick patterns
        boolean[] hammers = detectHammers(open, high, low, close);
        boolean[] invertedHammers = detectInvertedHammers(open, high, low, close);

        // Classify Wyckoff phases considering regime and HA trend
        WyckoffPhase[] phases = classifyWyckoffPhases(close, ha, haFastEma, haSlowEma, structure, regimes);

        // Generate trade signals
        generateTradeSignals(open, high, low, close, atr, phases, regimes, hammers, invertedHammers, timestamps);

        // Build phase segments for output
        return buildPhaseSegments(phases, timestamps, haFastEma, haSlowEma);
    }

    @Override
    public WyckoffPhase getCurrentPhase(List<Candle> candles) {
        var segments = analyzeWyckoffPhases(candles);
        return segments.isEmpty() ? WyckoffPhase.UNKNOWN : segments.get(segments.size() - 1).phase();
    }

    @Override
    public String getAnalyzerName() {
        return "TradeSimulatorWyckoffAnalyzer";
    }

    @Override
    public String getVersion() {
        return "1.0.0";
    }

    // Get generated trade signals
    public List<TradeSignal> getTradeSignals() {
        return new ArrayList<>(tradeSignals);
    }

    // ============= Private Helper Methods =============

    private static class HeikinAshi {
        double[] open, high, low, close;
        boolean[] bullish; // true if close > open

        HeikinAshi(int size) {
            open = new double[size];
            high = new double[size];
            low = new double[size];
            close = new double[size];
            bullish = new boolean[size];
        }
    }

    private HeikinAshi calculateHeikinAshi(double[] o, double[] h, double[] l, double[] c) {
        int n = o.length;
        HeikinAshi ha = new HeikinAshi(n);

        // First candle
        ha.close[0] = (o[0] + h[0] + l[0] + c[0]) / 4.0;
        ha.open[0] = (o[0] + c[0]) / 2.0;
        ha.high[0] = h[0];
        ha.low[0] = l[0];
        ha.bullish[0] = ha.close[0] > ha.open[0];

        // Subsequent candles
        for (int i = 1; i < n; i++) {
            ha.close[i] = (o[i] + h[i] + l[i] + c[i]) / 4.0;
            ha.open[i] = (ha.open[i-1] + ha.close[i-1]) / 2.0;
            ha.high[i] = max(h[i], max(ha.open[i], ha.close[i]));
            ha.low[i] = min(l[i], min(ha.open[i], ha.close[i]));
            ha.bullish[i] = ha.close[i] > ha.open[i];
        }

        return ha;
    }

    private double[] calculateATR(double[] high, double[] low, double[] close, int period) {
        int n = close.length;
        double[] tr = new double[n];

        // Calculate True Range
        tr[0] = high[0] - low[0];
        for (int i = 1; i < n; i++) {
            double hl = high[i] - low[i];
            double hc = abs(high[i] - close[i-1]);
            double lc = abs(low[i] - close[i-1]);
            tr[i] = max(hl, max(hc, lc));
        }

        // Calculate ATR using EMA
        return ema(tr, period);
    }

    private double[] ema(double[] values, int period) {
        int n = values.length;
        double[] result = new double[n];
        double multiplier = 2.0 / (period + 1.0);

        result[0] = values[0];
        for (int i = 1; i < n; i++) {
            result[i] = values[i] * multiplier + result[i-1] * (1 - multiplier);
        }

        return result;
    }

    private enum MarketStructure {
        HIGHER_HIGH, HIGHER_LOW, LOWER_HIGH, LOWER_LOW, NONE
    }

    private MarketStructure[] detectMarketStructure(double[] high, double[] low, double[] close,
                                                   int lookback, double minMove) {
        int n = close.length;
        MarketStructure[] structure = new MarketStructure[n];
        Arrays.fill(structure, MarketStructure.NONE);

        // Find swing highs and lows
        List<Integer> swingHighs = new ArrayList<>();
        List<Integer> swingLows = new ArrayList<>();

        for (int i = lookback; i < n - lookback; i++) {
            // Check for swing high
            boolean isSwingHigh = true;
            for (int j = i - lookback; j <= i + lookback; j++) {
                if (j != i && high[j] >= high[i]) {
                    isSwingHigh = false;
                    break;
                }
            }
            if (isSwingHigh && (swingHighs.isEmpty() ||
                abs(high[i] - high[swingHighs.get(swingHighs.size()-1)]) / high[i] > minMove)) {
                swingHighs.add(i);
            }

            // Check for swing low
            boolean isSwingLow = true;
            for (int j = i - lookback; j <= i + lookback; j++) {
                if (j != i && low[j] <= low[i]) {
                    isSwingLow = false;
                    break;
                }
            }
            if (isSwingLow && (swingLows.isEmpty() ||
                abs(low[i] - low[swingLows.get(swingLows.size()-1)]) / low[i] > minMove)) {
                swingLows.add(i);
            }
        }

        // Classify structure
        for (int i = 0; i < n; i++) {
            if (swingHighs.size() >= 2 && swingLows.size() >= 2) {
                int lastHigh = swingHighs.get(swingHighs.size() - 1);
                int prevHigh = swingHighs.get(swingHighs.size() - 2);
                int lastLow = swingLows.get(swingLows.size() - 1);
                int prevLow = swingLows.get(swingLows.size() - 2);

                if (i >= lastHigh && high[lastHigh] > high[prevHigh]) {
                    structure[i] = MarketStructure.HIGHER_HIGH;
                } else if (i >= lastHigh && high[lastHigh] < high[prevHigh]) {
                    structure[i] = MarketStructure.LOWER_HIGH;
                }

                if (i >= lastLow && low[lastLow] > low[prevLow]) {
                    structure[i] = MarketStructure.HIGHER_LOW;
                } else if (i >= lastLow && low[lastLow] < low[prevLow]) {
                    structure[i] = MarketStructure.LOWER_LOW;
                }
            }
        }

        return structure;
    }

    private MarketRegime[] detectMarketRegimes(double[] open, double[] high, double[] low,
                                              double[] close, double[] atr, MarketStructure[] structure) {
        int n = close.length;
        MarketRegime[] regimes = new MarketRegime[n];
        Arrays.fill(regimes, MarketRegime.UNKNOWN);

        for (int i = p.rangeLookback(); i < n; i++) {
            // Check for wicky market
            double bodySize = abs(close[i] - open[i]);
            double totalRange = high[i] - low[i];
            double upperWick = high[i] - max(open[i], close[i]);
            double lowerWick = min(open[i], close[i]) - low[i];

            boolean isWicky = totalRange > 0 &&
                             (upperWick + lowerWick) / totalRange >= p.wickRatio() &&
                             totalRange / close[i] >= p.minWickSizePct();

            if (isWicky) {
                regimes[i] = MarketRegime.WICKY;
                continue;
            }

            // Check for range-bound
            double maxHigh = high[i];
            double minLow = low[i];
            for (int j = i - p.rangeLookback() + 1; j < i; j++) {
                maxHigh = max(maxHigh, high[j]);
                minLow = min(minLow, low[j]);
            }
            double rangeWidth = (maxHigh - minLow) / close[i];
            boolean isRange = rangeWidth < p.rangeWidthPct() &&
                            atr[i] / close[i] < p.rangeWidthPct() * 0.5;

            if (isRange) {
                regimes[i] = MarketRegime.RANGE;
                continue;
            }

            // Check for trending
            boolean hasHH = false, hasHL = false, hasLL = false, hasLH = false;
            for (int j = max(0, i - p.structureLookback()); j <= i; j++) {
                if (structure[j] == MarketStructure.HIGHER_HIGH) hasHH = true;
                if (structure[j] == MarketStructure.HIGHER_LOW) hasHL = true;
                if (structure[j] == MarketStructure.LOWER_LOW) hasLL = true;
                if (structure[j] == MarketStructure.LOWER_HIGH) hasLH = true;
            }

            if (hasHH && hasHL) {
                regimes[i] = MarketRegime.TREND_UP;
            } else if (hasLL && hasLH) {
                regimes[i] = MarketRegime.TREND_DOWN;
            } else {
                regimes[i] = MarketRegime.UNKNOWN;
            }
        }

        return regimes;
    }

    private boolean[] detectHammers(double[] open, double[] high, double[] low, double[] close) {
        int n = close.length;
        boolean[] hammers = new boolean[n];

        for (int i = 0; i < n; i++) {
            double body = abs(close[i] - open[i]);
            double totalRange = high[i] - low[i];
            double lowerWick = min(open[i], close[i]) - low[i];
            double upperWick = high[i] - max(open[i], close[i]);

            if (totalRange > 0) {
                boolean smallBody = body / totalRange <= p.hammerBodyRatio();
                boolean longLowerWick = lowerWick >= body * p.hammerWickMultiple();
                boolean smallUpperWick = upperWick < body;

                hammers[i] = smallBody && longLowerWick && smallUpperWick;
            }
        }

        return hammers;
    }

    private boolean[] detectInvertedHammers(double[] open, double[] high, double[] low, double[] close) {
        int n = close.length;
        boolean[] invHammers = new boolean[n];

        for (int i = 0; i < n; i++) {
            double body = abs(close[i] - open[i]);
            double totalRange = high[i] - low[i];
            double upperWick = high[i] - max(open[i], close[i]);
            double lowerWick = min(open[i], close[i]) - low[i];

            if (totalRange > 0) {
                boolean smallBody = body / totalRange <= p.hammerBodyRatio();
                boolean longUpperWick = upperWick >= body * p.hammerWickMultiple();
                boolean smallLowerWick = lowerWick < body;

                invHammers[i] = smallBody && longUpperWick && smallLowerWick;
            }
        }

        return invHammers;
    }

    private WyckoffPhase[] classifyWyckoffPhases(double[] close, HeikinAshi ha,
                                                double[] haFast, double[] haSlow,
                                                MarketStructure[] structure, MarketRegime[] regimes) {
        int n = close.length;
        WyckoffPhase[] phases = new WyckoffPhase[n];
        Arrays.fill(phases, WyckoffPhase.UNKNOWN);

        for (int i = p.minPhaseLength(); i < n; i++) {
            MarketRegime regime = regimes[i];
            boolean haUptrend = haFast[i] > haSlow[i];
            boolean haDowntrend = haFast[i] < haSlow[i];

            // Count consecutive HA bullish/bearish candles
            int bullishRun = 0, bearishRun = 0;
            for (int j = max(0, i - p.trendConfirmBars()); j <= i; j++) {
                if (ha.bullish[j]) bullishRun++;
                else bearishRun++;
            }

            // Look at prior trend for context
            double priorMove = (close[i] - close[max(0, i - 20)]) / close[max(0, i - 20)];
            boolean afterUpMove = priorMove > 0.002;  // 0.2% up
            boolean afterDownMove = priorMove < -0.002; // 0.2% down

            // Classify phases based on regime and context
            if (regime == MarketRegime.TREND_UP && haUptrend) {
                phases[i] = WyckoffPhase.MARKUP;
            } else if (regime == MarketRegime.TREND_DOWN && haDowntrend) {
                phases[i] = WyckoffPhase.MARKDOWN;
            } else if (regime == MarketRegime.RANGE) {
                if (afterDownMove && !haDowntrend) {
                    phases[i] = WyckoffPhase.ACCUMULATION;
                } else if (afterUpMove && !haUptrend) {
                    phases[i] = WyckoffPhase.DISTRIBUTION;
                } else if (haUptrend && bullishRun >= p.trendConfirmBars()) {
                    // Re-accumulation during range (treat as early markup)
                    phases[i] = WyckoffPhase.MARKUP;
                } else if (haDowntrend && bearishRun >= p.trendConfirmBars()) {
                    // Re-distribution during range (treat as early markdown)
                    phases[i] = WyckoffPhase.MARKDOWN;
                } else {
                    phases[i] = WyckoffPhase.UNKNOWN;
                }
            } else if (regime == MarketRegime.WICKY) {
                // Wicky markets often indicate indecision/reversal zones
                if (afterUpMove) {
                    phases[i] = WyckoffPhase.DISTRIBUTION;
                } else if (afterDownMove) {
                    phases[i] = WyckoffPhase.ACCUMULATION;
                }
            } else {
                // For unknown regimes, use HA trend
                if (haUptrend && bullishRun >= p.trendConfirmBars()) {
                    phases[i] = WyckoffPhase.MARKUP;
                } else if (haDowntrend && bearishRun >= p.trendConfirmBars()) {
                    phases[i] = WyckoffPhase.MARKDOWN;
                }
            }
        }

        // Smooth phases to reduce noise
        smoothPhases(phases, p.minPhaseLength());

        return phases;
    }

    private void smoothPhases(WyckoffPhase[] phases, int minLength) {
        int n = phases.length;

        // First pass: remove single-bar phases
        for (int i = 1; i < n - 1; i++) {
            if (phases[i] != phases[i-1] && phases[i] != phases[i+1]) {
                phases[i] = phases[i-1];
            }
        }

        // Second pass: extend small segments
        int start = 0;
        while (start < n) {
            int end = start;
            while (end < n && phases[end] == phases[start]) end++;

            int length = end - start;
            if (length < minLength && length > 0) {
                // Try to merge with neighbors
                WyckoffPhase prevPhase = start > 0 ? phases[start-1] : WyckoffPhase.UNKNOWN;
                WyckoffPhase nextPhase = end < n ? phases[end] : WyckoffPhase.UNKNOWN;

                WyckoffPhase mergePhase = prevPhase != WyckoffPhase.UNKNOWN ? prevPhase : nextPhase;
                if (mergePhase != WyckoffPhase.UNKNOWN) {
                    for (int i = start; i < end; i++) {
                        phases[i] = mergePhase;
                    }
                }
            }

            start = end;
        }
    }

    private void generateTradeSignals(double[] open, double[] high, double[] low, double[] close,
                                     double[] atr, WyckoffPhase[] phases, MarketRegime[] regimes,
                                     boolean[] hammers, boolean[] invHammers, String[] timestamps) {
        int n = close.length;

        for (int i = 1; i < n; i++) {
            WyckoffPhase phase = phases[i];
            WyckoffPhase prevPhase = phases[i-1];
            MarketRegime regime = regimes[i];

            // Phase transition signals
            boolean phaseChanged = phase != prevPhase && phase != WyckoffPhase.UNKNOWN;

            // Long signal conditions
            boolean longSignal = false;
            String longReason = "";

            // Long: Accumulation to Markup with hammer confirmation
            if (phase == WyckoffPhase.MARKUP && prevPhase == WyckoffPhase.ACCUMULATION && hammers[i]) {
                longSignal = true;
                longReason = "Accumulation to Markup + Hammer";
            }
            // Long: Hammer in accumulation zone
            else if (phase == WyckoffPhase.ACCUMULATION && hammers[i]) {
                longSignal = true;
                longReason = "Hammer in Accumulation";
            }
            // Long: Trend up regime with phase confirmation
            else if (regime == MarketRegime.TREND_UP && phase == WyckoffPhase.MARKUP && phaseChanged) {
                longSignal = true;
                longReason = "Uptrend + Markup Phase";
            }

            // Short signal conditions
            boolean shortSignal = false;
            String shortReason = "";

            // Short: Distribution to Markdown with inverted hammer
            if (phase == WyckoffPhase.MARKDOWN && prevPhase == WyckoffPhase.DISTRIBUTION && invHammers[i]) {
                shortSignal = true;
                shortReason = "Distribution to Markdown + Inverted Hammer";
            }
            // Short: Inverted hammer in distribution zone
            else if (phase == WyckoffPhase.DISTRIBUTION && invHammers[i]) {
                shortSignal = true;
                shortReason = "Inverted Hammer in Distribution";
            }
            // Short: Trend down regime with phase confirmation
            else if (regime == MarketRegime.TREND_DOWN && phase == WyckoffPhase.MARKDOWN && phaseChanged) {
                shortSignal = true;
                shortReason = "Downtrend + Markdown Phase";
            }

            // Generate trade signal
            if (longSignal) {
                double entry = close[i];
                double stopLoss = low[i] - atr[i] * p.slMultiplier();
                double risk = entry - stopLoss;
                double takeProfit = entry + risk * p.tpRatio();

                double confidence = calculateConfidence(phase, regime, true, hammers[i]);

                TradeSignal signal = new TradeSignal(
                    i, timestamps[i], "LONG", entry, stopLoss, takeProfit,
                    longReason, phase, regime, confidence
                );
                tradeSignals.add(signal);
            } else if (shortSignal) {
                double entry = close[i];
                double stopLoss = high[i] + atr[i] * p.slMultiplier();
                double risk = stopLoss - entry;
                double takeProfit = entry - risk * p.tpRatio();

                double confidence = calculateConfidence(phase, regime, false, invHammers[i]);

                TradeSignal signal = new TradeSignal(
                    i, timestamps[i], "SHORT", entry, stopLoss, takeProfit,
                    shortReason, phase, regime, confidence
                );
                tradeSignals.add(signal);
            }
        }
    }

    private double calculateConfidence(WyckoffPhase phase, MarketRegime regime,
                                      boolean isLong, boolean hasPattern) {
        double confidence = 0.5; // Base confidence

        // Phase alignment
        if (isLong && (phase == WyckoffPhase.MARKUP || phase == WyckoffPhase.ACCUMULATION)) {
            confidence += 0.15;
        } else if (!isLong && (phase == WyckoffPhase.MARKDOWN || phase == WyckoffPhase.DISTRIBUTION)) {
            confidence += 0.15;
        }

        // Regime alignment
        if (isLong && regime == MarketRegime.TREND_UP) {
            confidence += 0.2;
        } else if (!isLong && regime == MarketRegime.TREND_DOWN) {
            confidence += 0.2;
        } else if (regime == MarketRegime.RANGE) {
            confidence += 0.1; // Range trading confidence
        }

        // Pattern confirmation
        if (hasPattern) {
            confidence += 0.15;
        }

        return min(0.95, confidence);
    }

    private List<WyckoffPhase.WyckoffPhaseData> buildPhaseSegments(WyckoffPhase[] phases,
                                                                  String[] timestamps,
                                                                  double[] haFast, double[] haSlow) {
        List<WyckoffPhase.WyckoffPhaseData> segments = new ArrayList<>();
        int n = phases.length;
        if (n == 0) return segments;

        int segmentStart = 0;
        for (int i = 1; i < n; i++) {
            if (phases[i] != phases[i-1]) {
                segments.add(createPhaseData(segmentStart, i-1, phases[segmentStart],
                                           timestamps, haFast, haSlow));
                segmentStart = i;
            }
        }

        // Add final segment
        segments.add(createPhaseData(segmentStart, n-1, phases[segmentStart],
                                    timestamps, haFast, haSlow));

        return segments;
    }

    private WyckoffPhase.WyckoffPhaseData createPhaseData(int start, int end, WyckoffPhase phase,
                                                         String[] timestamps,
                                                         double[] haFast, double[] haSlow) {
        // Calculate confidence based on HA trend alignment
        double trendStrength = abs(haFast[end] - haSlow[end]) / max(0.001, abs(haSlow[end]));
        double confidence = 0.5 + min(0.4, trendStrength * 10);

        // Add trade signal count to description
        int signalCount = 0;
        for (TradeSignal signal : tradeSignals) {
            if (signal.barIndex >= start && signal.barIndex <= end) {
                signalCount++;
            }
        }

        String description = String.format("%s phase (%d bars, %d signals)",
                                          phase.name(), end - start + 1, signalCount);

        return new WyckoffPhase.WyckoffPhaseData(
            start, end, phase,
            timestamps[start], timestamps[end],
            confidence, description
        );
    }
}
