package com.vish.fno.ChartsSimulator.model;

import com.vish.fno.phaseanalyzer.model.Candle;

import java.util.List;

public record SymbolData (CandleMetaData record, List<Candle> data) {}
