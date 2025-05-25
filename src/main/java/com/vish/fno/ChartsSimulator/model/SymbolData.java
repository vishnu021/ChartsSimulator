package com.vish.fno.ChartsSimulator.model;

import java.util.List;

public record SymbolData (CandleMetaData record, List<Candle> data) {}
