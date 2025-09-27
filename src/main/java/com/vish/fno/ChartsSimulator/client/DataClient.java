package com.vish.fno.ChartsSimulator.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vish.fno.ChartsSimulator.config.properties.DataProperties;
import com.vish.fno.ChartsSimulator.exception.DataFetchException;
import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.SymbolData;
import com.vish.fno.ChartsSimulator.util.ValidationUtils;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.conn.ssl.TrustSelfSignedStrategy;
import org.apache.http.impl.client.*;
import org.apache.http.message.BasicHeader;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.util.EntityUtils;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import javax.net.ssl.SSLContext;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

import static org.apache.http.HttpHeaders.CONTENT_TYPE;
import static org.apache.http.HttpStatus.SC_OK;

@Slf4j
@Component
public class DataClient {

    private final DataProperties dataProperties;
    private final CloseableHttpClient httpClient;
    private final ObjectMapper mapper;

    public DataClient(DataProperties dataProperties, ObjectMapper mapper) throws GeneralSecurityException {
        this.dataProperties = dataProperties;
        this.mapper = mapper;
        
        SSLContext sslContext = SSLContextBuilder.create()
                .loadTrustMaterial(new TrustSelfSignedStrategy())
                .build();

        httpClient = HttpClients.custom()
                .setSSLContext(sslContext)
                .setSSLHostnameVerifier(NoopHostnameVerifier.INSTANCE)
                .setConnectionReuseStrategy(DefaultClientConnectionReuseStrategy.INSTANCE)
                .setKeepAliveStrategy(DefaultConnectionKeepAliveStrategy.INSTANCE)
                .setServiceUnavailableRetryStrategy(new DefaultServiceUnavailableRetryStrategy(5, 2000))
                .build();
    }

    public List<Candle> getCandleData(String symbol, String date) {
        if (!ValidationUtils.isValidSymbol(symbol) || !ValidationUtils.isValidDate(date)) {
            String errorMsg = String.format("Invalid parameters - Symbol: %s, Date: %s", symbol, date);
            log.warn(errorMsg);
            throw new DataFetchException("Invalid parameters", symbol, date, "N/A", 0, errorMsg);
        }

        final String url = getUrl(symbol, date);
        log.info("Fetching candle data - Symbol: {}, Date: {}, URL: {}", symbol, date, url);

        try {
            return getCandleDataAsync(symbol, date, url).get();
        } catch (InterruptedException | ExecutionException e) {
            log.error("Error fetching candle data - Symbol: {}, Date: {}, URL: {}", symbol, date, url, e);
            throw new DataFetchException("Failed to fetch candle data", symbol, date, url, 0, "Execution error", e);
        }
    }

    private String getUrl(String symbol, String date) {
        return dataProperties.baseurl() + date + "/" + URLEncoder.encode(symbol, StandardCharsets.UTF_8).replace("+", "%20");
    }

    public CompletableFuture<List<Candle>> getCandleDataAsync(String symbol, String date, String url) {
        HttpGet httpGet = new HttpGet(url);
        httpGet.setHeader(new BasicHeader(CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));

        return CompletableFuture
                .supplyAsync(() -> executeGetRequest(symbol, date, url, httpGet))
                .thenApplyAsync(responseInfo -> parseResponse(symbol, date, url, responseInfo));
    }

    private ResponseInfo executeGetRequest(String symbol, String date, String url, HttpGet request) {
        try {
            CloseableHttpResponse response = httpClient.execute(request);
            return new ResponseInfo(symbol, date, url, response);
        } catch (IOException e) {
            log.error("Error sending HTTP request - Symbol: {}, Date: {}, URL: {}", symbol, date, url, e);
            throw new DataFetchException("HTTP request failed", symbol, date, url, 0, "IOException: " + e.getMessage(), e);
        }
    }

    private List<Candle> parseResponse(String symbol, String date, String url, ResponseInfo responseInfo) {
        CloseableHttpResponse response = responseInfo.response;
        String responseJson = null;
        int statusCode = response.getStatusLine().getStatusCode();

        try {
            HttpEntity entity = response.getEntity();
            if (entity != null) {
                responseJson = EntityUtils.toString(entity);

                // Check HTTP status code
                if (statusCode != SC_OK) {
                    throw new DataFetchException("HTTP error", symbol, date, url, statusCode, responseJson);
                }

                // Check if response is empty
                if (responseJson == null || responseJson.trim().isEmpty()) {
                    throw new DataFetchException("Empty response content", symbol, date, url, statusCode, "Empty response");
                }

                log.debug("Received response - Symbol: {}, Date: {}, Status: {}, Content length: {}",
                    symbol, date, statusCode, responseJson.length());

                SymbolData symbolData = mapper.readValue(responseJson, SymbolData.class);
                List<Candle> candleSticks = symbolData.data();

                if (candleSticks == null || candleSticks.isEmpty()) {
                    throw new DataFetchException("No candle data found in response", symbol, date, url, statusCode, responseJson);
                }

                return candleSticks.stream()
                        .map(c -> new Candle(c.time(), c.open(), c.high(), c.low(), c.close(), c.volume(), c.oi()))
                        .collect(Collectors.toList());
            } else {
                throw new DataFetchException("Empty response entity", symbol, date, url, statusCode, "No HTTP entity");
            }
        } catch (IOException e) {
            log.error("Error parsing response - Symbol: {}, Date: {}, URL: {}, Status: {}", symbol, date, url, statusCode, e);
            throw new DataFetchException("JSON parsing failed", symbol, date, url, statusCode, responseJson, e);
        } finally {
            try {
                response.close();
            } catch (IOException e) {
                log.warn("Error closing response - Symbol: {}, Date: {}", symbol, date, e);
            }
        }
    }

    // Helper class to carry response context
    private static class ResponseInfo {
        final String symbol;
        final String date;
        final String url;
        final CloseableHttpResponse response;

        ResponseInfo(String symbol, String date, String url, CloseableHttpResponse response) {
            this.symbol = symbol;
            this.date = date;
            this.url = url;
            this.response = response;
        }
    }

    @PreDestroy
    public void close() throws Exception {
        httpClient.close();
    }
}
