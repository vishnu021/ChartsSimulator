package com.vish.fno.ChartsSimulator.config;

import com.vish.fno.phaseanalyzer.analysis.WyckoffAnalysisService;
import com.vish.fno.phaseanalyzer.analysis.WyckoffPhaseAnalyzer;
import com.vish.fno.phaseanalyzer.analysis.impl.HeikinAshiWyckoffPhaseAnalyzer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for Wyckoff Phase Analysis beans.
 * This creates all beans from the phase-analyzer module manually,
 * avoiding component scanning across modules.
 */
@Configuration
public class WyckoffAnalysisConfig {

    /**
     * Creates the Wyckoff Phase Analyzer implementation.
     * Currently using HeikinAshiWyckoffPhaseAnalyzer as the default implementation.
     *
     * @return WyckoffPhaseAnalyzer instance
     */
    @Bean
    public WyckoffPhaseAnalyzer wyckoffPhaseAnalyzer() {
        // Create default parameters for the analyzer
        HeikinAshiWyckoffPhaseAnalyzer.Params params = new HeikinAshiWyckoffPhaseAnalyzer.Params();

        // You can customize parameters here or load from application.yml
        // For now, using defaults

        return new HeikinAshiWyckoffPhaseAnalyzer(params);
    }

    /**
     * Creates the Wyckoff Analysis Service that wraps the analyzer.
     *
     * @param analyzer The analyzer implementation
     * @return WyckoffAnalysisService instance
     */
    @Bean
    public WyckoffAnalysisService wyckoffAnalysisService(WyckoffPhaseAnalyzer analyzer) {
        return new WyckoffAnalysisService(analyzer);
    }
}
