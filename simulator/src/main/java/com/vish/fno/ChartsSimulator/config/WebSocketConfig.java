package com.vish.fno.ChartsSimulator.config;

import com.vish.fno.ChartsSimulator.config.properties.WebSocketProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

/**
 * Configuration class for WebSocket settings.
 * Configures STOMP endpoint and message broker for real-time communication.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketProperties webSocketProperties;

    /**
     * Registers STOMP endpoints for WebSocket connections.
     * Configures SockJS fallback and allowed origins for CORS.
     *
     * @param registry STOMP endpoint registry
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry
                .addEndpoint(webSocketProperties.endpoint())
                .setAllowedOrigins(webSocketProperties.allowedOrigins().split(","))
                .withSockJS();
    }

    /**
     * Configures the message broker for handling WebSocket messages.
     * Sets up topic destinations and application prefixes.
     *
     * @param config Message broker registry configuration
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
}
