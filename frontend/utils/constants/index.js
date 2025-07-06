export const CHART_CONSTANTS = {
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 50,
    MIN_VERTICAL_ZOOM: 0.5,
    MAX_VERTICAL_ZOOM: 10,

    PADDING: {
        DESKTOP: { top: 40, right: 80, bottom: 60, left: 80 },
        MOBILE: { top: 30, right: 40, bottom: 40, left: 60 }
    },

    GRID_LINES: {
        HORIZONTAL_DESKTOP: 8,
        HORIZONTAL_MOBILE: 4,
        VERTICAL: 10
    },

    CANDLE: {
        BODY_WIDTH_RATIO: 0.7,
        MIN_BODY_HEIGHT: 1,
        WICK_LINE_WIDTH: 1
    },

    ANIMATION: {
        FRICTION: 0.9,
        SPRING_STRENGTH: 0.1,
        VELOCITY_THRESHOLD: 0.1,
        OFFSET_THRESHOLD: 0.1
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
        CLEANUP_DELAY: 2000
    }
};

export const UI_CONSTANTS = {
    BREAKPOINTS: {
        MOBILE: 768,
        TABLET: 1024,
        DESKTOP: 1200
    },

    LOADING_DELAYS: {
        WEBSOCKET_TIMEOUT: 2000,
        DEBOUNCE_MS: 300
    },

    ROUTES: {
        HOME: '/',
        CANDLES: '/candles',
        EXTREMA: '/extrema',
        CHARTS: '/charts',
        TICKER: '/ticker'
    }
};

export const API_CONSTANTS = {
    ENDPOINTS: {
        CHARTS: '/charts',
        OHLC: '/ohlc',
        TICKER: '/ticker'
    },

    WEBSOCKET_DESTINATIONS: {
        CANDLES: '/topic/candles',
        TICKER: '/topic/ticker',
        ERROR: '/user/queue/error',
        LOAD_CANDLES: '/app/loadCandles',
        LOAD_TICKER: '/app/loadTicker',
        DISCONNECT_CANDLES: '/app/disconnectCandles',
        DISCONNECT_TICKER: '/app/disconnectTicker'
    },

    DEFAULT_PARAMS: {
        LOOKBACK_PERIOD: 5,
        CHART_TYPES: 'CANDLESTICK,HEIKIN_ASHI'
    }
};
