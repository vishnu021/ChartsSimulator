# Backtesting Architecture & Framework

This document provides comprehensive documentation for the ChartsSimulator backtesting framework, which allows testing trading strategies on historical data and evaluating their performance.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Design Patterns](#architecture--design-patterns)
3. [Core Components](#core-components)
4. [Configuration System](#configuration-system)
5. [Workflow & Execution Flow](#workflow--execution-flow)
6. [Data Models](#data-models)
7. [Strategy Implementation Guide](#strategy-implementation-guide)
8. [Performance Metrics](#performance-metrics)
9. [API Reference](#api-reference)
10. [Frontend Integration](#frontend-integration)
11. [Usage Examples](#usage-examples)
12. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose

The backtesting framework enables:
- **Strategy Testing**: Evaluate trading strategies on historical data before live deployment
- **Performance Analysis**: Calculate profit/loss, win rate, and risk metrics
- **Strategy Comparison**: Compare multiple strategies side-by-side
- **Risk Assessment**: Understand maximum drawdown and risk-adjusted returns
- **Configuration-Driven**: Select and configure strategies via `application.yml`
- **Real-Time Simulation**: Process tickers incrementally to simulate live trading conditions
- **Integrated Visualization**: Backtest results displayed alongside chart data in real-time

### Key Features

✅ **Config-Driven**: Strategy selection via YAML configuration
✅ **Pluggable Architecture**: Easy to add new strategies
✅ **Real-Time Incremental Processing**: Tickers processed one-by-one as if in live market
✅ **Integrated Endpoint**: Backtest results returned with /api/ticker (no separate controllers)
✅ **Realistic Simulation**: Accounts for slippage, timing, and market conditions
✅ **Comprehensive Metrics**: Win rate, profit factor, Sharpe ratio, max drawdown
✅ **Visual Integration**: Trade markers and P/L display on charts
✅ **Multi-Strategy Support**: Run multiple strategies simultaneously

---

## Architecture & Design Patterns

### Design Patterns Used

#### 1. **Strategy Pattern**
- Encapsulates different detection algorithms as interchangeable strategies
- Allows runtime strategy selection based on configuration
- Each strategy implements common interface

#### 2. **Template Method Pattern**
- Defines common backtesting workflow in `BacktestEngine`
- Delegates strategy-specific logic to strategy implementations
- Ensures consistent execution across all strategies

#### 3. **Factory Pattern**
- `StrategyFactory` creates strategy instances based on configuration
- Supports dynamic strategy registration
- Decouples strategy creation from business logic

#### 4. **Dependency Injection**
- Spring-managed beans for all components
- Configuration properties injected via `@ConfigurationProperties`
- Promotes testability and modularity

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Controller │  │   REST API  │  │  Frontend UI    │  │
│  └────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                     Service Layer                        │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ Backtest     │  │   Strategy    │  │  Detection  │  │
│  │ Engine       │←─│   Factory     │←─│  Services   │  │
│  └──────────────┘  └───────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                      Domain Layer                        │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │  Strategy    │  │    Trade      │  │  Backtest   │  │
│  │  Interface   │  │    Models     │  │  Result     │  │
│  └──────────────┘  └───────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Configuration Layer                      │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ application  │  │   Strategy    │  │  Trading    │  │
│  │    .yml      │  │   Config      │  │  Rules      │  │
│  └──────────────┘  └───────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Strategy Interfaces

#### `SignalDetectionStrategy` Interface
```java
public interface SignalDetectionStrategy {
    /**
     * Detects trading signals from ticker data
     */
    List<SignificantMove> detectSignals(List<Ticker> tickers, double threshold);

    /**
     * Returns unique strategy identifier
     */
    String getStrategyName();

    /**
     * Returns human-readable description
     */
    String getStrategyDescription();

    /**
     * Returns strategy configuration parameters
     */
    Map<String, Object> getParameters();
}
```

#### `TradingStrategy` Interface
```java
public interface TradingStrategy {
    /**
     * Determines if should enter long position
     */
    boolean shouldBuy(SignificantMove signal, MarketContext context);

    /**
     * Determines if should exit position
     */
    boolean shouldSell(SignificantMove signal, MarketContext context);

    /**
     * Calculates position size based on capital and risk
     */
    int calculatePositionSize(double capital, double price, double riskPercent);

    /**
     * Returns stop loss percentage
     */
    double getStopLossPercent();

    /**
     * Returns take profit percentage
     */
    double getTakeProfitPercent();
}
```

#### `Strategy` Interface (Combined)
```java
/**
 * Complete trading strategy interface combining signal detection and trading logic.
 *
 * Implementations should provide strategy-specific documentation in their class-level Javadoc,
 * including algorithm description, entry/exit rules, and parameter details.
 *
 * @see MovingAverageStrategy for example implementation
 */
public interface Strategy extends SignalDetectionStrategy, TradingStrategy {
    // Combines both interfaces for complete strategy implementation
}
```

**Important Notes**:
- The `getStrategyDescription()` method from `SignalDetectionStrategy` is **deprecated**
- Strategy descriptions should be provided in **class-level Javadoc** instead
- This allows for richer documentation with examples, usage notes, and references

### 2. BacktestEngine Service

**Responsibilities**:
- Execute virtual trades based on strategy signals
- Track portfolio value over time (incrementally)
- Calculate performance metrics at each tick
- Generate trade history and real-time P/L updates
- Process tickers one-by-one to simulate live trading

**Key Methods**:
```java
public class BacktestEngine {
    /**
     * Runs incremental backtest as tickers are processed.
     * This method is called for each ticker update to simulate real-time execution.
     *
     * @param strategy The trading strategy to execute
     * @param currentTickers All tickers available up to this point in time (growing list)
     * @param config Backtest configuration
     * @return Current backtest state with P/L calculated based only on available data
     */
    public BacktestResult runIncrementalBacktest(
        Strategy strategy,
        List<Ticker> currentTickers,
        BacktestConfig config
    );

    /**
     * Executes single trade based on signal
     */
    private Trade executeTrade(SignificantMove signal, Portfolio portfolio);

    /**
     * Calculates all performance metrics based on current state
     */
    private PerformanceMetrics calculateMetrics(List<Trade> trades, Portfolio portfolio);
}
```

**Incremental Processing Design**:
- **State Persistence**: Engine maintains state between ticker updates
- **Growing Dataset**: Each call receives tickers[0..n] where n increases
- **Real-Time Signals**: Strategy detects signals only from available data
- **Partial Results**: P/L calculated at each point based on current price
- **No Future Bias**: Decisions made without knowledge of future tickers

### 3. Strategy Factory

**Purpose**: Creates strategy instances based on configuration

```java
@Component
public class StrategyFactory {
    private final Map<String, Strategy> strategies;

    /**
     * Gets strategy by name from configuration
     */
    public Strategy getStrategy(String strategyName);

    /**
     * Registers new strategy (auto-discovered via Spring)
     */
    public void registerStrategy(Strategy strategy);

    /**
     * Lists all available strategies
     */
    public List<String> getAvailableStrategies();
}
```

### 4. Portfolio Manager

**Responsibilities**:
- Tracks cash balance and positions
- Executes buy/sell orders
- Calculates portfolio value
- Manages risk limits

```java
public class Portfolio {
    private double cashBalance;
    private Map<String, Position> positions;
    private List<Trade> tradeHistory;

    public void buy(String symbol, int quantity, double price, String timestamp);
    public void sell(String symbol, int quantity, double price, String timestamp);
    public double getTotalValue(double currentPrice);
    public Position getPosition(String symbol);
}
```

---

## Configuration System

### Application Configuration (application.yml)

```yaml
app:
  backtest:
    # Default strategy to use
    default-strategy: "moving-average"

    # Initial capital for backtesting
    initial-capital: 10000.0

    # Risk management
    risk:
      position-size-percent: 10.0  # 10% of capital per trade
      max-positions: 1              # Maximum concurrent positions
      stop-loss-percent: 2.0        # 2% stop loss
      take-profit-percent: 5.0      # 5% take profit

    # Trading costs
    costs:
      commission-per-trade: 0.0     # No commission (can add later)
      slippage-percent: 0.1         # 0.1% slippage

    # Strategy-specific configurations
    strategies:
      moving-average:
        enabled: true
        name: "MovingAverageStrategy"
        description: "Mean reversion with confirmation"
        parameters:
          threshold: 0.5
          confirmation-window: 10
          min-follow-through: 0.5
          min-signal-distance: 100
        trading-rules:
          entry: "BUY_ON_DIP"
          exit: "SELL_ON_PEAK"
          stop-loss: 2.0
          take-profit: 5.0

      rsi:
        enabled: false
        name: "RSIStrategy"
        description: "Relative Strength Index momentum"
        parameters:
          period: 14
          oversold: 30
          overbought: 70
        trading-rules:
          entry: "BUY_ON_OVERSOLD"
          exit: "SELL_ON_OVERBOUGHT"
          stop-loss: 3.0
          take-profit: 6.0

      momentum:
        enabled: false
        name: "MomentumStrategy"
        description: "Price momentum trending"
        parameters:
          lookback-period: 20
          momentum-threshold: 2.0
        trading-rules:
          entry: "BUY_ON_STRONG_MOMENTUM"
          exit: "SELL_ON_MOMENTUM_REVERSAL"
          stop-loss: 2.5
          take-profit: 7.0
```

### Configuration Properties Classes

```java
@ConfigurationProperties("app.backtest")
public record BacktestProperties(
    String defaultStrategy,
    double initialCapital,
    RiskConfig risk,
    CostsConfig costs,
    Map<String, StrategyConfig> strategies
) {}

public record RiskConfig(
    double positionSizePercent,
    int maxPositions,
    double stopLossPercent,
    double takeProfitPercent
) {}

public record CostsConfig(
    double commissionPerTrade,
    double slippagePercent
) {}

public record StrategyConfig(
    boolean enabled,
    String name,
    String description,
    Map<String, Object> parameters,
    TradingRulesConfig tradingRules
) {}

public record TradingRulesConfig(
    String entry,
    String exit,
    double stopLoss,
    double takeProfit
) {}
```

---

## Workflow & Execution Flow

### 1. Integrated Request Flow (Real-Time Simulation)

**IMPORTANT**: Backtesting is integrated with the existing `/api/ticker` endpoint - no separate controllers needed.

```
User loads chart (/api/ticker?symbol=XXX&date=YYYY-MM-DD)
    ↓
TickerController receives request
    ↓
Load configuration from application.yml
    ↓
Strategy Factory creates strategy instance
    ↓
Load historical ticker data from file/database
    ↓
FOR EACH ticker (index i from 0 to N):
    ↓
    Create incremental list: tickers[0..i]
    ↓
    Strategy detects signals from tickers[0..i] ONLY
    ↓
    BacktestEngine processes new signals (if any)
    │   ├─ Check entry/exit conditions
    │   ├─ Execute trades
    │   └─ Update P/L based on current price (tickers[i].price)
    ↓
    Store current BacktestResult state
    ↓
NEXT ticker
    ↓
Return TickerResponse:
   - tickers: All ticker data
   - significantMoves: Detected signals
   - backtestResult: Final P/L and metrics
    ↓
Frontend displays:
   - Chart with price data
   - Signal arrows
   - Trade markers (entry/exit circles)
   - Backtest panel with P/L
```

**Key Principle**: At each iteration, the system knows ONLY what has happened up to that point - no future data is visible.

### 2. Incremental Backtesting Execution Flow

```
START (when /api/ticker is called)
    ↓
Initialize Portfolio (cash = initialCapital)
Initialize empty signal list
    ↓
Load all tickers from file: tickers[0..N]
    ↓
FOR i = 0 to N (process tickers incrementally):
    ↓
    Create partial view: currentTickers = tickers[0..i]
    ↓
    Run Strategy.detectSignals(currentTickers)
    ↓
    Compare with previous signals - identify NEW signals
    ↓
    FOR EACH new signal:
        ↓
        Get current price from tickers[i]
        ↓
        Check if position open?
        ├─ Yes → Check exit conditions
        │         ├─ Exit signal? → Close at current price, record trade
        │         ├─ Stop loss hit? → Close at stop price, record trade
        │         └─ Take profit hit? → Close at target price, record trade
        │
        └─ No → Check entry conditions
                  └─ Entry signal? → Open at current price + slippage
        ↓
    NEXT new signal
    ↓
    Update unrealized P/L based on tickers[i].price
    ↓
    Create PortfolioSnapshot for this timestamp
    ↓
NEXT ticker (i++)
    ↓
Close any remaining positions at final price
    ↓
Calculate final performance metrics:
   - Total trades
   - Win/loss count
   - Win rate
   - Profit factor
   - Max drawdown
   - Sharpe ratio
    ↓
Return BacktestResult embedded in TickerResponse
    ↓
END
```

**Critical Implementation Detail**:
- The signal detection is run for EVERY ticker increment: detectSignals(tickers[0..i])
- Only NEW signals (not in previous list) trigger trading decisions
- Portfolio value is recalculated at EVERY ticker using current price
- No peeking ahead - decisions based only on data seen so far

### 3. Trade Execution Example

```
Signal: DIP at 09:32:59 @ ₹165.55
    ↓
shouldBuy() = true (dip signal + no open position)
    ↓
Calculate position size:
   capital = ₹10,000
   riskPercent = 10%
   price = ₹165.55
   shares = (10,000 × 0.10) / 165.55 = 6 shares
    ↓
Execute BUY:
   Entry price = ₹165.55 × (1 + 0.001) = ₹165.72 (with slippage)
   Cost = 6 × ₹165.72 = ₹994.32
   Cash balance = ₹10,000 - ₹994.32 = ₹9,005.68
    ↓
Set stop loss = ₹165.72 × 0.98 = ₹162.41
Set take profit = ₹165.72 × 1.05 = ₹174.01
    ↓
Wait for exit signal...
    ↓
Signal: PEAK at 09:34:26 @ ₹175.75
    ↓
shouldSell() = true (peak signal + position open)
    ↓
Execute SELL:
   Exit price = ₹175.75 × (1 - 0.001) = ₹175.57 (with slippage)
   Revenue = 6 × ₹175.57 = ₹1,053.42
   Cash balance = ₹9,005.68 + ₹1,053.42 = ₹10,059.10
    ↓
Record Trade:
   Entry: 09:32:59 @ ₹165.72
   Exit: 09:34:26 @ ₹175.57
   P/L: ₹59.10 (+5.94%)
   Holding: 1 min 27 sec
```

---

## Data Models

### Trade Record

```java
public record Trade(
    int tradeNumber,            // Sequential trade ID
    String symbol,              // Symbol traded
    TradeType type,             // LONG or SHORT
    String entryTime,           // Entry timestamp
    double entryPrice,          // Entry price (with slippage)
    int quantity,               // Number of shares
    String exitTime,            // Exit timestamp
    double exitPrice,           // Exit price (with slippage)
    double profitLoss,          // Absolute P/L in currency
    double profitLossPercent,   // P/L percentage
    Duration holdingPeriod,     // Time held
    ExitReason exitReason       // Why position was closed
) {}

enum TradeType { LONG, SHORT }
enum ExitReason { SIGNAL, STOP_LOSS, TAKE_PROFIT, END_OF_DAY }
```

### BacktestResult Record

```java
public record BacktestResult(
    String strategyName,        // Strategy used
    String symbol,              // Symbol tested
    String period,              // Time period (e.g., "2025-10-01 09:15-15:30")

    // Capital metrics
    double initialCapital,      // Starting capital
    double finalValue,          // Ending portfolio value
    double netProfitLoss,       // Total P/L
    double profitLossPercent,   // P/L percentage

    // Trade statistics
    int totalTrades,            // Number of trades
    int winningTrades,          // Profitable trades
    int losingTrades,           // Loss-making trades
    double winRate,             // Win percentage

    // Performance metrics
    double profitFactor,        // Total profit / Total loss
    double maxDrawdown,         // Maximum peak-to-trough decline
    double maxDrawdownPercent,  // Max drawdown as percentage
    double averageWin,          // Average winning trade
    double averageLoss,         // Average losing trade
    double largestWin,          // Best trade
    double largestLoss,         // Worst trade
    double sharpeRatio,         // Risk-adjusted return

    // Trade history
    List<Trade> trades,         // All executed trades

    // Portfolio timeline
    List<PortfolioSnapshot> timeline  // Portfolio value over time
) {}
```

### PortfolioSnapshot Record

```java
public record PortfolioSnapshot(
    String timestamp,           // Time of snapshot
    double cashBalance,         // Available cash
    double positionValue,       // Value of open positions
    double totalValue,          // Cash + position value
    double unrealizedPnL,       // P/L on open positions
    double realizedPnL          // P/L from closed trades
) {}
```

### MarketContext Record

```java
public record MarketContext(
    double currentPrice,        // Current market price
    boolean hasOpenPosition,    // Is position currently open?
    Position openPosition,      // Details of open position (if any)
    double portfolioValue,      // Current total portfolio value
    int signalIndex,            // Index in signal list
    List<Ticker> recentTickers  // Recent price history for context
) {}
```

---

## Strategy Implementation Guide

### Creating a New Strategy

#### Step 1: Create Strategy Class

```java
/**
 * Custom trading strategy combining technical analysis indicators.
 *
 * <p><b>Algorithm Description:</b></p>
 * This strategy uses a combination of price momentum and volume analysis to identify
 * high-probability entry and exit points. It focuses on capturing medium-term trends
 * while minimizing false signals through confirmation filters.
 *
 * <p><b>Entry Rules:</b></p>
 * <ul>
 *   <li>Buy when price dips below 20-period moving average by at least 0.5%</li>
 *   <li>Volume must be above average to confirm strong buying interest</li>
 *   <li>Confirmation: Next 10 ticks must show upward momentum</li>
 * </ul>
 *
 * <p><b>Exit Rules:</b></p>
 * <ul>
 *   <li>Sell when price peaks above 20-period moving average by at least 0.5%</li>
 *   <li>Or when stop loss (2%) or take profit (5%) levels are hit</li>
 * </ul>
 *
 * <p><b>Parameters:</b></p>
 * <ul>
 *   <li>threshold: 0.5% - Minimum price deviation to trigger signal</li>
 *   <li>lookbackPeriod: 20 - Number of ticks for moving average</li>
 *   <li>confirmationWindow: 10 - Ticks required to confirm signal</li>
 * </ul>
 *
 * <p><b>Risk Management:</b></p>
 * <ul>
 *   <li>Stop Loss: 2% below entry price</li>
 *   <li>Take Profit: 5% above entry price</li>
 *   <li>Position Size: 10% of capital per trade</li>
 * </ul>
 *
 * @author YourName
 * @since 1.0.0
 * @see Strategy
 */
@Service
public class MyCustomStrategy implements Strategy {

    @Override
    public String getStrategyName() {
        return "my-custom";
    }

    @Override
    @Deprecated
    public String getStrategyDescription() {
        // Description moved to class-level Javadoc
        return "See class documentation";
    }

    @Override
    public Map<String, Object> getParameters() {
        return Map.of(
            "threshold", 0.5,
            "lookbackPeriod", 20,
            "confirmationWindow", 10
        );
    }

    @Override
    public List<SignificantMove> detectSignals(List<Ticker> tickers, double threshold) {
        // Implement signal detection logic
        // NOTE: This method receives tickers[0..i] during incremental processing
        List<SignificantMove> signals = new ArrayList<>();

        // Your algorithm here...
        // Remember: Only use data available in 'tickers' list
        // No peeking at future data!

        return signals;
    }

    @Override
    public boolean shouldBuy(SignificantMove signal, MarketContext context) {
        // Define entry conditions
        if (context.hasOpenPosition()) return false;

        // Check if signal is a buy signal
        return "dip".equals(signal.type());
    }

    @Override
    public boolean shouldSell(SignificantMove signal, MarketContext context) {
        // Define exit conditions
        if (!context.hasOpenPosition()) return false;

        // Check if signal is a sell signal
        return "peak".equals(signal.type());
    }

    @Override
    public int calculatePositionSize(double capital, double price, double riskPercent) {
        double riskCapital = capital * (riskPercent / 100.0);
        return (int) Math.floor(riskCapital / price);
    }

    @Override
    public double getStopLossPercent() {
        return 2.0; // 2% stop loss
    }

    @Override
    public double getTakeProfitPercent() {
        return 5.0; // 5% take profit
    }
}
```

**Important Notes**:
- Use **comprehensive class-level Javadoc** for strategy documentation
- Include algorithm description, entry/exit rules, parameters, and risk management
- The `getStrategyDescription()` method is deprecated but kept for backward compatibility
- During incremental processing, `detectSignals()` receives only tickers available up to current point

#### Step 2: Add Configuration

```yaml
app:
  backtest:
    strategies:
      my-custom:
        enabled: true
        name: "MyCustomStrategy"
        description: "My custom trading strategy"
        parameters:
          param1: value1
          param2: value2
        trading-rules:
          entry: "BUY_ON_CUSTOM_SIGNAL"
          exit: "SELL_ON_CUSTOM_SIGNAL"
          stop-loss: 2.0
          take-profit: 5.0
```

#### Step 3: Strategy Auto-Registration

Spring automatically discovers the strategy via `@Service` annotation and registers it with `StrategyFactory`.

---

## Performance Metrics

### Key Metrics Explained

#### 1. Win Rate
```
Win Rate = (Winning Trades / Total Trades) × 100%

Example: 11 wins out of 15 trades = (11/15) × 100% = 73.33%
```

**Interpretation**:
- > 60%: Excellent
- 50-60%: Good
- < 50%: Needs improvement

#### 2. Profit Factor
```
Profit Factor = Total Profit / Total Loss

Example: ₹1,380 profit / ₹563 loss = 2.45
```

**Interpretation**:
- > 2.0: Excellent
- 1.5-2.0: Good
- 1.0-1.5: Marginal
- < 1.0: Losing strategy

#### 3. Maximum Drawdown
```
Max Drawdown = (Peak Value - Trough Value) / Peak Value × 100%

Example: Peak ₹10,500, Trough ₹10,163
Max DD = (10,500 - 10,163) / 10,500 × 100% = 3.21%
```

**Interpretation**:
- < 5%: Low risk
- 5-15%: Moderate risk
- > 15%: High risk

#### 4. Sharpe Ratio
```
Sharpe Ratio = (Average Return - Risk Free Rate) / Std Dev of Returns

Example: (8.5% - 0%) / 3.2% = 2.66
```

**Interpretation**:
- > 3: Excellent
- 2-3: Very good
- 1-2: Good
- < 1: Sub-optimal

#### 5. Average Win/Loss Ratio
```
Win/Loss Ratio = Average Win / Average Loss

Example: ₹125.60 / ₹45.30 = 2.77
```

**Interpretation**:
- > 2.0: Excellent (wins are much larger)
- 1.0-2.0: Good
- < 1.0: Problematic (losses exceed wins)

---

## API Reference

### GET `/api/ticker` (Enhanced with Backtesting)

**Description**: Returns ticker data with integrated backtest results (no separate backtest endpoint)

**Query Parameters**:
- `symbol` (required): Trading symbol (e.g., "NIFTY25O0724600CE")
- `date` (required): Trading date (e.g., "2025-10-01")
- `strategy` (optional): Strategy name (defaults to config default)
- `capital` (optional): Initial capital (defaults to config value)
- `enableBacktest` (optional): Enable backtesting (default: true)

**Example Request**:
```
GET /api/ticker?symbol=NIFTY25O0724600CE&date=2025-10-01&strategy=moving-average&capital=10000
```

**Example Response** (enhanced with backtest data):
```json
{
  "tickers": [
    {
      "time": "2025-10-01 09:15:00.000",
      "price": 154.80,
      "volume": 1234
    },
    {
      "time": "2025-10-01 09:15:01.000",
      "price": 155.20,
      "volume": 567
    }
    // ... more tickers
  ],
  "significantMoves": [
    {
      "timestamp": "2025-10-01 09:32:54.600",
      "emissionTime": "2025-10-01 09:32:59.000",
      "price": 165.55,
      "type": "dip",
      "magnitude": 4.89
    }
    // ... more signals
  ],
  "backtestResult": {
    "strategyName": "MovingAverageStrategy",
    "symbol": "NIFTY25O0724600CE",
    "period": "2025-10-01 09:15:00 - 15:30:00",
    "initialCapital": 10000.0,
    "finalValue": 10847.50,
    "netProfitLoss": 847.50,
    "profitLossPercent": 8.48,
    "totalTrades": 15,
    "winningTrades": 11,
    "losingTrades": 4,
    "winRate": 73.33,
    "profitFactor": 2.45,
    "maxDrawdown": -337.00,
    "maxDrawdownPercent": -3.21,
    "averageWin": 125.60,
    "averageLoss": -45.30,
    "largestWin": 245.80,
    "largestLoss": -89.20,
    "sharpeRatio": 2.66,
    "trades": [
      {
        "tradeNumber": 1,
        "symbol": "NIFTY25O0724600CE",
        "type": "LONG",
        "entryTime": "2025-10-01 09:32:59.000",
        "entryPrice": 165.72,
        "quantity": 6,
        "exitTime": "2025-10-01 09:34:26.200",
        "exitPrice": 175.57,
        "profitLoss": 59.10,
        "profitLossPercent": 5.94,
        "holdingPeriod": "PT1M27S",
        "exitReason": "SIGNAL"
      }
      // ... more trades
    ],
    "timeline": [
      {
        "timestamp": "2025-10-01 09:15:00",
        "cashBalance": 10000.0,
        "positionValue": 0.0,
        "totalValue": 10000.0,
        "unrealizedPnL": 0.0,
        "realizedPnL": 0.0
      }
      // ... snapshots at each ticker
    ]
  }
}
```

**Response Structure**:
- `tickers`: Array of all price/time/volume data points
- `significantMoves`: Signals detected by the strategy
- `backtestResult`: Complete backtest performance data (calculated incrementally)

### GET `/api/backtest/strategies`

**Description**: Lists all available strategies

**Example Response**:
```json
{
  "strategies": [
    {
      "name": "moving-average",
      "displayName": "MovingAverageStrategy",
      "description": "Mean reversion with confirmation",
      "enabled": true,
      "parameters": {
        "threshold": 0.5,
        "confirmation-window": 10
      }
    },
    {
      "name": "rsi",
      "displayName": "RSIStrategy",
      "description": "Relative Strength Index momentum",
      "enabled": false
    }
  ]
}
```

### GET `/api/ticker` with Multiple Strategies (Future Enhancement)

**Description**: Compare multiple strategies on same data by making multiple requests

**Approach**:
- Client makes separate `/api/ticker` requests for each strategy
- Client-side comparison of results
- No separate comparison endpoint needed

**Example**:
```javascript
// Frontend code to compare strategies
const strategies = ['moving-average', 'rsi', 'momentum'];
const results = await Promise.all(
  strategies.map(s =>
    fetch(`/api/ticker?symbol=XXX&date=YYY&strategy=${s}`)
  )
);

// Compare backtestResult from each response
const comparison = results.map(r => ({
  strategy: r.backtestResult.strategyName,
  profit: r.backtestResult.netProfitLoss,
  winRate: r.backtestResult.winRate
}));
```

---

## Frontend Integration

### Backtest Panel Component

**Location**: Below Signal Statistics Panel in TickerChart

**Visual Layout**:
```
┌────────────────────────────────────────────────────────────────────┐
│ 💰 Backtest (MovingAverage): $10,847.50 (+8.48%) | 15 trades      │
│ ✓11 wins (73%) ✗4 losses | P/F: 2.45x | Max DD: -3.21%            │
└────────────────────────────────────────────────────────────────────┘
```

### Trade Markers on Chart

**Buy Entry**: 🟢 Green circle at entry price
**Sell Exit**: 🔴 Red circle at exit price
**Connecting Line**: Dotted line from entry to exit

**Tooltip on Hover**:
```
Trade #5
────────
Entry:  09:45:12 @ ₹165.55
Exit:   10:12:45 @ ₹171.20
P/L:    +₹33.90 (+3.41%)
Hold:   27m 33s
Reason: SIGNAL
```

### Expandable Trade List

**Toggle Button**: "Show Trade Details ▼"

**Expanded View**:
```
┌─────────────────────────────────────────────────────────────┐
│ Trade History (15 trades)                                   │
├─────┬────────┬──────────┬──────────┬──────────┬────────────┤
│  #  │ Entry  │   Exit   │   P/L    │   %     │    Time    │
├─────┼────────┼──────────┼──────────┼──────────┼────────────┤
│  1  │ 165.72 │  175.57  │ +59.10   │ +5.94%  │  1m 27s    │
│  2  │ 171.30 │  168.75  │ -15.30   │ -1.49%  │  3m 48s    │
│  3  │ 178.50 │  186.15  │ +45.90   │ +4.29%  │  7m 15s    │
└─────┴────────┴──────────┴──────────┴──────────┴────────────┘
```

---

## Usage Examples

### Example 1: Load Chart with Backtesting

```bash
# Single API call returns tickers + signals + backtest results
curl "http://localhost:9090/api/ticker?symbol=NIFTY25O0724600CE&date=2025-10-01&strategy=moving-average"
```

**Response includes**:
- All ticker data
- Detected signals
- Complete backtest results with P/L

### Example 2: Change Strategy in application.yml

```yaml
app:
  backtest:
    default-strategy: "rsi"  # Switch to RSI strategy
```

### Example 3: Adjust Risk Parameters

```yaml
app:
  backtest:
    risk:
      position-size-percent: 20.0  # Increase to 20% per trade
      stop-loss-percent: 3.0       # Wider stop loss
```

### Example 4: Disable Backtesting (Optional)

```bash
# If you want only ticker data without backtest
curl "http://localhost:9090/api/ticker?symbol=XXX&date=YYY&enableBacktest=false"
```

### Example 5: Frontend Integration

```javascript
// Fetch ticker data with integrated backtest results
const response = await fetch(
  `/api/ticker?symbol=NIFTY25O0724600CE&date=2025-10-01&strategy=moving-average`
);
const data = await response.json();

// Display chart with tickers
renderChart(data.tickers);

// Display signal arrows
renderSignals(data.significantMoves);

// Display backtest panel
renderBacktestPanel(data.backtestResult);

// Display trade markers
renderTrades(data.backtestResult.trades);
```

---

## Future Enhancements

### Phase 2 Features (Performance Optimization)

1. **Optimized Incremental Processing**: Cache signal detection results to avoid recalculation
2. **Parallel Strategy Execution**: Run multiple strategies concurrently
3. **Walk-Forward Analysis**: Rolling window backtesting
4. **Monte Carlo Simulation**: Randomized scenario testing
5. **Parameter Optimization**: Grid search for best parameters

### Phase 3 Features (Advanced Capabilities)

1. **Multi-Symbol Backtesting**: Portfolio across multiple symbols
2. **Custom Commission Models**: Broker-specific fee structures
3. **Paper Trading Mode**: Real-time simulation with live data
4. **Broker Integration**: Connect to real trading accounts
5. **Alert System**: Notifications when signals occur

### Phase 4 Features (Intelligence)

1. **Strategy Ensemble**: Combine multiple strategies with voting
2. **Machine Learning Integration**: Adaptive strategy parameters
3. **Sentiment Analysis**: Incorporate news and social media data
4. **Market Regime Detection**: Adapt strategies to market conditions

---

## Conclusion

This backtesting framework provides a robust, config-driven platform for testing trading strategies on historical data with **real-time incremental simulation**. The architecture is designed for:

✅ **Ease of Use**: Simple YAML configuration
✅ **Real-Time Simulation**: Incremental ticker processing simulates live trading
✅ **Integrated Visualization**: No separate backtest controllers - results embedded in /api/ticker
✅ **Extensibility**: Easy to add new strategies with comprehensive Javadoc
✅ **Reliability**: Realistic simulation with proper risk management and no future bias
✅ **Performance**: Comprehensive metrics for strategy evaluation
✅ **Production-Ready**: Clean architecture ready for live trading

### Key Design Principles

1. **No Future Bias**: Decisions made only with data available at that point in time
2. **Incremental Processing**: Tickers processed one-by-one as they arrive
3. **Integrated Architecture**: Backtesting embedded in existing ticker endpoint
4. **Config-Driven**: All strategies configurable via application.yml
5. **Comprehensive Documentation**: Strategy descriptions in Javadoc for better clarity

---

**Document Version**: 2.0 (Real-Time Incremental Processing)
**Last Updated**: 2025-10-05
**Author**: ChartsSimulator Team
**Changes from v1.0**:
- Renamed `TradingStrategyInterface` → `Strategy`
- Added incremental processing approach
- Integrated with /api/ticker endpoint (removed separate backtest controllers)
- Moved strategy descriptions to class-level Javadoc
- Enhanced documentation with real-time simulation flow
