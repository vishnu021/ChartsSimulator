/**
 * Common Components and Utilities
 * Central export point for all shared chart components and utilities
 */

// Wyckoff Phase Rendering
export {
  drawWyckoffPhaseStrip,
  useWyckoffPhaseRenderer,
  wyckoffColors
} from './WyckoffPhaseRenderer';

// Crosshair Rendering
export {
  drawCrosshair,
  drawEnhancedCrosshair,
  useCrosshairRenderer
} from './CrosshairRenderer';

// Chart Utilities
export {
  canvasUtils,
  scalingUtils,
  drawingUtils,
  animationUtils,
  timeUtils
} from './ChartUtils';

// Re-export chart configuration for convenience
export { themes, chartSettings } from '../chartConfig';
