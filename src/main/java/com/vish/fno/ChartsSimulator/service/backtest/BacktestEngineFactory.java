package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.model.Ticker;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Factory for creating fresh BacktestEngine instances.
 *
 * <p>Each backtest run requires a new engine instance with clean state to prevent
 * interference between consecutive runs. This factory ensures proper isolation.</p>
 *
 * <p><b>Why Factory Pattern:</b></p>
 * <ul>
 *   <li>BacktestEngine maintains stateful simulation data (positions, trades, capital)</li>
 *   <li>Prevents state leakage between consecutive backtest runs</li>
 *   <li>Enables parallel backtesting without race conditions</li>
 *   <li>Simpler than manually resetting state between runs</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Component
public class BacktestEngineFactory {

    /**
     * Create a new BacktestEngine instance with clean state.
     *
     * @return Fresh BacktestEngine instance ready for simulation
     */
    public BacktestEngine createEngine(String symbol, String date, Strategy strategy, List<Ticker> tickers, double capital) {
        return new BacktestEngine(symbol, date, strategy, tickers, capital);
    }
}
