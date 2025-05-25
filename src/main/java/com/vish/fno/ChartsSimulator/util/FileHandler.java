package com.vish.fno.ChartsSimulator.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vish.fno.ChartsSimulator.model.Candle;
import lombok.NoArgsConstructor;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@NoArgsConstructor
public final class FileHandler {

    private final static ObjectMapper mapper = new ObjectMapper();

    public static List<Candle> getCandles(String symbol, String date) throws IOException {
        String fileName = symbol.toUpperCase().replaceAll(" ", "_") + ".txt";
        // Read candles from file
        ClassPathResource resource = new ClassPathResource(fileName);
        List<Candle> candles;
        try (InputStream is = resource.getInputStream()) {
            candles = mapper.readValue(is, new TypeReference<>() {});
        }
        // Sort by time
//        return candles.stream()
//                .sorted(Comparator.comparing(Candle::time))
//                .collect(Collectors.toList());

        return null;
    }
}
