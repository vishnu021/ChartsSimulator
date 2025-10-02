export const CHART_CONSTANTS = {
  MIN_ZOOM: 1.0,
  MAX_ZOOM: 50,
  MIN_VERTICAL_ZOOM: 1.0,
  MAX_VERTICAL_ZOOM: 10,

  PADDING: {
    DESKTOP: { top: 40, right: 80, bottom: 60, left: 80 },
    MOBILE: { top: 30, right: 40, bottom: 40, left: 60 },
  },

  GRID_LINES: {
    HORIZONTAL_DESKTOP: 8,
    HORIZONTAL_MOBILE: 4,
    VERTICAL: 10,
  },

  CANDLE: {
    BODY_WIDTH_RATIO: 0.7,
    MIN_BODY_HEIGHT: 1,
    WICK_LINE_WIDTH: 1,
  },

  ANIMATION: {
    FRICTION: 0.9,
    SPRING_STRENGTH: 0.1,
    VELOCITY_THRESHOLD: 0.1,
    OFFSET_THRESHOLD: 0.1,
  },

  ZOOM_SPEED: 0.002,
  CROSSHAIR_LINE_WIDTH: 1,
  EXTREMA_POINT_RADIUS: 6,
  EXTREMA_LINE_WIDTH: 2,
  MAX_TICKER_POINTS: 10000,
  FRAME_DELAY_MS: 16,

  WEBSOCKET: {
    RECONNECT_DELAY: 5000,
    HEARTBEAT_INCOMING: 4000,
    HEARTBEAT_OUTGOING: 4000,
    CLEANUP_DELAY: 2000,
  },
};

export const UI_CONSTANTS = {
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1200,
  },

  LOADING_DELAYS: {
    WEBSOCKET_TIMEOUT: 2000,
    DEBOUNCE_MS: 300,
  },

  PADDING: {
    DESKTOP: { top: 50, right: 90, bottom: 120, left: 90 }, // Increased bottom from 90 to 120
    MOBILE: { top: 40, right: 50, bottom: 90, left: 70 }, // Increased bottom from 70 to 90
    DASHBOARD_DESKTOP: { top: 25, right: 35, bottom: 60, left: 45 },
    DASHBOARD_MOBILE: { top: 20, right: 25, bottom: 50, left: 35 },
  },

  ROUTES: {
    HOME: '/',
    CANDLES: '/candles',
    EXTREMA: '/extrema',
    CHARTS: '/charts',
    TICKER: '/ticker',
  },
};

export const API_CONSTANTS = {
  ENDPOINTS: {
    CHARTS: '/api/charts',
    OHLC: '/api/ohlc',
    TICKER: '/api/ticker',
    FUTURES_HISTORICAL: '/api/v1/futuresHistoricalData',
    FUTURES_DATA: '/api/v1/futuresData',
    FUTURES_CONTRACTS: '/api/futures/contracts',
  },

  WEBSOCKET_DESTINATIONS: {
    CANDLES: '/topic/candles',
    TICKER: '/topic/ticker',
    ERROR: '/user/queue/error',
    LOAD_CANDLES: '/app/loadCandles',
    LOAD_TICKER: '/app/loadTicker',
    DISCONNECT_CANDLES: '/app/disconnectCandles',
    DISCONNECT_TICKER: '/app/disconnectTicker',
  },

  DEFAULT_PARAMS: {
    LOOKBACK_PERIOD: 5,
    CHART_TYPES: 'CANDLESTICK,HEIKIN_ASHI',
  },
};
