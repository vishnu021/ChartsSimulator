/**
 * Option Service - Handles option symbol generation and ITM calculations
 */

/**
 * Generate ITM option symbol for a given underlying symbol and date
 * This is a simplified implementation that generates a basic ITM option symbol
 * In a real implementation, this would fetch current market data and calculate ITM strikes
 */
export const generateITMOptionSymbol = (underlyingSymbol, date) => {
  // Basic ITM option symbol generation
  // Format: UNDERLYING_DATE_STRIKE_TYPE (CE/PE)

  // Parse date to get expiry info (simplified)
  const dateObj = new Date(date);
  const year = dateObj.getFullYear().toString().slice(-2);
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  // Normalize underlying symbol for option naming
  const optionBase = underlyingSymbol.replace(/\s+/g, '').toUpperCase();

  // Common strike prices for major indices (simplified mapping)
  const strikeMapping = {
    'NIFTY50': 24000,
    'NIFTY': 24000,
    'BANKNIFTY': 51000,
    'SENSEX': 80000,
    'BANKEX': 55000,
  };

  // Get base strike (simplified - in reality this would be calculated from current market price)
  const baseStrike = strikeMapping[optionBase] || 25000;

  // For ITM, we typically go 1-2 strikes in-the-money
  // CE (Call) ITM = strike below current price
  // PE (Put) ITM = strike above current price
  // Default to CE (Call) for simplicity
  const itmStrike = baseStrike - 100; // Assume we go 100 points ITM

  // Generate option symbol (simplified format)
  // Real format might be: NIFTY25DEC24000CE
  const optionSymbol = `${optionBase}${year}${month}${itmStrike}CE`;

  return optionSymbol;
};

/**
 * Check if a symbol is likely an option symbol
 */
export const isOptionSymbol = (symbol) => {
  // Basic check for option symbol pattern
  return /\d+(CE|PE)$/i.test(symbol);
};

/**
 * Parse option symbol to extract components
 */
export const parseOptionSymbol = (optionSymbol) => {
  const match = optionSymbol.match(/^(.+?)(\d{2})(\d{2})(\d+)(CE|PE)$/i);

  if (!match) {
    return null;
  }

  const [, underlying, year, month, strike, type] = match;

  return {
    underlying,
    year: `20${year}`,
    month,
    strike: parseInt(strike),
    type: type.toUpperCase(),
    isCall: type.toUpperCase() === 'CE',
    isPut: type.toUpperCase() === 'PE'
  };
};

/**
 * Get available option strikes for an underlying (mock implementation)
 */
export const getAvailableStrikes = (underlyingSymbol, date) => {
  // This would typically call an API to get real option chain data
  // For now, return mock data

  const baseStrikes = {
    'NIFTY50': [23800, 23900, 24000, 24100, 24200],
    'NIFTY': [23800, 23900, 24000, 24100, 24200],
    'BANKNIFTY': [50800, 50900, 51000, 51100, 51200],
  };

  const normalizedSymbol = underlyingSymbol.replace(/\s+/g, '').toUpperCase();
  return baseStrikes[normalizedSymbol] || [24900, 25000, 25100];
};

export const optionService = {
  generateITMOptionSymbol,
  isOptionSymbol,
  parseOptionSymbol,
  getAvailableStrikes,
};
