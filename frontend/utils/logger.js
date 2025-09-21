/* eslint-disable no-console */

// Lightweight browser logger with level control and scoping
// Usage: import { logger } from '@/utils/logger';
// logger.debug('message', { context });
// const log = logger.withScope('WebSocket'); log.info('connected');

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
};

function getEnvLevel() {
  const env = typeof process !== 'undefined' ? process.env : {};
  const explicit = env.NEXT_PUBLIC_LOG_LEVEL && String(env.NEXT_PUBLIC_LOG_LEVEL).toLowerCase();
  if (explicit && LEVELS[explicit] !== undefined) return explicit;
  // Default: verbose in development, warnings in production
  const nodeEnv = env.NODE_ENV;
  return nodeEnv === 'development' ? 'debug' : 'warn';
}

function createLogger(scope = null, level = getEnvLevel()) {
  const threshold = LEVELS[level] ?? LEVELS.warn;

  const format = (args) => {
    if (!scope) return args;
    const prefix = `[${scope}]`;
    if (typeof args[0] === 'string') {
      return [prefix + ' ' + args[0], ...args.slice(1)];
    }
    return [prefix, ...args];
  };

  const shouldLog = (lvl) => LEVELS[lvl] >= threshold && threshold < LEVELS.silent;

  return {
    debug: (...args) => {
      if (shouldLog('debug')) console.debug(...format(args));
    },
    info: (...args) => {
      if (shouldLog('info')) console.info(...format(args));
    },
    warn: (...args) => {
      if (shouldLog('warn')) console.warn(...format(args));
    },
    error: (...args) => {
      if (shouldLog('error')) console.error(...format(args));
    },
    withScope: (childScope) => createLogger(childScope, level),
    setLevel: (newLevel) => {
      if (LEVELS[newLevel] !== undefined) {
        level = newLevel;
      }
    },
  };
}

export const logger = createLogger();

