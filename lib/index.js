const { existsSync } = require('fs')
const { resolve, sep, basename } = require('path')
const spawn = require('cross-spawn')
const { find, indexOf, sortBy } = require('lodash')

const esep = sep.replace('\\', '\\\\')

const defaultOptions = {
  input: '',
  format: 'stylish',
  basename: false,
  matcher: undefined,
  matcherDefault: `${esep}?([^${esep}]+)$`,
  threshold: 0,
  hideBelowThreshold: false,
  showSource: false
}

/**
 * Determines if a message occurence is below the threshold of the file occurence
 * @param {object} options Multiplexer options object
 * @param {object} result An eslint file result object
 * @param {object} message An eslint message
 * @returns {boolean} True if the message occurence is below the threshold
 */
const belowThreshold = (options, result, message) => {
  return message.occurence < options.threshold * result.occurence
}

const getFormatter = function (format) {
  const formatterPath = `./formatters/${format}`
  try {
    return require(formatterPath)
  } catch (ex) {
    ex.message = `There was a problem loading formatter: ${formatterPath}\nError: ${ex.message}`
    throw ex
  }
}

class Multiplexer {
  constructor() {
    this.options = {}
  }

  static async run(cli) {
    const mp = new Multiplexer()
    await mp.runFromCli(cli)
  }

  static runFromFormatter(results) {
    const mp = new Multiplexer()
    mp.setOptions()

    return {
      options: mp.options,
      results: mp.merge(results)
    }
  }

  setOptions(cli) {
    Object.keys(defaultOptions).forEach((optionName) => {
      let optionValue = process.env[`ESLINT_MP_${optionName.toUpperCase()}`]

      if (typeof optionValue === 'undefined' && cli && cli.flags) {
        optionValue = cli.flags[optionName]
      }

      if (typeof optionValue === 'undefined' || (optionValue === '' && defaultOptions[optionName])) {
        optionValue = defaultOptions[optionName]
      }

      this.options[optionName] = optionValue
    })
  }

  hasInlinedCommand(input) {
    return input.length && /eslint/.test(input[0])
  }

  resolveModulePath(modulePath) {
    const cwd = process.cwd()
    const paths = [
      [ cwd, 'node_modules', modulePath, 'bin', modulePath + '.js' ],
      [ cwd, 'node_modules', modulePath, 'bin', modulePath ],
      [ cwd, 'node_modules', '.bin', modulePath ],
      [ __dirname, '..', 'node_modules', '.bin', modulePath ],
      [ cwd, modulePath ],
      ['']
    ]
    for (let i = 0; i < paths.length; i++) {
      const path = Reflect.apply(resolve, undefined, paths[i])
      if (existsSync(path)) {
        return path
      }
    }
  }

  async runFromCli(cli) {
    this.setOptions(cli)

    const readStdios = []
    if (!process.stdin.isTTY) {
      readStdios.push(this.readStdin())
    }

    const isPiped = !process.stdout.isTTY && cli.flags.nopipe !== true
    if (this.hasInlinedCommand(cli.input)) {
      readStdios.push(this.runInlinedCommand(cli.input.slice(), isPiped))
    }

    const stdioResults = await Promise.all(readStdios) || []

    const results = []
    stdioResults.forEach((stdioResult) => {
      if (stdioResult) {
        const json = JSON.parse(stdioResult)
        Array.prototype.push.apply(results, json)
      }
    })

    let output = ''
    if (!isPiped && this.options.format !== 'json') {
      const mergedResults = this.merge(results)
      const formatter = getFormatter(this.options.format)
      output = formatter(mergedResults, this.options)
    } else {
      output = JSON.stringify(results)
    }

    process.stdout.write(output)
  }

  readStdin() {
    return new Promise((resolve, reject) => {
      let data = ''

      process.stdin.setEncoding('utf8')
      process.stdin.on('readable', function () {
        var chunk
        while (chunk = process.stdin.read()) { // eslint-disable-line no-cond-assign
          data += chunk
        }
      })

      process.stdin.on('end', function () {
        resolve(data)
      })
    })
  }

  runInlinedCommand(args) {
    return new Promise((resolve, reject) => {
      args[0] = this.resolveModulePath(args[0])
      Array.prototype.push.apply(args, ['-f', 'json'])

      const sp = spawn(process.execPath, args, {
        stdio: [ 'ignore', 'pipe', 'inherit' ]
      })

      let data = ''
      sp.stdout.on('data', (chunk) => {
        data += chunk
      })

      sp.on('close', () => {
        resolve(data)
      })
    })
  }

  getFilePath(filePath) {
    if (this.options.basename) {
      return basename(filePath)
    } else if (typeof this.options.matcher !== 'undefined') {
      // console.error('>>', this.options.matcher, '<<')
      // console.error('>>', this.options.matcherDefault, '<<')
      return filePath.match(this.options.matcher.trim() || this.options.matcherDefault).slice(1).join('')
    } else {
      return filePath
    }
  }

  merge(results) {
    const merged = {}

    results.forEach((result) => {
      const filePath = this.getFilePath(result.filePath)

      if (typeof merged[filePath] === 'undefined') {
        merged[filePath] = {
          filePath,
          occurence: 1,
          messages: []
        }
      } else {
        merged[filePath].occurence++
      }

      result.messages.forEach((message) => {
        const existingMessage = find(merged[filePath].messages, (m) => {
          return m.ruleId === message.ruleId &&
            m.severity === message.severity &&
            m.line === message.line &&
            m.column === message.column &&
            (!message.endLine || m.endLine === message.endLine) &&
            (!message.endColumn || m.endColumn === message.endColumn)
        })

        if (typeof existingMessage !== 'undefined') {
          const index = indexOf(merged[filePath].messages, existingMessage)
          merged[filePath].messages[index].occurence++
        } else {
          message.occurence = 1
          message.source = result.source
          message.sourceFile = result.filePath
          merged[filePath].messages.push(message)
        }
      })
    })

    if (this.options.threshold === 1 || (this.options.threshold && this.options.hideBelowThreshold)) {
      // filter messages when we should hide below threshold so the totals are correct
      Object.keys(merged).forEach((filePath) => {
        merged[filePath].messages = merged[filePath]
          .messages
          .filter(message => !belowThreshold(this.options, merged[filePath], message))
      })
    }

    return Object.keys(merged).map((filePath) => {
      const { messages, occurence } = merged[filePath]

      let errorCount = 0
      let warningCount = 0
      let fixableErrorCount = 0
      let fixableWarningCount = 0

      messages.forEach((message, index) => {
        merged[filePath].messages[index].belowThreshold = belowThreshold(this.options, merged[filePath], message)

        if (message.severity === 1) {
          warningCount++

          if (typeof message.fix !== 'undefined') {
            fixableWarningCount++
          }
        } else if (message.severity === 2) {
          errorCount++

          if (typeof message.fix !== 'undefined') {
            fixableErrorCount++
          }
        }
      })

      return {
        filePath,
        occurence,
        messages: sortBy(messages, ['line', 'column', 'occurence']),
        errorCount,
        warningCount,
        fixableErrorCount,
        fixableWarningCount
      }
    })
  }
}

module.exports = Multiplexer
