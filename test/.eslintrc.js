module.exports = {
  extends: [
    '../.eslintrc.js'
  ],
  overrides: [{
    files: ['fixtures/index.js'],
    rules: {
            'space-before-function-paren': 1
    }
  }]
}
