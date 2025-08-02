package com.vish.fno.ChartsSimulator.exception;

public class DataFetchException extends RuntimeException {
    private final String symbol;
    private final String date;
    private final String url;
    private final int statusCode;
    private final String responseContent;

    public DataFetchException(String message, String symbol, String date, String url, int statusCode, String responseContent, Throwable cause) {
        super(formatMessage(message, symbol, date, url, statusCode, responseContent), cause);
        this.symbol = symbol;
        this.date = date;
        this.url = url;
        this.statusCode = statusCode;
        this.responseContent = responseContent;
    }

    public DataFetchException(String message, String symbol, String date, String url, int statusCode, String responseContent) {
        this(message, symbol, date, url, statusCode, responseContent, null);
    }

    private static String formatMessage(String message, String symbol, String date, String url, int statusCode, String responseContent) {
        StringBuilder sb = new StringBuilder();
        sb.append("Data fetch failed: ").append(message);
        sb.append("\n  Symbol: ").append(symbol);
        sb.append("\n  Date: ").append(date);
        sb.append("\n  URL: ").append(url);
        sb.append("\n  Status Code: ").append(statusCode);
        sb.append("\n  Response Content: ").append(responseContent != null && !responseContent.isEmpty() ? 
            (responseContent.length() > 500 ? responseContent.substring(0, 500) + "..." : responseContent) : "Empty/Null");
        return sb.toString();
    }

    // Getters
    public String getSymbol() { return symbol; }
    public String getDate() { return date; }
    public String getUrl() { return url; }
    public int getStatusCode() { return statusCode; }
    public String getResponseContent() { return responseContent; }
}