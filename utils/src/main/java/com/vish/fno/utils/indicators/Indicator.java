package com.vish.fno.utils.indicators;

import com.vish.fno.models.Candlestick;

import java.util.List;

/**
 * Base interface for technical indicators.
 *
 * <p>Provides methods for calculating indicators from candlesticks or raw price data.</p>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public interface Indicator {

    /**
     * Calculates indicator values from candlesticks.
     *
     * @param candles List of candlesticks
     * @return List of indicator values
     */
    List<Double> calculate(List<Candlestick> candles);

    /**
     * Calculates indicator values from candlesticks with previous day data.
     *
     * @param candles Current candlesticks
     * @param prevCandles Previous day candlesticks
     * @return List of indicator values
     */
    List<Double> calculate(List<Candlestick> candles, List<Candlestick> prevCandles);

    /**
     * Calculates indicator values from close prices.
     *
     * @param closePrices List of close prices
     * @return List of indicator values
     */
    List<Double> calculateFromClosedPrice(List<Double> closePrices);

    /**
     * Calculates indicator values from close prices with previous data.
     *
     * @param closePrices Current close prices
     * @param prevClosePrices Previous close prices
     * @return List of indicator values
     */
    List<Double> calculateFromClosedPrice(List<Double> closePrices, List<Double> prevClosePrices);
}
