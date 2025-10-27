package com.vish.fno.utils.indicators;

import com.vish.fno.models.Candlestick;

import java.util.List;

/**
 * Abstract base class for technical indicators.
 *
 * <p>Provides common functionality for extracting close prices from candlesticks.</p>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public abstract class AbstractIndicator implements Indicator {

    /**
     * Extracts close prices from candlesticks.
     *
     * @param candles List of candlesticks
     * @return List of close prices
     */
    public List<Double> getClosedPrices(List<Candlestick> candles) {
        return candles.stream().map(Candlestick::close).toList();
    }

    @Override
    public List<Double> calculate(List<Candlestick> candles) {
        return calculateFromClosedPrice(getClosedPrices(candles));
    }

    @Override
    public List<Double> calculate(List<Candlestick> candles, List<Candlestick> prevCandles) {
        return calculateFromClosedPrice(getClosedPrices(candles), getClosedPrices(prevCandles));
    }
}
