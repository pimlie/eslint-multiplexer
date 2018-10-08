module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module'
  },
  env: {
    node: true,
    'jest/globals': true
  },
  extends: [
    'standard',
    'standard-jsx',
    'plugin:import/errors',
    'plugin:import/warnings'
  ],
  plugins: [
    'jest'
  ],
  rules: {
    // Enforce import order
    'import/order': 2,
    'import/first': 2,

    // Prefer const over let
    'prefer-const': [2, {
      'destructuring': 'any',
      'ignoreReadBeforeAssign': false
    }],

    // No single if in an "else" block
    'no-lonely-if': 2,

    // Force curly braces for control flow
    curly: 2,

    // No async function without await
    'require-await': 2,

    'space-before-function-paren': [2, {
      anonymous: 'always',
      named: 'never'
    }],
    'no-console': 2
  },
  overrides: [{
    files: [ 'bin/*' ],
    rules: {
      'no-console': 0
    }
  }]
}
