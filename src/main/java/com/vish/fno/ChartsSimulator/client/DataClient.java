package com.vish.fno.ChartsSimulator.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.SymbolData;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import javax.net.ssl.SSLContext;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.sql.Date;
import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

import static org.apache.http.HttpHeaders.CONTENT_TYPE;


@Slf4j
@Component
public class DataClient {
    private final static String baseurl= "https://127.0.0.1/api/v1/historicalData/";
    private static final String DATE_FORMAT = "yyyy-MM-dd";
    private final CloseableHttpClient httpClient;
    private final ObjectMapper mapper = new ObjectMapper();

    public DataClient() throws GeneralSecurityException {

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

    public List<Candle> getCandleData(String url) {
        try {
            return getCandleDataAsync(url).get();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException(e);
        }
    }

    public List<Candle> getCandleData(String symbol, String date) {
        if(isValidSymbolAndDate(symbol, date)) {
            log.warn("Invalid symbol {} or date {}", symbol, date);
            return null;
        }
        try {
            final String url = getUrl(symbol, date);
            return getCandleDataAsync(url).get();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException(e);
        }
    }

    public List<Candle> getCandleDayData(String symbol, String from, String to) {
        try {
            final String url = getDayDataUrl(symbol, from, to);
            HttpGet httpGet = new HttpGet(url);
            httpGet.setHeader(new BasicHeader(CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));
            CloseableHttpResponse response = httpClient.execute(httpGet);
            String responseJson;

            HttpEntity entity = response.getEntity();

            if(response.getStatusLine().getStatusCode() == HttpStatus.BAD_REQUEST.value()) {
                log.warn("Data not available for symbol : {}, from : {}, to: {}", symbol, from, to);
                return List.of();
            }

            if(response.getStatusLine().getStatusCode() == HttpStatus.NOT_FOUND.value()) {
                log.error("Service not available");
                throw new RuntimeException("Service not available");
            }

            if (entity != null) {
                responseJson = EntityUtils.toString(entity);
                log.debug("responseJson : {}", responseJson);
                return mapper.readValue(responseJson,  new TypeReference<List<Candle>>() {});
            } else {
                throw new RuntimeException("Empty response entity");
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public List<Candle> getCandleDayData(String url) {
        HttpGet httpGet = new HttpGet(url);
        httpGet.setHeader(new BasicHeader(CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));


        CloseableHttpResponse response = executeGetRequest(httpGet);

        {
            String responseJson = null;
            try {
                HttpEntity entity = response.getEntity();
                if (entity != null) {
                    responseJson = EntityUtils.toString(entity);
                    log.debug("responseJson : {}", responseJson);
                    return mapper.readValue(responseJson,  new TypeReference<List<Candle>>() {});
                } else {
                    throw new RuntimeException("Empty response entity");
                }
            } catch (IOException e) {
                throw new RuntimeException(String.format("Error getting response content, received : %s", responseJson), e);
            }
        }

//        return CompletableFuture
//                .supplyAsync(() -> executeGetRequest(httpGet))
//                .thenApplyAsync(this::parseResponse);
    }

    private boolean isValidSymbolAndDate(String symbol, String date) {
        return symbol == null || date == null || !date.matches("\\d{4}-\\d{2}-\\d{2}");
    }

    private String getUrl(String symbol, Date date) {
        return getUrl(symbol, getStringDate(date));
    }

    private String getUrl(String symbol, String date) {
        return baseurl + date + "/" +  URLEncoder.encode(symbol, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private String getDayDataUrl(String symbol, String from, String to) {
        return String.format("%s%s/%s/%s/day",
                baseurl,
                from,
                to,
                URLEncoder.encode(symbol, StandardCharsets.UTF_8).replace("+", "%20"));
    }


    public CompletableFuture<List<Candle>> getCandleDataAsync(String url) {
        HttpGet httpGet = new HttpGet(url);
        httpGet.setHeader(new BasicHeader(CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));

        return CompletableFuture
                .supplyAsync(() -> executeGetRequest(httpGet))
                .thenApplyAsync(this::parseResponse);
    }

    // then apply async to return value
    // then compose to return completable future

    private CloseableHttpResponse executeGetRequest(HttpGet request) {
        try {
            return httpClient.execute(request);
        } catch (IOException e) {
            throw new RuntimeException("Error sending request", e);
        }
    }

    private List<Candle> parseResponse(CloseableHttpResponse response) {
        String responseJson = null;
        try {
            HttpEntity entity = response.getEntity();
            if (entity != null) {
                responseJson = EntityUtils.toString(entity);
                SymbolData symbolData = mapper.readValue(responseJson, SymbolData.class);
                List<Candle> candleSticks = symbolData.getData();
                return candleSticks.stream()
                        .map(c -> new Candle(c.time(), c.open(), c.high(), c.low(), c.close(), c.volume(), c.oi()))
                        .collect(Collectors.toList());
            } else {
                throw new RuntimeException("Empty response entity");
            }
        } catch (IOException e) {
            throw new RuntimeException(String.format("Error getting response content, received : %s", responseJson), e);
        }
    }

    @PreDestroy
    public void close() throws Exception {
        httpClient.close();
    }

    public static String getStringDate(java.util.Date date) {
        if(date==null) {
            return "";
        }
        SimpleDateFormat dateFormatter = new SimpleDateFormat(DATE_FORMAT, Locale.ENGLISH);
        return dateFormatter.format(date);
    }
}
