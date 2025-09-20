// Export all chart components for easy importing
export { default as ChartContainer } from './ChartContainer';
export { default as UnifiedChart } from './UnifiedChart';
import UnifiedChart from './UnifiedChart';
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

export const CombinedChart = (props) => (
  <UnifiedChart
    showHeikinAshi={true}
    showExtrema={false}
    showWyckoffPhases={true}
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
