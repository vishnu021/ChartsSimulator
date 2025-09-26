package com.vish.fno.ChartsSimulator.config.properties;

import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.Map;

/**
 * Configuration properties for futures symbol mapping and analysis
 */
@ConfigurationProperties("app.futures")
@Validated
public record FuturesProperties(
    @NotEmpty(message = "Symbol mappings cannot be empty")
    Map<String, String> symbolMappings,

    @NotEmpty(message = "Month codes cannot be empty")
    Map<String, String> monthCodes,

    boolean enabled
) {

    /**
     * Generate futures symbol for given underlying symbol, month and year
     * @param underlyingSymbol Base symbol (e.g., "NIFTY 50")
     * @param month Month (1-12 or month name)
     * @param year Year (e.g., 2025)
     * @return Futures symbol (e.g., "NIFTY25SEPFUT")
     */
    public String generateFuturesSymbol(String underlyingSymbol, String month, int year) {
        String prefix = symbolMappings.get(underlyingSymbol);
        if (prefix == null) {
            return underlyingSymbol; // Return as-is if no mapping found
        }

        String monthCode = getMonthCode(month);
        String yearSuffix = String.valueOf(year).substring(2); // Last 2 digits of year

        return prefix + yearSuffix + monthCode + "FUT";
    }

    private String getMonthCode(String month) {
        // Try to get by month name first
        String code = monthCodes.get(month.toUpperCase());
        if (code != null) {
            return code;
        }

        // Try to convert month number to name
        try {
            int monthNum = Integer.parseInt(month);
            return switch (monthNum) {
                case 1 -> monthCodes.get("JANUARY");
                case 2 -> monthCodes.get("FEBRUARY");
                case 3 -> monthCodes.get("MARCH");
                case 4 -> monthCodes.get("APRIL");
                case 5 -> monthCodes.get("MAY");
                case 6 -> monthCodes.get("JUNE");
                case 7 -> monthCodes.get("JULY");
                case 8 -> monthCodes.get("AUGUST");
                case 9 -> monthCodes.get("SEPTEMBER");
                case 10 -> monthCodes.get("OCTOBER");
                case 11 -> monthCodes.get("NOVEMBER");
                case 12 -> monthCodes.get("DECEMBER");
                default -> "UNK";
            };
        } catch (NumberFormatException e) {
            return "UNK"; // Unknown month
        }
    }
}