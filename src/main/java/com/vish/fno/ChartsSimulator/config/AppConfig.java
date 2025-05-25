//package com.vish.fno.ChartsSimulator.config;
//
//import org.apache.hc.client5.http.impl.classic.HttpClients;
//import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
//import org.apache.hc.client5.http.socket.ConnectionSocketFactory;
//import org.apache.hc.client5.http.ssl.NoopHostnameVerifier;
//import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactory;
//import org.apache.hc.core5.http.config.Registry;
//import org.apache.hc.core5.http.config.RegistryBuilder;
//import org.apache.hc.core5.ssl.SSLContextBuilder;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
//import org.springframework.web.client.RestTemplate;
//
//import javax.net.ssl.SSLContext;
//
//@Configuration
//public class AppConfig {
//
//    @Bean
//    public RestTemplate restTemplate() throws Exception {
//        // 1) build an all-trusting SSLContext
//        SSLContext sslContext = SSLContextBuilder
//                .create()
//                .loadTrustMaterial(null, (chain, authType) -> true)
//                .build();
//
//        // 2) wrap it in a socket factory
//        SSLConnectionSocketFactory csf = new SSLConnectionSocketFactory(
//                sslContext,
//                NoopHostnameVerifier.INSTANCE
//        );
//
//        // 3) register it under "https" in a socket factory registry
//        Registry<ConnectionSocketFactory> registry = RegistryBuilder.<ConnectionSocketFactory>create()
//                .register("https", csf)
//                .build();
//
//        // 4) create a connection manager using that registry
//        PoolingHttpClientConnectionManager cm = new PoolingHttpClientConnectionManager(registry);
//
//        // 5) build your HttpClient with that manager
//        org.apache.hc.client5.http.classic.HttpClient httpClient = HttpClients.custom()
//                .setConnectionManager(cm)
//                .build();
//
//        // 6) plug it into Spring’s RestTemplate
//        HttpComponentsClientHttpRequestFactory requestFactory =
//                new HttpComponentsClientHttpRequestFactory(httpClient);
//
//        return new RestTemplate(requestFactory);
//    }
//}
