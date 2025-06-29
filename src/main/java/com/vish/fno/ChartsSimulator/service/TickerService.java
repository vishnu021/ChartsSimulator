package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.ChartsSimulator.model.StockTicker;
import com.vish.fno.ChartsSimulator.model.Ticker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class TickerService {

    private final DataLoaderService dataLoaderService;

    public List<Ticker> getTickerData(String symbol, String date) {
        List<StockTicker> stockTickers =  dataLoaderService.getTickersForDateAndSymbol(date, symbol);
        return stockTickers.stream().map(st -> new Ticker(st.tickTimestamp(), st.closePrice(), st.lastTradedQuantity())).toList();
    }
}
