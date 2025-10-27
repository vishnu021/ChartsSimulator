package com.vish.fno.utils.indicators;

import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Exponential Moving Average (EMA) indicator.
 *
 * <p>Gives more weight to recent prices using an exponential smoothing factor.</p>
 *
 * <p><b>Formula:</b> EMA = (Close × Multiplier) + (Previous EMA × (1 - Multiplier))</p>
 * <p><b>Multiplier:</b> 2 / (Duration + 1)</p>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Slf4j
@NoArgsConstructor
public class ExponentialMovingAverage extends MovingAverage {

    public ExponentialMovingAverage(int duration) {
        super(duration);
    }

    @Override
    protected double getMultiplier() {
        return ((double) 2) / (duration + 1);
    }

    @Override
    protected double maValue(double lastMa, double closePrice, double multiplier) {
        return closePrice * multiplier + lastMa * (1 - multiplier);
    }
}
