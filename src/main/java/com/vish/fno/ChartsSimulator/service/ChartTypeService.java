package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.ChartsSimulator.client.DataClient;
import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.ChartTypeResponse;
import com.vish.fno.ChartsSimulator.model.WyckoffPhase;
import com.vish.fno.ChartsSimulator.model.WyckoffPhaseData;
import com.vish.fno.ChartsSimulator.util.HeikinAshi;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@AllArgsConstructor
@Component
public class ChartTypeService {

    private final DataClient dataClient;
    private final WyckoffAnalysisService wyckoffAnalysisService;

    public ChartTypeResponse getChartData(String symbol, String date, String chartTypes) {
        List<Candle> candles = dataClient.getCandleData(symbol, date);
        List<Candle> haCandles = HeikinAshi.getCandles(candles);

        // Calculate Wyckoff phases
        List<WyckoffPhaseData> wyckoffPhases = wyckoffAnalysisService.analyzeWyckoffPhases(candles);
        WyckoffPhase currentPhase = wyckoffAnalysisService.getCurrentPhase(candles);

        return new ChartTypeResponse(candles, haCandles, wyckoffPhases, currentPhase);
    }

    public List<ChartTypeResponse> getChartDataStream(String symbol, String date, String s) {
        List<Candle> candles = dataClient.getCandleData(symbol, date);
        List<Candle> haCandles = HeikinAshi.getCandles(candles);

        // Calculate Wyckoff phases for streaming
        List<WyckoffPhaseData> wyckoffPhases = wyckoffAnalysisService.analyzeWyckoffPhases(candles);
        WyckoffPhase currentPhase = wyckoffAnalysisService.getCurrentPhase(candles);

        return List.of(new ChartTypeResponse(candles, haCandles, wyckoffPhases, currentPhase));
    }
}
