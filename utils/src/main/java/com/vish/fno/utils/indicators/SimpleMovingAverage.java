package com.vish.fno.utils.indicators;

import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Simple Moving Average (SMA) indicator.
 *
 * <p>Calculates the arithmetic mean of prices over a specified period.</p>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@NoArgsConstructor
public class SimpleMovingAverage extends MovingAverage {

    public SimpleMovingAverage(int duration) {
        super(duration);
    }

    @Override
    protected double getMultiplier() {
        return 1.0;
    }

    @Override
    protected double maValue(double lastMa, double closePrice, double multiplier) {
        // For SMA, we don't use the multiplier pattern
        return closePrice;
    }

    @Override
    public List<Double> calculateFromClosedPrice(List<Double> closePrices) {
        List<Double> smaList = new ArrayList<>();

        for (int i = 0; i < closePrices.size(); i++) {
            if (i < duration - 1) {
                smaList.add(-1d);  // Not enough data yet
            } else {
                double sum = 0.0;
                for (int j = 0; j < duration; j++) {
                    sum += closePrices.get(i - j);
                }
                smaList.add(sum / duration);
            }
        }

        return smaList;
    }

    @Override
    public List<Double> calculateFromClosedPrice(List<Double> closedPrices, List<Double> prevDayCandles) {
        // Combine previous and current data for SMA calculation
        List<Double> allPrices = new ArrayList<>(prevDayCandles);
        allPrices.addAll(closedPrices);

        List<Double> allSma = calculateFromClosedPrice(allPrices);

        // Return only the SMA values for current day
        return allSma.subList(prevDayCandles.size(), allSma.size());
    }
}
