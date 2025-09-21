import UnifiedChart from './UnifiedChart';
import EnhancedCombinedChart from './EnhancedCombinedChart';

// Export all chart components for easy importing
export { default as ChartContainer } from './ChartContainer';
export { default as UnifiedChart } from './UnifiedChart';
export { default as ChartPanel } from './ChartPanel';
export { default as EnhancedCombinedChart } from './EnhancedCombinedChart';
export { default as UniversalChart } from './UniversalChart';
export { renderXAxis, renderYAxis, renderGrid } from './AxisRenderer';
export { renderWyckoffPhases } from './WyckoffPhaseRenderer';
export { renderCandlesticks, renderHeikinAshi } from './CandlestickRenderer';
export { renderExtrema } from './ExtremaRenderer';

// Convenient preset components for common use cases
export const CandlestickChart = (props) => (
  <UnifiedChart
    showHeikinAshi={false}
    showExtrema={false}
    showWyckoffPhases={true}
    {...props}
  />
);

export const ExtremaChart = (props) => (
  <UnifiedChart
    showHeikinAshi={false}
    showExtrema={true}
    showWyckoffPhases={true}
    {...props}
  />
);

// Universal Combined Chart - automatically handles any data structure
export const CombinedChart = (props) => (
  <EnhancedCombinedChart
    {...props}
  />
);

export const DashboardChart = (props) => (
  <UnifiedChart
    enableInteraction={false}
    showAxes={false}
    showWyckoffPhases={false}
    {...props}
  />
);
