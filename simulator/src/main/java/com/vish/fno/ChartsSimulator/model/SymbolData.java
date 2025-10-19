package com.vish.fno.ChartsSimulator.model;

import com.vish.fno.models.Candle;

import java.util.List;

public record SymbolData (CandleMetaData record, List<Candle> data) {}
