package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.model.backtest.BacktestResult;
import com.vish.fno.ChartsSimulator.model.backtest.Trade;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Generates backtest reports in console and CSV formats.
 *
 * <p><b>Features:</b></p>
 * <ul>
 *   <li>Console table with trade details</li>
 *   <li>CSV file generation with naming convention: symbol_date_strategy_timestamp.csv</li>
 *   <li>Automatic directory creation (backtest_reports/)</li>
 *   <li>Formatted P/L values with currency symbols</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 2.1.0
 */
@Slf4j
@Component
public class BacktestReportGenerator {

    private static final String REPORTS_DIR = "backtest_reports";
    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    /**
     * Generates console log and CSV file for backtest results.
     *
     * @param result Backtest results
     */
    public void generateReport(BacktestResult result) {
        log.info("📊 Generating backtest report...");

        // Log to console
        logTradeReport(result);

        // Generate CSV file
        String csvPath = generateCsvReport(result);

        if (csvPath != null) {
            log.info("✅ Report saved to: {}", csvPath);
        }
    }

    /**
     * Logs trade report to console in a formatted table.
     *
     * @param result Backtest results
     */
    private void logTradeReport(BacktestResult result) {
        List<Trade> trades = result.trades();

        if (trades.isEmpty()) {
            log.info("📋 No trades executed in this backtest");
            return;
        }

        boolean showPhase = result.phaseDetectionEnabled();
        int lineLength = showPhase ? 157 : 140;

        log.info("\n" + "=".repeat(lineLength));
        log.info("📈 BACKTEST TRADE REPORT - {} | {} | {}", result.symbol(), result.period(), result.strategyName());
        log.info("=".repeat(lineLength));

        if (showPhase) {
            log.info(String.format("%-4s | %-19s | %-10s | %-19s | %-10s | %-8s | %-10s | %-8s | %-12s | %-15s",
                    "No", "Entry Time", "Entry $", "Exit Time", "Exit $", "Qty", "P/L", "P/L %", "Phase", "Exit Reason"));
        } else {
            log.info(String.format("%-4s | %-19s | %-10s | %-19s | %-10s | %-8s | %-10s | %-8s | %-15s",
                    "No", "Entry Time", "Entry $", "Exit Time", "Exit $", "Qty", "P/L", "P/L %", "Exit Reason"));
        }
        log.info("-".repeat(lineLength));

        for (Trade trade : trades) {
            if (showPhase) {
                log.info(String.format("%-4d | %-19s | %-10.2f | %-19s | %-10.2f | %-8d | %-10.2f | %-8.2f | %-12s | %-15s",
                        trade.tradeNumber(),
                        trade.entryTime(),
                        trade.entryPrice(),
                        trade.exitTime(),
                        trade.exitPrice(),
                        trade.quantity(),
                        trade.profitLoss(),
                        trade.profitLossPercent(),
                        trade.phase() != null ? trade.phase().toString() : "N/A",
                        trade.exitReason()));
            } else {
                log.info(String.format("%-4d | %-19s | %-10.2f | %-19s | %-10.2f | %-8d | %-10.2f | %-8.2f | %-15s",
                        trade.tradeNumber(),
                        trade.entryTime(),
                        trade.entryPrice(),
                        trade.exitTime(),
                        trade.exitPrice(),
                        trade.quantity(),
                        trade.profitLoss(),
                        trade.profitLossPercent(),
                        trade.exitReason()));
            }
        }

        log.info("-".repeat(lineLength));
        log.info("📊 SUMMARY: Total Trades: {} | Winners: {} | Losers: {} | Win Rate: {:.2f}% | Net P/L: ₹{:.2f} ({:.2f}%)",
                result.totalTrades(),
                result.winningTrades(),
                result.losingTrades(),
                result.winRate(),
                result.netProfitLoss(),
                result.profitLossPercent());
        log.info("=".repeat(lineLength) + "\n");
    }

    /**
     * Generates CSV file with trade details.
     *
     * @param result Backtest results
     * @return Path to generated CSV file, or null if generation failed
     */
    private String generateCsvReport(BacktestResult result) {
        try {
            // Create reports directory if it doesn't exist
            Path reportsDir = Paths.get(REPORTS_DIR);
            if (!Files.exists(reportsDir)) {
                Files.createDirectories(reportsDir);
                log.debug("Created reports directory: {}", reportsDir.toAbsolutePath());
            }

            // Generate filename: symbol_date_strategy_timestamp.csv
            String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
            String cleanSymbol = result.symbol().replaceAll("[^a-zA-Z0-9]", "_");
            String cleanDate = result.period().split(" ")[0].replaceAll("[^0-9]", "");
            String cleanStrategy = result.strategyName().replaceAll("[^a-zA-Z0-9]", "_");
            String filename = String.format("%s_%s_%s_%s.csv", cleanSymbol, cleanDate, cleanStrategy, timestamp);

            Path csvPath = reportsDir.resolve(filename);

            // Write CSV file
            try (FileWriter writer = new FileWriter(csvPath.toFile())) {
                boolean showPhase = result.phaseDetectionEnabled();

                // Write header
                if (showPhase) {
                    writer.append("Trade No,Entry Time,Entry Price,Exit Time,Exit Price,Quantity,P/L,P/L %,Phase,Exit Reason,Holding Period\n");
                } else {
                    writer.append("Trade No,Entry Time,Entry Price,Exit Time,Exit Price,Quantity,P/L,P/L %,Exit Reason,Holding Period\n");
                }

                // Write trade data
                for (Trade trade : result.trades()) {
                    if (showPhase) {
                        writer.append(String.format("%d,%s,%.2f,%s,%.2f,%d,%.2f,%.2f,%s,%s,%s\n",
                                trade.tradeNumber(),
                                trade.entryTime(),
                                trade.entryPrice(),
                                trade.exitTime(),
                                trade.exitPrice(),
                                trade.quantity(),
                                trade.profitLoss(),
                                trade.profitLossPercent(),
                                trade.phase() != null ? trade.phase().toString() : "N/A",
                                trade.exitReason(),
                                formatDuration(trade.holdingPeriod())));
                    } else {
                        writer.append(String.format("%d,%s,%.2f,%s,%.2f,%d,%.2f,%.2f,%s,%s\n",
                                trade.tradeNumber(),
                                trade.entryTime(),
                                trade.entryPrice(),
                                trade.exitTime(),
                                trade.exitPrice(),
                                trade.quantity(),
                                trade.profitLoss(),
                                trade.profitLossPercent(),
                                trade.exitReason(),
                                formatDuration(trade.holdingPeriod())));
                    }
                }

                // Write summary section
                writer.append("\n");
                writer.append("SUMMARY\n");
                writer.append(String.format("Symbol,%s\n", result.symbol()));
                writer.append(String.format("Strategy,%s\n", result.strategyName()));
                writer.append(String.format("Period,%s\n", result.period()));
                writer.append(String.format("Initial Capital,%.2f\n", result.initialCapital()));
                writer.append(String.format("Final Value,%.2f\n", result.finalValue()));
                writer.append(String.format("Net P/L,%.2f\n", result.netProfitLoss()));
                writer.append(String.format("P/L Percent,%.2f\n", result.profitLossPercent()));
                writer.append(String.format("Total Trades,%d\n", result.totalTrades()));
                writer.append(String.format("Winning Trades,%d\n", result.winningTrades()));
                writer.append(String.format("Losing Trades,%d\n", result.losingTrades()));
                writer.append(String.format("Win Rate,%.2f\n", result.winRate()));
                writer.append(String.format("Profit Factor,%.2f\n", result.profitFactor()));
                writer.append(String.format("Max Drawdown,%.2f\n", result.maxDrawdown()));
                writer.append(String.format("Max Drawdown Percent,%.2f\n", result.maxDrawdownPercent()));
                writer.append(String.format("Average Win,%.2f\n", result.averageWin()));
                writer.append(String.format("Average Loss,%.2f\n", result.averageLoss()));
                writer.append(String.format("Largest Win,%.2f\n", result.largestWin()));
                writer.append(String.format("Largest Loss,%.2f\n", result.largestLoss()));
                writer.append(String.format("Sharpe Ratio,%.2f\n", result.sharpeRatio()));
            }

            return csvPath.toString();

        } catch (IOException e) {
            log.error("❌ Failed to generate CSV report: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Formats duration for display.
     *
     * @param duration Duration to format
     * @return Formatted duration string
     */
    private String formatDuration(java.time.Duration duration) {
        if (duration == null) {
            return "N/A";
        }

        long hours = duration.toHours();
        long minutes = duration.toMinutesPart();
        long seconds = duration.toSecondsPart();

        if (hours > 0) {
            return String.format("%dh %dm %ds", hours, minutes, seconds);
        } else if (minutes > 0) {
            return String.format("%dm %ds", minutes, seconds);
        } else {
            return String.format("%ds", seconds);
        }
    }
}
