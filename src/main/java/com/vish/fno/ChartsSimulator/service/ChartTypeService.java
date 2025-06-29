package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.ChartsSimulator.client.DataClient;
import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.ChartTypeResponse;
import com.vish.fno.ChartsSimulator.util.HeikinAshi;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@AllArgsConstructor
@Component
public class ChartTypeService {

    private final DataClient dataClient;

    public ChartTypeResponse getChartData(String symbol, String date, String chartTypes) {
        List<Candle> candles = dataClient.getCandleData(symbol, date);
        List<Candle> haCandles = HeikinAshi.getCandles(candles);

        return new ChartTypeResponse(candles, haCandles);
    }

    public List<ChartTypeResponse> getChartDataStream(String symbol, String date, String s) {
        List<Candle> candles = dataClient.getCandleData(symbol, date);
        List<Candle> haCandles = HeikinAshi.getCandles(candles);

        return List.of(new ChartTypeResponse(candles, haCandles));
    }
}
