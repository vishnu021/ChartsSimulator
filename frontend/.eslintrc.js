module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    'prefer-const': 'error',
    'no-unused-vars': 'error',
    'no-console': 'error',
    'jsx-quotes': ['error', 'prefer-double'],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'comma-dangle': ['error', 'only-multiline'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    indent: 'off', // Temporarily disabled due to complex nesting
    // Keep CI noise low: prefer error/off over warn
    // 'max-len': ['warn', { code: 100 }],
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
};
