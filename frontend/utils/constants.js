// Chart constants
export const CHART_CONSTANTS = {
  MIN_ZOOM: 1.0,
  MAX_ZOOM: 100,
  MIN_VERTICAL_ZOOM: 1.0,
  MAX_VERTICAL_ZOOM: 20,
  
  ANIMATION: {
    FRICTION: 0.9,
    SPRING_STRENGTH: 0.1,
    VELOCITY_THRESHOLD: 0.1,
    OFFSET_THRESHOLD: 0.1
  },
  
  GRID_LINES: {
    HORIZONTAL_DESKTOP: 8,
    HORIZONTAL_MOBILE: 4,
    VERTICAL_DESKTOP: 10,
    VERTICAL_MOBILE: 6
  },
  
  CANDLE: {
    BODY_WIDTH_RATIO: 0.8,
    MIN_BODY_HEIGHT: 1,
    WICK_LINE_WIDTH: 1
  },
  
  CROSSHAIR_LINE_WIDTH: 1,
  EXTREMA_LINE_WIDTH: 2,
  EXTREMA_POINT_RADIUS: 6
};

// UI constants
export const UI_CONSTANTS = {
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1440
  },
  
  PADDING: {
    DESKTOP: { top: 40, right: 80, bottom: 60, left: 80 },
    MOBILE: { top: 30, right: 40, bottom: 40, left: 60 }
  }
};

// Time format constants
export const TIME_FORMATS = {
  TIME_ONLY: 'HH:mm',
  TIME_WITH_SECONDS: 'HH:mm:ss',
  DATE_TIME: 'MMM dd HH:mm'
};