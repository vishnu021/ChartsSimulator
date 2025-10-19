package com.vish.fno.ChartsSimulator.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

    /**
     * Handle root path - forward to dashboard as default page
     */
    @GetMapping("/")
    public String root() {
        return "forward:/index.html";
    }

    /**
     * Handle specific SPA routes - forward to their respective index.html files
     * This ensures that direct navigation to /ticker/, /candles/, etc. works properly
     */
    @GetMapping(value = {"/ticker", "/ticker/"})
    public String ticker() {
        return "forward:/ticker/index.html";
    }

    @GetMapping(value = {"/candles", "/candles/"})
    public String candles() {
        return "forward:/candles/index.html";
    }

    @GetMapping(value = {"/charts", "/charts/"})
    public String charts() {
        return "forward:/charts/index.html";
    }

    @GetMapping(value = {"/extrema", "/extrema/"})
    public String extrema() {
        return "forward:/extrema/index.html";
    }

    @GetMapping(value = {"/dashboard", "/dashboard/"})
    public String dashboard() {
        return "forward:/dashboard/index.html";
    }

    @GetMapping(value = {"/custom-candles", "/custom-candles/"})
    public String customerCandles() {
        return "forward:/custom-candles/index.html";
    }
    @GetMapping(value = {"/backtest", "/backtest/"})
    public String backtest() {
        return "forward:/backtest/index.html";
    }
}
