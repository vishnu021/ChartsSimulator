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
 * Heikin-Ashi Wyckoff Phase Analyzer (no volume required)
 *
 * Goals:
 *  - Label MARKUP / MARKDOWN only when HA trend is confirmed (EMA-diff or HA run-length).
 *  - Label ACCUMULATION / DISTRIBUTION only inside a detected range, near the correct band,
 *    and only if structure is NOT obviously continuing (no fresh LH/LL for ACC, no HH/HL for DIST).
 *  - Smooth tiny segments to reduce flicker.
 *
 * How it avoids "all UNKNOWN":
 *  - Either EMA-diff confirmation OR HA color run-length can confirm trend (configurable).
 *  - Structure fallback: outside ranges, if still UNKNOWN, map UP to MARKUP and DOWN to MARKDOWN.
 */
@RequiredArgsConstructor
public class HeikinAshiWyckoffPhaseAnalyzer implements WyckoffPhaseAnalyzer {

    private final Params p;

    @Getter
    @Accessors(fluent = true)
    public static class Params {
        // Indicators
        private int atrPeriod = 14;
        private int haFast = 20;
        private int haSlow = 50;

        // Range detection
        private int rangeLookback = 60;
        private double rangeWidthPct = 0.006;      // 0.6% width
        private double rangeAtrRatioMax = 0.8;     // ATR/price must be below width * this

        // Inside-range position gating (0..1 from low to high)
        private double rangePosLow = 0.30;         // ACC only if pos <= 0.30
        private double rangePosHigh = 0.70;        // DIST only if pos >= 0.70

        // Trend confirmation / hysteresis
        private int trendConfirmBars = 2;          // EMA-diff needs N bars (was 3)
        private int haRunLen = 3;                  // HA color run length (was 4)
        private double trendEpsilon = 0.0;         // deadband around EMA diff

        // Prior context (for range bias)
        private int phaseReturnWindow = 50;

        // Swing structure (UP/DOWN veto)
        private int swingLookback = 5;
        private double swingMinMovePct = 0.0012;   // 0.12%

        // Smoothing
        private int minSegmentBars = 8;

        // Safety
        private int minBars = 120;
    }

    // ========= Public API =========

    @Override
    public List<WyckoffPhase.WyckoffPhaseData> analyzeWyckoffPhases(List<Candle> candles) {
        if (candles == null || candles.size() < p.minBars()) return List.of();
        final int n = candles.size();

        // Extract OHLC (no volume needed)
        double[] o = new double[n], h = new double[n], l = new double[n], c = new double[n];
        String[]  t = new String[n]; // keep empty if you don't have timestamps in Candle
        for (int i = 0; i < n; i++) {
            Candle cd = candles.get(i);
            o[i] = cd.open(); h[i] = cd.high(); l[i] = cd.low(); c[i] = cd.close();
            t[i] = ""; // if Candle has a timestamp method, populate it here
        }

        // Heikin Ashi
        HA ha = heikinAshi(o, h, l, c);
        int[] haColor = ha.color;

        // HA EMA trend and diff
        double[] fast = ema(ha.close, p.haFast());
        double[] slow = ema(ha.close, p.haSlow());
        double[] diff = new double[n]; for (int i=0;i<n;i++) diff[i] = fast[i] - slow[i];

        // Confirmation (either EMA-diff for N bars OR HA run-length)
        boolean[] upConf = multiBarConfirm(diff, +p.trendEpsilon(), p.trendConfirmBars());
        boolean[] dnConf = multiBarConfirmNeg(diff, -p.trendEpsilon(), p.trendConfirmBars());
        int[] runUp      = runLength(haColor,  1);
        int[] runDown    = runLength(haColor, -1);

        // ATR + range detection
        double[] atr = ema(tr(h,l,c), p.atrPeriod());
        boolean[] inRange = detectRange(h, l, c, atr, p.rangeLookback(), p.rangeWidthPct(), p.rangeAtrRatioMax());

        // Where are we inside the range (0..1)?
        double[] rollMax = rollingMax(h, p.rangeLookback());
        double[] rollMin = rollingMin(l, p.rangeLookback());
        double[] pos = new double[n];
        for (int i=0;i<n;i++) {
            double w = max(1e-9, rollMax[i] - rollMin[i]);
            pos[i] = clamp((c[i] - rollMin[i]) / w, 0.0, 1.0);
        }

        // Prior direction (for within-range bias)
        double[] retW = ret(c, p.phaseReturnWindow());

        // Swing structure for veto (UP/DOWN/RANGE)
        boolean[] swingHi = swingHighs(h, l, c, p.swingLookback(), p.swingMinMovePct());
        boolean[] swingLo = swingLows (h, l, c, p.swingLookback(), p.swingMinMovePct());
        Trend[] structure = classifyStructure(c, swingHi, swingLo);

        // Phase per bar
        WyckoffPhase[] phases = new WyckoffPhase[n];
        Arrays.fill(phases, WyckoffPhase.UNKNOWN);

        for (int i=0;i<n;i++) {
            boolean trendUpReady   = (upConf[i]   || runUp[i]   >= p.haRunLen())   && diff[i] >= -p.trendEpsilon();
            boolean trendDownReady = (dnConf[i]   || runDown[i] >= p.haRunLen())   && diff[i] <=  p.trendEpsilon();

            if (!inRange[i]) {
                if (trendUpReady)   { phases[i] = WyckoffPhase.MARKUP;   }
                else if (trendDownReady) { phases[i] = WyckoffPhase.MARKDOWN; }
                else {
                    // structure fallback so charts don't show large UNKNOWN zones
                    if (structure[i] == Trend.UP)      phases[i] = WyckoffPhase.MARKUP;
                    else if (structure[i] == Trend.DOWN) phases[i] = WyckoffPhase.MARKDOWN;
                    else phases[i] = WyckoffPhase.UNKNOWN;
                }
                continue;
            }

            // Inside a range: only label near the correct band and if momentum is turning
            boolean atLower = pos[i] <= p.rangePosLow();
            boolean atUpper = pos[i] >= p.rangePosHigh();

            boolean downContinuation = (structure[i] == Trend.DOWN) && trendDownReady;
            boolean upContinuation   = (structure[i] == Trend.UP)   && trendUpReady;

            boolean haTurningUp   = slope(diff, i, 3) > 0; // looser than before
            boolean haTurningDown = slope(diff, i, 3) < 0;

            if (atLower && retW[i] <= 0 && !downContinuation && haTurningUp) {
                phases[i] = WyckoffPhase.ACCUMULATION;
            } else if (atUpper && retW[i] >= 0 && !upContinuation && haTurningDown) {
                phases[i] = WyckoffPhase.DISTRIBUTION;
            } else {
                phases[i] = WyckoffPhase.UNKNOWN; // mid-box or continuation -> don't force a label
            }
        }

        // Smooth out tiny flips
        phases = smoothSegments(phases, p.minSegmentBars());

        // Build output segments
        List<WyckoffPhase.WyckoffPhaseData> out = new ArrayList<>();
        int s = 0;
        for (int i=1;i<n;i++) {
            if (phases[i] != phases[i-1]) {
                out.add(segment(s, i-1, phases[s], t, fast, slow));
                s = i;
            }
        }
        out.add(segment(s, n-1, phases[s], t, fast, slow));
        return out;
    }

    @Override
    public WyckoffPhase getCurrentPhase(List<Candle> candles) {
        var segs = analyzeWyckoffPhases(candles);
        return segs.isEmpty() ? WyckoffPhase.UNKNOWN : segs.get(segs.size()-1).phase();
    }

    @Override public String getAnalyzerName() { return "HeikinAshiWyckoffPhaseAnalyzerNoVolume"; }
    @Override public String getVersion()      { return "1.3.0"; }

    // ========= Private helpers =========

    private WyckoffPhase.WyckoffPhaseData segment(int start, int end, WyckoffPhase ph, String[] t,
                                                  double[] fast, double[] slow) {
        double haAgree = sigmoid( (fast[end] - slow[end]) / max(1e-9, abs(slow[end])) );
        double conf = switch (ph) {
            case MARKUP, MARKDOWN -> 0.60 + 0.40 * haAgree;
            case ACCUMULATION, DISTRIBUTION -> 0.55 + 0.25 * (1.0 - abs(slope(fast, end, 5)));
            default -> 0.40;
        };
        return new WyckoffPhase.WyckoffPhaseData(
                start, end, ph,
                (t[start] == null ? "" : t[start]),
                (t[end]   == null ? "" : t[end]),
                clamp(conf, 0.0, 1.0),
                "Phase=" + ph.name() + " bars=" + (end - start + 1)
        );
    }

    private static double clamp(double x, double lo, double hi){ return max(lo, min(hi, x)); }
    private static double sigmoid(double x){ return 1.0/(1.0+exp(-x)); }
    private static double slope(double[] x, int i, int w){
        int a = max(1, i - (w-1));
        return (x[i] - x[a]) / max(1, i - a);
    }

    // ===== Heikin Ashi & indicators =====
    private record HA(double[] open, double[] high, double[] low, double[] close, int[] color) {}
    private HA heikinAshi(double[] o, double[] h, double[] l, double[] c){
        int n=o.length;
        double[] hao=new double[n], hah=new double[n], hal=new double[n], hac=new double[n];
        int[] color=new int[n];
        double prevOpen=o[0], prevClose=(o[0]+h[0]+l[0]+c[0])/4.0;
        for(int i=0;i<n;i++){
            hac[i]=(o[i]+h[i]+l[i]+c[i])/4.0;
            hao[i]=(i==0)?prevOpen:(prevOpen+prevClose)/2.0;
            hah[i]=max(h[i], max(hao[i], hac[i]));
            hal[i]=min(l[i], min(hao[i], hac[i]));
            color[i]= hac[i]>=hao[i]?1:-1;
            prevOpen=hao[i]; prevClose=hac[i];
        }
        return new HA(hao,hah,hal,hac,color);
    }

    private static double[] ema(double[] s, int p){
        double[] out=new double[s.length]; double a=2.0/(p+1.0), e=s[0]; out[0]=e;
        for(int i=1;i<s.length;i++){ e=a*s[i]+(1-a)*e; out[i]=e; }
        return out;
    }

    private static double[] tr(double[] h, double[] l, double[] c){
        int n=c.length; double[] tr=new double[n]; tr[0]=h[0]-l[0];
        for(int i=1;i<n;i++){
            double A=h[i]-l[i], B=abs(h[i]-c[i-1]), C=abs(l[i]-c[i-1]);
            tr[i]=max(A, max(B,C));
        }
        return tr;
    }

    // ===== Range & extrema =====
    private static boolean[] detectRange(double[] h, double[] l, double[] c, double[] atr,
                                         int lookback, double widthPct, double atrRatioMax) {
        int n = c.length; boolean[] out = new boolean[n];
        if (n == 0 || lookback <= 1) return out;

        for (int i = lookback - 1; i < n; i++) {
            double rollMax = maxIn(h, i - lookback + 1, i);
            double rollMin = minIn(l, i - lookback + 1, i);
            double width   = (rollMax - rollMin) / max(1e-9, c[i]);
            boolean narrow = width < widthPct;
            boolean lowAtr = (atr[i] / max(1e-9, c[i])) < (widthPct * atrRatioMax);
            out[i] = narrow && lowAtr;
        }
        return out;
    }
    private static double maxIn(double[] a, int s, int e){ double m=-Double.MAX_VALUE; for(int i=s;i<=e;i++) m=max(m,a[i]); return m; }
    private static double minIn(double[] a, int s, int e){ double m= Double.MAX_VALUE; for(int i=s;i<=e;i++) m=min(m,a[i]); return m; }

    private static double[] rollingMax(double[] arr, int w){
        double[] out=new double[arr.length]; Deque<Integer> dq=new ArrayDeque<>();
        for(int i=0;i<arr.length;i++){
            while(!dq.isEmpty() && dq.peekFirst() <= i-w) dq.removeFirst();
            while(!dq.isEmpty() && arr[dq.peekLast()] <= arr[i]) dq.removeLast();
            dq.addLast(i); out[i]=arr[dq.peekFirst()];
        }
        return out;
    }
    private static double[] rollingMin(double[] arr, int w){
        double[] out=new double[arr.length]; Deque<Integer> dq=new ArrayDeque<>();
        for(int i=0;i<arr.length;i++){
            while(!dq.isEmpty() && dq.peekFirst() <= i-w) dq.removeFirst();
            while(!dq.isEmpty() && arr[dq.peekLast()] >= arr[i]) dq.removeLast();
            dq.addLast(i); out[i]=arr[dq.peekFirst()];
        }
        return out;
    }

    // ===== Structure from swings =====
    private enum Trend { UP, DOWN, RANGE, UNKNOWN }

    private static boolean[] swingHighs(double[] h, double[] l, double[] c, int lookback, double minMove){
        int n=c.length; boolean[] out=new boolean[n];
        for(int i=lookback/2;i<n-lookback/2;i++){
            double windowMax = h[i];
            for(int j=i-lookback/2;j<=i+lookback/2;j++) windowMax = max(windowMax, h[j]);
            boolean isMax = h[i] >= windowMax;
            double loPrev = l[i]; for(int j=max(0,i-lookback); j<i; j++) loPrev = min(loPrev, l[j]);
            boolean moveOk = (windowMax/max(1e-9, loPrev)) - 1.0 > minMove;
            out[i] = isMax && moveOk;
        }
        return out;
    }
    private static boolean[] swingLows(double[] h, double[] l, double[] c, int lookback, double minMove){
        int n=c.length; boolean[] out=new boolean[n];
        for(int i=lookback/2;i<n-lookback/2;i++){
            double windowMin = l[i];
            for(int j=i-lookback/2;j<=i+lookback/2;j++) windowMin = min(windowMin, l[j]);
            boolean isMin = l[i] <= windowMin;
            double hiPrev = h[i]; for(int j=max(0,i-lookback); j<i; j++) hiPrev = max(hiPrev, h[j]);
            boolean moveOk = (max(1e-9, hiPrev)/max(1e-9, windowMin)) - 1.0 > minMove;
            out[i] = isMin && moveOk;
        }
        return out;
    }
    private static Trend[] classifyStructure(double[] close, boolean[] swingHi, boolean[] swingLo){
        int n=close.length; Trend[] out=new Trend[n]; Arrays.fill(out, Trend.UNKNOWN);
        Deque<Double> highs=new ArrayDeque<>(), lows=new ArrayDeque<>();
        for(int i=0;i<n;i++){
            if(swingHi[i]){ highs.addLast(close[i]); if(highs.size()>5) highs.removeFirst(); }
            if(swingLo[i]){ lows.addLast(close[i]);  if(lows.size()>5)  lows.removeFirst(); }
            Trend lab = Trend.UNKNOWN;
            if(highs.size()>=2 && lows.size()>=2){
                double[] h2 = last2(highs), l2 = last2(lows);
                boolean HH = h2[1] > h2[0], HL = l2[1] > l2[0];
                boolean LL = l2[1] < l2[0], LH = h2[1] < h2[0];
                if (HH && HL) lab = Trend.UP;
                else if (LL && LH) lab = Trend.DOWN;
                else lab = Trend.RANGE;
            }
            out[i] = lab;
        }
        for(int i=1;i<n;i++) if(out[i]==Trend.UNKNOWN) out[i]=out[i-1];
        return out;
    }
    private static double[] last2(Deque<Double> dq){
        Iterator<Double> it=dq.iterator(); double a=Double.NaN,b=Double.NaN;
        while(it.hasNext()){ a=b; b=it.next(); }
        return new double[]{a,b};
    }

    // ===== Misc =====
    private static int[] runLength(int[] color, int target) {
        int n = color.length, run = 0; int[] out = new int[n];
        for (int i = 0; i < n; i++) { run = (color[i] == target) ? run + 1 : 0; out[i] = run; }
        return out;
    }
    private static boolean[] multiBarConfirm(double[] diff, double eps, int bars){
        int n=diff.length, run=0; boolean[] out=new boolean[n];
        for(int i=0;i<n;i++){ run = (diff[i] > eps) ? run+1 : 0; out[i] = run >= bars; }
        return out;
    }
    private static boolean[] multiBarConfirmNeg(double[] diff, double epsNeg, int bars){
        int n=diff.length, run=0; boolean[] out=new boolean[n];
        for(int i=0;i<n;i++){ run = (diff[i] < epsNeg) ? run+1 : 0; out[i] = run >= bars; }
        return out;
    }
    private static WyckoffPhase[] smoothSegments(WyckoffPhase[] raw, int minBars){
        int n=raw.length; if(n==0) return raw;
        List<int[]> segs = new ArrayList<>();
        int s=0; for(int i=1;i<n;i++){ if(raw[i]!=raw[i-1]){ segs.add(new int[]{s,i-1}); s=i; } } segs.add(new int[]{s,n-1});
        WyckoffPhase[] cur = raw.clone();
        for(int[] seg : segs){
            int a=seg[0], b=seg[1], len=b-a+1; if(len>=minBars) continue;
            int left=a-1, right=b+1;
            WyckoffPhase leftPh = left>=0?cur[left]:null, rightPh = right<n?cur[right]:null;
            WyckoffPhase target = rightPh!=null ? rightPh : (leftPh!=null ? leftPh : WyckoffPhase.UNKNOWN);
            for(int k=a;k<=b;k++) cur[k]=target;
        }
        return cur;
    }

    private static double[] ret(double[] c, int w){
        int n=c.length; double[] out=new double[n];
        for(int i=0;i<n;i++){ int j=max(0,i-w); out[i]=(c[i]/max(1e-9,c[j]))-1.0; }
        return out;
    }
}
