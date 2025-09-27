package com.vish.fno.ChartsSimulator.analysis.impl;

import com.vish.fno.ChartsSimulator.analysis.WyckoffPhaseAnalyzer;
import com.vish.fno.ChartsSimulator.analysis.model.WyckoffPhase;
import com.vish.fno.ChartsSimulator.model.Candle;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static java.lang.Math.*;

/**
 * Heikin Ashi + Volume + Range heuristics to label Wyckoff phases:
 *  - ACC (Accumulation) / DIST (Distribution) inside ranges (low width, low ATR, non-expanding volume)
 *  - MARKUP / MARKDOWN when HA trend up/down with expanding volume
 *  - RE-ACC / RE-DIST (mapped to MARKUP/MARKDOWN final enum or left as UNKNOWN per your enum)
 *
 * Notes:
 *  - Uses only inputs available from Candle (open/high/low/close/volume + optional time).
 *  - Heikin Ashi is for CONTEXT; do NOT use HA prices for execution.
 */
@Component
@Primary
@RequiredArgsConstructor
public class HeikinAshiWyckoffPhaseAnalyzer implements WyckoffPhaseAnalyzer {

    private final Params p;

    @Getter
    @Accessors(fluent = true)
    @Component
    @ConfigurationProperties(prefix = "wyckoff.ha")
    public static class Params {
        /** ATR period (for range detection & SL sizing if you reuse) */
        private int atrPeriod = 14;
        /** Volume EMA fast/slow for expansion check */
        private int volEmaFast = 14;
        private int volEmaSlow = 50;
        /** HA trend EMAs */
        private int haFast = 20;
        private int haSlow = 50;
        /** Range detection: lookback, width as % of price, ATR/price cap */
        private int rangeLookback = 60;
        private double rangeWidthPct = 0.006;   // ~0.6%
        private double rangeAtrRatioMax = 0.8;  // ATR/price must be below width * this
        /** Phase return window to infer prior directional context while in range */
        private int phaseReturnWindow = 50;
        /** Minimum candles to analyze */
        private int minBars = 120;
    }

    @Override
    public List<WyckoffPhase.WyckoffPhaseData> analyzeWyckoffPhases(List<Candle> candles) {
        if (candles == null || candles.size() < p.minBars()) return Collections.emptyList();

        final int n = candles.size();

        // --- Extract OHLCV arrays ---
        double[] o = new double[n], h = new double[n], l = new double[n], c = new double[n], v = new double[n];
        String[] t = new String[n];
        for (int i = 0; i < n; i++) {
            Candle cd = candles.get(i);
            o[i] = cd.open(); h[i] = cd.high(); l[i] = cd.low(); c[i] = cd.close(); v[i] = max(0d, cd.volume());
            t[i] = extractTime(cd);
        }

        // --- Heikin Ashi ---
        HA ha = heikinAshi(o, h, l, c);

        // --- Indicators ---
        double[] atr = ema(tr(h, l, c), p.atrPeriod());
        double[] volFast = ema(v, p.volEmaFast());
        double[] volSlow = ema(v, p.volEmaSlow());
        boolean[] volUp = gt(volFast, volSlow);

        double[] haClose = ha.close;
        double[] haFast = ema(haClose, p.haFast());
        double[] haSlow = ema(haClose, p.haSlow());
        boolean[] haUp = gt(haFast, haSlow);
        boolean[] haDn = lt(haFast, haSlow);

        // --- Range detection ---
        boolean[] inRange = detectRange(h, l, c, atr, p.rangeLookback(), p.rangeWidthPct(), p.rangeAtrRatioMax());

        // --- Return over window (prior context while inside range) ---
        double[] retW = ret(c, p.phaseReturnWindow());

        // --- Phase assignment per bar ---
        WyckoffPhase[] phases = new WyckoffPhase[n];
        for (int i = 0; i < n; i++) {
            WyckoffPhase ph = WyckoffPhase.UNKNOWN;

            if (inRange[i] && retW[i] < 0 && !volUp[i]) {
                ph = WyckoffPhase.ACCUMULATION;
            } else if (inRange[i] && retW[i] > 0 && !volUp[i]) {
                ph = WyckoffPhase.DISTRIBUTION;
            } else if (!inRange[i] && haUp[i] && volUp[i]) {
                ph = WyckoffPhase.MARKUP;
            } else if (!inRange[i] && haDn[i] && volUp[i]) {
                ph = WyckoffPhase.MARKDOWN;
            } else if (!inRange[i] && haUp[i] && !volUp[i]) {
                // Re-accumulation pause during up move -> map to MARKUP with lower confidence
                ph = WyckoffPhase.MARKUP;
            } else if (!inRange[i] && haDn[i] && !volUp[i]) {
                // Re-distribution pause during down move -> map to MARKDOWN with lower confidence
                ph = WyckoffPhase.MARKDOWN;
            }

            phases[i] = ph;
        }

        // --- Compress contiguous segments into WyckoffPhaseData ---
        List<WyckoffPhase.WyckoffPhaseData> segments = new ArrayList<>();
        int segStart = 0;
        for (int i = 1; i < n; i++) {
            if (phases[i] != phases[i - 1]) {
                segments.add(segment(segStart, i - 1, phases[segStart], t, haFast, haSlow, volFast, volSlow));
                segStart = i;
            }
        }
        // last segment
        segments.add(segment(segStart, n - 1, phases[segStart], t, haFast, haSlow, volFast, volSlow));

        return segments;
    }

    @Override
    public WyckoffPhase getCurrentPhase(List<Candle> candles) {
        List<WyckoffPhase.WyckoffPhaseData> all = analyzeWyckoffPhases(candles);
        if (all.isEmpty()) return WyckoffPhase.UNKNOWN;
        return all.get(all.size() - 1).phase();
    }

    @Override public String getAnalyzerName() { return "HeikinAshiWyckoffPhaseAnalyzer"; }
    @Override public String getVersion()      { return "1.0.0"; }

    // ----------------- helpers -----------------

    private WyckoffPhase.WyckoffPhaseData segment(
            int start, int end, WyckoffPhase phase, String[] t,
            double[] haFast, double[] haSlow, double[] volFast, double[] volSlow
    ) {
        // Confidence heuristic: HA slope alignment + volume trend
        double haAgree = sigmoid( (haFast[end] - haSlow[end]) / max(1e-9, abs(haSlow[end])) );
        double volAgree = volFast[end] > volSlow[end] ? 1.0 : 0.35;

        double conf = switch (phase) {
            case MARKUP -> 0.55 + 0.45 * (haAgree * volAgree);
            case MARKDOWN -> 0.55 + 0.45 * (haAgree * volAgree);
            case ACCUMULATION, DISTRIBUTION -> 0.45 + 0.25 * (1.0 - volAgree); // low volume bias
            default -> 0.35;
        };
        String st = safe(t, start, "");
        String et = safe(t, end, "");
        String desc = "Phase=" + phase.name() + " bars=" + (end - start + 1);

        return new WyckoffPhase.WyckoffPhaseData(start, end, phase, st, et, clamp(conf, 0.0, 1.0), desc);
    }

    private static double clamp(double x, double lo, double hi) { return max(lo, min(hi, x)); }
    private static double sigmoid(double x){ return 1.0 / (1.0 + exp(-x)); }
    private static String safe(String[] arr, int idx, String def){ return (idx>=0 && idx<arr.length && arr[idx]!=null)?arr[idx]:def; }

    // --- HA container
    private record HA(double[] open, double[] high, double[] low, double[] close, int[] color) {}

    private HA heikinAshi(double[] o, double[] h, double[] l, double[] c) {
        int n = o.length;
        double[] hao = new double[n], hah = new double[n], hal = new double[n], hac = new double[n];
        int[] color = new int[n];

        double prevOpen = o[0];
        double prevClose = (o[0] + h[0] + l[0] + c[0]) / 4.0;

        for (int i = 0; i < n; i++) {
            hac[i] = (o[i] + h[i] + l[i] + c[i]) / 4.0;
            hao[i] = (i == 0) ? prevOpen : (prevOpen + prevClose) / 2.0;
            hah[i] = max(h[i], max(hao[i], hac[i]));
            hal[i] = min(l[i], min(hao[i], hac[i]));
            color[i] = hac[i] >= hao[i] ? 1 : -1;

            prevOpen = hao[i];
            prevClose = hac[i];
        }
        return new HA(hao, hah, hal, hac, color);
    }

    private static double[] ema(double[] series, int period) {
        int n = series.length;
        double[] out = new double[n];
        double alpha = 2.0 / (period + 1.0);
        double e = series[0];
        out[0] = e;
        for (int i = 1; i < n; i++) {
            e = alpha * series[i] + (1 - alpha) * e;
            out[i] = e;
        }
        return out;
    }

    private static double[] tr(double[] h, double[] l, double[] c) {
        int n = c.length;
        double[] tr = new double[n];
        tr[0] = h[0] - l[0];
        for (int i = 1; i < n; i++) {
            double a = h[i] - l[i];
            double b1 = abs(h[i] - c[i - 1]);
            double b2 = abs(l[i] - c[i - 1]);
            tr[i] = max(a, max(b1, b2));
        }
        return tr;
    }

    private static boolean[] detectRange(double[] h, double[] l, double[] c, double[] atr,
                                         int lookback, double widthPct, double atrRatioMax) {
        int n = c.length;
        boolean[] out = new boolean[n];
        for (int i = lookback - 1; i < n; i++) {
            double rollMax = maxIn(h, i - lookback + 1, i);
            double rollMin = minIn(l, i - lookback + 1, i);
            double width = (rollMax - rollMin) / max(1e-9, c[i]);
            boolean narrow = width < widthPct;
            boolean lowAtr = (atr[i] / max(1e-9, c[i])) < (widthPct * atrRatioMax);
            out[i] = narrow && lowAtr;
        }
        return out;
    }

    private static double maxIn(double[] arr, int s, int e){ double m = -Double.MAX_VALUE; for(int i=s;i<=e;i++) m = max(m, arr[i]); return m; }
    private static double minIn(double[] arr, int s, int e){ double m =  Double.MAX_VALUE; for(int i=s;i<=e;i++) m = min(m, arr[i]); return m; }

    private static boolean[] gt(double[] a, double[] b){
        int n = a.length; boolean[] out = new boolean[n];
        for (int i = 0; i < n; i++) out[i] = a[i] > b[i];
        return out;
    }
    private static boolean[] lt(double[] a, double[] b){
        int n = a.length; boolean[] out = new boolean[n];
        for (int i = 0; i < n; i++) out[i] = a[i] < b[i];
        return out;
    }

    private static double[] ret(double[] c, int w){
        int n = c.length; double[] out = new double[n];
        for (int i = 0; i < n; i++) {
            int j = max(0, i - w);
            out[i] = (c[i] / max(1e-9, c[j])) - 1.0;
        }
        return out;
    }

    /**
     * Tries to read a timestamp from Candle using common getters. Falls back to ISO-instant now()/index if absent.
     */
    private static String extractTime(Candle cd) {
        try {
            for (String m : new String[]{"getTimestamp", "getTime", "getDateTime", "getTs", "getInstant"}) {
                Method method = cd.getClass().getMethod(m);
                Object val = method.invoke(cd);
                if (val instanceof Instant inst) return inst.toString();
                if (val != null) return String.valueOf(val);
            }
        } catch (Exception ignore) {}
        return ""; // safe fallback
    }
}
