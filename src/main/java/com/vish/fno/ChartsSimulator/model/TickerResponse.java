package com.vish.fno.ChartsSimulator.model;

import java.util.List;

/**
 * Response model for ticker API containing both tick data and detected significant moves.
 * This provides a complete view of price movements along with key trading signals.
 */
public record TickerResponse(
        List<Ticker> tickers,                    // Raw tick-by-tick price data
        List<SignificantMove> significantMoves   // Detected dips and peaks
) {}
