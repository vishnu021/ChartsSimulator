package com.vish.fno.ChartsSimulator.util;

import lombok.extern.slf4j.Slf4j;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Utility class for network-related operations
 */
@Slf4j
public final class NetworkUtils {

    private NetworkUtils() {
        // Utility class - prevent instantiation
    }

    /**
     * Get all available network URLs for the application
     * @param port Server port
     * @return List of URLs where application is accessible
     * @throws SocketException if network interfaces cannot be accessed
     */
    public static List<String> getNetworkUrls(int port) throws SocketException {
        List<String> urls = new ArrayList<>();

        for (NetworkInterface networkInterface : Collections.list(NetworkInterface.getNetworkInterfaces())) {
            if (networkInterface.isLoopback() || !networkInterface.isUp()) {
                continue;
            }

            for (InetAddress address : Collections.list(networkInterface.getInetAddresses())) {
                if (address.isSiteLocalAddress() && !address.isLoopbackAddress()) {
                    String hostAddress = address.getHostAddress();
                    // Filter out IPv6 addresses for simplicity
                    if (!hostAddress.contains(":")) {
                        urls.add("http://" + hostAddress + ":" + port);
                    }
                }
            }
        }

        return urls;
    }

    /**
     * Get client IP address from request, considering proxy headers
     * @param xForwardedFor X-Forwarded-For header value
     * @param remoteAddr Remote address from request
     * @return Client IP address
     */
    public static String getClientIpAddress(String xForwardedFor, String remoteAddr) {
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // X-Forwarded-For can contain multiple IPs, take the first one
            return xForwardedFor.split(",")[0].trim();
        }
        return remoteAddr;
    }

    /**
     * Build base URL from request components
     * @param protocol Request protocol (http/https)
     * @param host Request host
     * @param port Request port
     * @return Base URL
     */
    public static String buildBaseUrl(String protocol, String host, int port) {
        if ((port == 80 && "http".equals(protocol)) || (port == 443 && "https".equals(protocol))) {
            // Default ports, omit port number
            return protocol + "://" + host;
        } else {
            // Non-default ports, include port number
            return protocol + "://" + host + ":" + port;
        }
    }

    /**
     * Get WebSocket protocol based on HTTP protocol
     * @param httpProtocol HTTP protocol (http/https)
     * @return WebSocket protocol (ws/wss)
     */
    public static String getWebSocketProtocol(String httpProtocol) {
        return "https".equals(httpProtocol) ? "wss" : "ws";
    }
}