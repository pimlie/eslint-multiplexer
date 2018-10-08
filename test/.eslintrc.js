module.exports = {
  extends: [
    '../.eslintrc.js'
  ],
  overrides: [{
    // trigger a fixable warning to improve coverage
    files: ['fixtures/index.js'],
    rules: {
      'space-before-function-paren': 1
    }
  }]
}
