package com.vish.fno.utils.indicators;

import com.vish.fno.models.Candlestick;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Abstract base class for moving average indicators.
 *
 * <p>Provides common functionality for SMA, EMA, and other moving average variants.</p>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@NoArgsConstructor
@AllArgsConstructor
public abstract class MovingAverage extends AbstractIndicator {

    protected int duration = 14;

    /**
     * Gets the multiplier used in moving average calculation.
     *
     * @return Multiplier value
     */
    protected abstract double getMultiplier();

    /**
     * Calculates the next moving average value.
     *
     * @param lastMa Previous moving average value
     * @param closePrice Current close price
     * @param multiplier Calculation multiplier
     * @return New moving average value
     */
    protected abstract double maValue(double lastMa, double closePrice, double multiplier);

    @Override
    public List<Double> calculateFromClosedPrice(List<Double> closePrices) {
        double multiplier = getMultiplier();
        double lastMA = getLastSMA(closePrices);

        List<Double> maList = new ArrayList<>();
        for (int i = 0; i < closePrices.size(); i++) {
            if (skipPresetValues(lastMA, maList, i)) {
                continue;
            }

            lastMA = maValue(maList.get(i - 1), closePrices.get(i), multiplier);
            maList.add(lastMA);
        }
        return maList;
    }

    @Override
    public List<Double> calculate(List<Candlestick> candles, List<Candlestick> prevCandles) {
        List<Double> closedPrices = getClosedPrices(candles);
        List<Double> prevClosedPrices = getClosedPrices(prevCandles);
        return calculateFromClosedPrice(closedPrices, prevClosedPrices);
    }

    @Override
    public List<Double> calculateFromClosedPrice(List<Double> closedPrices, List<Double> prevDayCandles) {
        double multiplier = getMultiplier();
        double lastMA = getLastMA(prevDayCandles);

        List<Double> maList = new ArrayList<>();
        for (double closedPrice : closedPrices) {
            lastMA = maValue(lastMA, closedPrice, multiplier);
            maList.add(lastMA);
        }
        return maList;
    }

    private double getLastMA(List<Double> prevDayCandles) {
        List<Double> lastMAList = this.calculateFromClosedPrice(prevDayCandles);
        return lastMAList.get(lastMAList.size() - 1);
    }

    /**
     * Calculates Simple Moving Average for initial value when previous value is not available.
     *
     * @param candles List of close prices
     * @return Last SMA value
     */
    private double getLastSMA(List<Double> candles) {
        SimpleMovingAverage sma = new SimpleMovingAverage(duration);
        List<Double> sma14 = sma.calculateFromClosedPrice(candles);
        int smaListSize = Math.min(duration, sma14.size());
        return sma14.get(smaListSize - 1);
    }

    private boolean skipPresetValues(double lastMA, List<Double> ma, int i) {
        if (i < duration - 1) {
            ma.add(-1d);
            return true;
        }

        if (i == duration - 1) {
            ma.add(lastMA);
            return true;
        }

        return false;
    }
}
