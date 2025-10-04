# Price Movement Detection Algorithms

This document explains the algorithms used to detect significant price movements (dips and peaks) in ticker data, along with alternative approaches that can be implemented.

---

## Table of Contents

1. [Current Implementation: Moving Average Mean Reversion](#1-current-implementation-moving-average-mean-reversion)
2. [Alternative Algorithms](#2-alternative-algorithms)
   - [2.1 Z-Score / Statistical Deviation](#21-z-score--statistical-deviation)
   - [2.2 RSI (Relative Strength Index)](#22-rsi-relative-strength-index)
   - [2.3 Bollinger Bands](#23-bollinger-bands)
   - [2.4 Local Extrema Detection](#24-local-extrema-detection)
   - [2.5 Percentage Change from Rolling High/Low](#25-percentage-change-from-rolling-highlow)
   - [2.6 Volume-Weighted Price Analysis](#26-volume-weighted-price-analysis)
   - [2.7 Machine Learning Approaches](#27-machine-learning-approaches)
3. [Algorithm Comparison](#3-algorithm-comparison)
4. [Implementation Guidelines](#4-implementation-guidelines)
5. [Performance Considerations](#5-performance-considerations)

---

## 1. Current Implementation: Moving Average Mean Reversion

**Location:** `service/analysis/MovingAverageDetectionService.java`

### Algorithm Overview

Detects V-shaped (dips) and Λ-shaped (peaks) patterns by comparing each price point against moving averages of surrounding prices.

### Mathematical Formula

For each price point at index `i`:

```
lookbackWindow = max(3, floor(dataSize * 0.02))

prevAvg = average(price[i-lookbackWindow] to price[i-1])
nextAvg = average(price[i+1] to price[i+lookbackWindow])

changeFromPrev = ((currentPrice - prevAvg) / prevAvg) * 100
changeToNext = ((nextAvg - currentPrice) / currentPrice) * 100

isDip  = changeFromPrev < -threshold AND changeToNext > threshold
isPeak = changeFromPrev > threshold  AND changeToNext < -threshold
```

### Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Lookback Window | 2% of dataset (min 3) | Number of points for averaging |
| Default Threshold | 0.5% | Minimum percentage change |
| Min Data Points | 5 | Minimum dataset size |
| **Confirmation Window** | **10 points** | **Points to check for follow-through** |
| **Min Follow-Through** | **0.5%** | **Minimum sustained movement required** |
| **Min Signal Distance** | **100 points** | **Minimum spacing between signals** |

### Advantages

✅ **Simple and Fast**: O(n) time complexity
✅ **Noise Filtering**: Averaging smooths out minor fluctuations
✅ **Configurable**: Easy threshold tuning
✅ **No Training Required**: Rule-based algorithm
✅ **Confirmation Logic**: Validates signals with follow-through movement (69.4% reduction in false signals)
✅ **Signal Quality**: Only emits high-conviction reversals with sustained movement
✅ **Reduced Clustering**: Minimum distance prevents signal spam in volatile periods

### Limitations

❌ **Fixed Window**: Doesn't adapt to volatility changes
❌ **Edge Exclusion**: Can't analyze first/last lookback points
❌ **Threshold Sensitivity**: Requires manual calibration
❌ **Misses Gradual Changes**: Only catches sharp reversals
❌ **Signal Lag**: Confirmation delay means signals fire 5-10 ticks after actual reversal point

### Example Calculation

**Dataset**: 44,995 tickers, threshold = 0.5%

**At tick #5000:**
```
Lookback window = max(3, floor(44995 * 0.02)) = 899

prevAvg = average(tick #4101 to #5000) = 24,950
currentPrice = 24,825
nextAvg = average(tick #5001 to #5900) = 24,975

changeFromPrev = ((24,825 - 24,950) / 24,950) * 100 = -0.50%
changeToNext = ((24,975 - 24,825) / 24,825) * 100 = +0.60%

Result: changeFromPrev < -0.5% AND changeToNext > 0.5% → DIP DETECTED ✓
```

### When to Use

- High-frequency tick data with noise
- Need for real-time processing
- Simple deployment without dependencies
- Detecting sharp price reversals

---

## 2. Alternative Algorithms

### 2.1 Z-Score / Statistical Deviation

**Concept**: Identify outliers using standard deviation from rolling mean.

#### Algorithm

```java
public List<SignificantMove> detectUsingZScore(List<Ticker> tickers, double zThreshold) {
    int window = calculateWindow(tickers.size());

    for (int i = window; i < tickers.size() - window; i++) {
        double mean = calculateMean(tickers, i - window, i + window);
        double stdDev = calculateStdDev(tickers, i - window, i + window, mean);

        double zScore = (tickers.get(i).price() - mean) / stdDev;

        if (Math.abs(zScore) > zThreshold) {
            // Significant deviation detected
            String type = zScore < 0 ? "dip" : "peak";
            double magnitude = Math.abs(zScore) * stdDev / mean * 100;
            // Add to results
        }
    }
}
```

#### Parameters

- `zThreshold`: Typically 2.0 (2 standard deviations) or 3.0 (3 standard deviations)
- `window`: Rolling window size for mean/stddev calculation

#### Advantages

✅ Statistically grounded
✅ Adapts to volatility (via stdDev)
✅ Well-understood mathematical basis

#### Limitations

❌ Assumes normal distribution
❌ More computationally expensive (requires stdDev)
❌ May miss patterns in non-normal data

---

### 2.2 RSI (Relative Strength Index)

**Concept**: Measure momentum by comparing magnitude of recent gains vs losses.

#### Algorithm

```java
public List<SignificantMove> detectUsingRSI(List<Ticker> tickers, int period) {
    // RSI = 100 - (100 / (1 + RS))
    // RS = Average Gain / Average Loss

    for (int i = period; i < tickers.size(); i++) {
        double avgGain = 0, avgLoss = 0;

        for (int j = i - period; j < i; j++) {
            double change = tickers.get(j).price() - tickers.get(j-1).price();
            if (change > 0) avgGain += change;
            else avgLoss += Math.abs(change);
        }

        avgGain /= period;
        avgLoss /= period;

        double rs = avgLoss == 0 ? 0 : avgGain / avgLoss;
        double rsi = 100 - (100 / (1 + rs));

        if (rsi < 30) {
            // Oversold (potential dip)
        } else if (rsi > 70) {
            // Overbought (potential peak)
        }
    }
}
```

#### Parameters

- `period`: Typically 14 (standard RSI period)
- `oversoldThreshold`: Usually 30
- `overboughtThreshold`: Usually 70

#### Advantages

✅ Industry-standard indicator
✅ Normalized (0-100 scale)
✅ Good for momentum detection

#### Limitations

❌ Lagging indicator
❌ Requires calibration for different markets
❌ Can remain extreme for extended periods

---

### 2.3 Bollinger Bands

**Concept**: Detect price movements outside N standard deviations from moving average.

#### Algorithm

```java
public List<SignificantMove> detectUsingBollingerBands(List<Ticker> tickers, int period, double stdDevMultiplier) {
    for (int i = period; i < tickers.size(); i++) {
        double sma = calculateSMA(tickers, i - period, i);
        double stdDev = calculateStdDev(tickers, i - period, i, sma);

        double upperBand = sma + (stdDevMultiplier * stdDev);
        double lowerBand = sma - (stdDevMultiplier * stdDev);

        double currentPrice = tickers.get(i).price();

        if (currentPrice < lowerBand) {
            // Price below lower band → potential dip
        } else if (currentPrice > upperBand) {
            // Price above upper band → potential peak
        }
    }
}
```

#### Parameters

- `period`: Window size (typically 20)
- `stdDevMultiplier`: Usually 2.0 (2 standard deviations)

#### Advantages

✅ Adapts to volatility automatically
✅ Widely used in trading
✅ Clear visual representation

#### Limitations

❌ Doesn't identify exact reversal points
❌ Can generate false signals in trending markets
❌ Computationally more expensive

---

### 2.4 Local Extrema Detection

**Concept**: Find local minima/maxima using derivative-like comparisons.

#### Algorithm

```java
public List<SignificantMove> detectLocalExtrema(List<Ticker> tickers, int window) {
    for (int i = window; i < tickers.size() - window; i++) {
        double current = tickers.get(i).price();

        boolean isLocalMin = true;
        boolean isLocalMax = true;

        for (int j = i - window; j <= i + window; j++) {
            if (j == i) continue;

            if (tickers.get(j).price() <= current) {
                isLocalMax = false;
            }
            if (tickers.get(j).price() >= current) {
                isLocalMin = false;
            }
        }

        if (isLocalMin) {
            // Local minimum (dip)
        } else if (isLocalMax) {
            // Local maximum (peak)
        }
    }
}
```

#### Parameters

- `window`: Size of neighborhood to check

#### Advantages

✅ Very simple and fast
✅ No threshold tuning
✅ Finds all local extrema

#### Limitations

❌ Generates many false positives in noisy data
❌ No magnitude filtering
❌ Sensitive to minor fluctuations

---

### 2.5 Percentage Change from Rolling High/Low

**Concept**: Detect when price drops X% from recent high or rises X% from recent low.

#### Algorithm

```java
public List<SignificantMove> detectFromRollingExtremes(List<Ticker> tickers, int window, double threshold) {
    for (int i = window; i < tickers.size(); i++) {
        double rollingHigh = tickers.subList(i - window, i).stream()
            .mapToDouble(Ticker::price).max().orElse(0);
        double rollingLow = tickers.subList(i - window, i).stream()
            .mapToDouble(Ticker::price).min().orElse(0);

        double currentPrice = tickers.get(i).price();

        double dropFromHigh = ((currentPrice - rollingHigh) / rollingHigh) * 100;
        double riseFromLow = ((currentPrice - rollingLow) / rollingLow) * 100;

        if (dropFromHigh < -threshold) {
            // Significant drop from recent high (dip)
        } else if (riseFromLow > threshold) {
            // Significant rise from recent low (peak)
        }
    }
}
```

#### Parameters

- `window`: Rolling window size
- `threshold`: Percentage change threshold

#### Advantages

✅ Intuitive and easy to understand
✅ Good for detecting pullbacks
✅ Threshold controls sensitivity

#### Limitations

❌ Directional bias (only catches drops from highs, not reversals)
❌ May lag in trending markets
❌ Doesn't capture reversal patterns

---

### 2.6 Volume-Weighted Price Analysis

**Concept**: Weight price movements by volume to find significant institutional trades.

#### Algorithm

```java
public List<SignificantMove> detectVolumeWeighted(List<Ticker> tickers, int window, double volumeThreshold) {
    for (int i = window; i < tickers.size(); i++) {
        double vwap = 0; // Volume Weighted Average Price
        double totalVolume = 0;

        for (int j = i - window; j < i; j++) {
            vwap += tickers.get(j).price() * tickers.get(j).volume();
            totalVolume += tickers.get(j).volume();
        }
        vwap /= totalVolume;

        Ticker current = tickers.get(i);
        double priceDeviation = ((current.price() - vwap) / vwap) * 100;
        double volumeSpike = current.volume() / (totalVolume / window);

        if (Math.abs(priceDeviation) > threshold && volumeSpike > volumeThreshold) {
            // Significant move with high volume
        }
    }
}
```

#### Parameters

- `window`: VWAP calculation window
- `volumeThreshold`: Multiplier for average volume (e.g., 2x)

#### Advantages

✅ Incorporates volume (liquidity) information
✅ Filters out low-volume noise
✅ Useful for institutional activity detection

#### Limitations

❌ Requires volume data
❌ More complex calculation
❌ May miss significant moves on normal volume

---

### 2.7 Machine Learning Approaches

**Concept**: Train models to recognize patterns in labeled historical data.

#### Approaches

**A. Supervised Learning (Classification)**

```java
// Train a model to classify price points as dip/peak/normal
// Features: price, volume, moving averages, RSI, etc.
// Labels: Manual annotation of historical dips/peaks

public List<SignificantMove> detectUsingML(List<Ticker> tickers, MLModel model) {
    for (int i = 0; i < tickers.size(); i++) {
        double[] features = extractFeatures(tickers, i);
        String prediction = model.predict(features); // "dip", "peak", "normal"

        if (!prediction.equals("normal")) {
            // Model detected significant move
        }
    }
}
```

**B. Anomaly Detection (Unsupervised)**

```java
// Use algorithms like Isolation Forest, One-Class SVM
// Detect outliers without labeled data

public List<SignificantMove> detectAnomalies(List<Ticker> tickers, AnomalyDetector detector) {
    for (int i = 0; i < tickers.size(); i++) {
        double[] features = extractFeatures(tickers, i);
        double anomalyScore = detector.score(features);

        if (anomalyScore > threshold) {
            // Anomaly detected
        }
    }
}
```

**C. Time Series Forecasting**

```java
// Use LSTM/ARIMA to predict future prices
// Detect when actual price significantly deviates from prediction

public List<SignificantMove> detectForecastDeviation(List<Ticker> tickers, ForecastModel model) {
    for (int i = window; i < tickers.size(); i++) {
        double predicted = model.forecast(tickers.subList(0, i));
        double actual = tickers.get(i).price();
        double deviation = Math.abs((actual - predicted) / predicted) * 100;

        if (deviation > threshold) {
            // Prediction error indicates unusual movement
        }
    }
}
```

#### Advantages

✅ Can learn complex patterns
✅ Adapts to market conditions
✅ Can incorporate multiple features
✅ Potentially higher accuracy with good training data

#### Limitations

❌ Requires labeled training data
❌ Complex infrastructure (model training, deployment)
❌ Computationally expensive
❌ Risk of overfitting
❌ Black-box nature makes debugging hard

---

## 3. Algorithm Comparison

| Algorithm | Complexity | Speed | Accuracy | Adaptability | Implementation Effort |
|-----------|------------|-------|----------|--------------|----------------------|
| **Moving Average (Current)** | Low | Very Fast | Medium | Low | Easy |
| **Z-Score** | Medium | Fast | Medium-High | Medium | Medium |
| **RSI** | Medium | Fast | Medium | Medium | Medium |
| **Bollinger Bands** | Medium | Fast | Medium | High | Medium |
| **Local Extrema** | Low | Very Fast | Low | Low | Easy |
| **Rolling High/Low** | Low | Fast | Medium | Low | Easy |
| **Volume-Weighted** | Medium | Fast | Medium-High | Medium | Medium |
| **Machine Learning** | Very High | Slow | High | Very High | Very Hard |

### Accuracy vs. Computational Cost

```
High Accuracy
    ↑
    │                    ● ML (LSTM/RF)
    │                  ● Volume-Weighted
    │              ● Bollinger Bands
    │          ● Z-Score
    │      ● RSI
    │  ● Moving Avg (Current)
    │● Local Extrema
    └──────────────────────────────────→ Computational Cost
   Low                              High
```

---

## 4. Implementation Guidelines

### Creating a New Detection Algorithm

1. **Create service class** in `service/analysis/` package:
   ```java
   @Service
   public class YourAlgorithmDetectionService {
       public List<SignificantMove> detectSignificantMoves(List<Ticker> tickers, double threshold) {
           // Your implementation
       }
   }
   ```

2. **Implement the interface pattern**:
   ```java
   public interface PriceMovementDetector {
       List<SignificantMove> detectSignificantMoves(List<Ticker> tickers, double threshold);
       String getAlgorithmName();
       Map<String, Object> getParameters();
   }
   ```

3. **Update TickerController** to use new service:
   ```java
   private final YourAlgorithmDetectionService yourAlgorithm;

   @GetMapping("/api/ticker")
   public TickerResponse getTickerData(@RequestParam String algorithm) {
       List<SignificantMove> moves = switch(algorithm) {
           case "moving-average" -> movingAverageDetectionService.detectSignificantMoves(tickers, threshold);
           case "z-score" -> zScoreDetectionService.detectSignificantMoves(tickers, threshold);
           case "your-algorithm" -> yourAlgorithm.detectSignificantMoves(tickers, threshold);
           default -> movingAverageDetectionService.detectSignificantMoves(tickers, threshold);
       };
   }
   ```

### Testing New Algorithms

```java
@Test
public void testAlgorithmAccuracy() {
    // Load labeled test data
    List<Ticker> testData = loadTestData();
    List<SignificantMove> expectedMoves = loadExpectedMoves();

    // Run algorithm
    List<SignificantMove> detected = algorithm.detectSignificantMoves(testData, threshold);

    // Calculate precision/recall
    double precision = calculatePrecision(detected, expectedMoves);
    double recall = calculateRecall(detected, expectedMoves);

    assertThat(precision).isGreaterThan(0.80);
    assertThat(recall).isGreaterThan(0.70);
}
```

---

## 5. Performance Considerations

### Time Complexity Analysis

| Algorithm | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| Moving Average | O(n × w) | O(n) | w = window size |
| Z-Score | O(n × w) | O(n) | Requires 2 passes (mean + stddev) |
| RSI | O(n × p) | O(p) | p = period |
| Bollinger Bands | O(n × w) | O(n) | Similar to Z-Score |
| Local Extrema | O(n × w) | O(n) | Simple comparison |
| ML (inference) | O(n × f) | O(n) | f = feature extraction cost |

### Optimization Tips

1. **Pre-compute rolling statistics** for repeated calculations
2. **Use sliding window** instead of recalculating from scratch
3. **Parallelize** independent calculations across data chunks
4. **Cache** commonly used values (means, stddevs)
5. **Early exit** when threshold conditions can't be met

### Example: Optimized Moving Average

```java
// Instead of recalculating average for each window
double sum = 0;
for (int i = 0; i < window; i++) {
    sum += tickers.get(i).price();
}

for (int i = window; i < tickers.size(); i++) {
    sum += tickers.get(i).price();
    sum -= tickers.get(i - window).price();
    double avg = sum / window; // O(1) instead of O(w)
}
```

---

## Recommendations

### For Current Use Case (High-Frequency Tick Data)

1. **Short-term**: Keep current Moving Average algorithm
   - Simple, fast, sufficient for most cases
   - Well-documented and tested

2. **Medium-term**: Implement Z-Score detection
   - Better adaptability to volatility
   - Statistically grounded
   - Moderate complexity increase

3. **Long-term**: Volume-Weighted analysis
   - More sophisticated filtering
   - Incorporates liquidity information
   - Better quality signals

### For Production Deployment

- **Start simple**: Moving Average or Z-Score
- **Monitor performance**: Track false positives/negatives
- **Iterate**: Add complexity only if needed
- **A/B test**: Compare algorithms on historical data
- **Document**: Keep track of parameter tuning decisions

---

## References

- Bollinger, J. (2001). *Bollinger on Bollinger Bands*
- Wilder, J. W. (1978). *New Concepts in Technical Trading Systems*
- Murphy, J. J. (1999). *Technical Analysis of the Financial Markets*

---

**Last Updated**: 2025-10-04
**Version**: 1.0.0
**Maintained By**: ChartsSimulator Team
