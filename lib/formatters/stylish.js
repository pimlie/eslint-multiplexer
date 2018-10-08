/**
 * Based on Stylish reporter by Sindre Sorhus
 *
 * adapted by pimlie
 *
 * Given the fileMatchPattern, this formatter combines all results for the
 * matched files into a single result. It adds occurences to each file and each
 * file message and list them in the table.
 * You can filter with messages to show based on the ratio of a message
 * occurence to the total occurence of the file
 */
'use strict'

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/**
 * Given a word and a count, append an s if count is not one.
 * @param {string} word A word in its singular form.
 * @param {int} count A number controlling whether word should be pluralized.
 * @returns {string} The original word with an s on the end if count is not one.
 */
function pluralize(word, count) {
  return (count === 1 ? word : `${word}s`)
}

// ------------------------------------------------------------------------------
// Public Interface
// ------------------------------------------------------------------------------
const chalk = require('chalk')
const stripAnsi = require('strip-ansi')
const table = require('text-table')
const { SourceCode } = require('eslint')
const Multiplexer = require('../..')

module.exports = function (results, options) {
  if (!options) {
    ({ results, options } = Multiplexer.runFromFormatter(results))
  }

  let output = '\n'
  let errorCount = 0
  let warningCount = 0
  let fixableErrorCount = 0
  let fixableWarningCount = 0
  let summaryColor = 'yellow'

  // cache so we dont have to call SourceCode.splitLines for every message
  const fileCache = {}
  results.forEach((result) => {
    const messages = result.messages

    if (messages.length === 0) {
      /* istanbul ignore next */
      return
    }

    errorCount += result.errorCount
    warningCount += result.warningCount
    fixableErrorCount += result.fixableErrorCount
    fixableWarningCount += result.fixableWarningCount

    output += `${chalk.underline(result.filePath)} (${result.occurence}x)\n`

    let fileTable = `${table(
      messages
        .map((message) => {
          let messageType
          if (message.fatal || message.severity === 2) {
            messageType = chalk.red('error')
            summaryColor = 'red'
          } else {
            messageType = chalk.yellow('warning')
          }

          let messageText = message.message.replace(/([^ ])\.$/, '$1')
          let messageOccurence = message.occurence + 'x'

          // dim messages that are below our threshold
          if (message.belowThreshold) {
            messageType = chalk.dim(messageType)
            messageText = chalk.dim(messageText)
            messageOccurence = chalk.dim(messageOccurence)
          }

          return [
            '',
            message.line || 0,
            message.column || 0,
            messageOccurence,
            messageType,
            messageText,
            chalk.dim(message.ruleId || '')
          ]
        }),
      {
        align: ['', 'r', 'l'],
        stringLength(str) {
          return stripAnsi(str).length
        }
      }
    ).split('\n').map(el => el.replace(/(\d+)\s+(\d+)/, (m, p1, p2) => chalk.dim(`${p1}:${p2}`))).join('\n')}\n\n`

    if (!options.showSource) {
      output += fileTable
    } else {
      fileTable = fileTable.split('\n')

      messages
        .map((message, index) => {
          output += fileTable[index] + '\n'

          if (message.source && message.line) {
            if (!fileCache[message.source]) {
              fileCache[message.source] = SourceCode.splitLines(message.source)
            }

            output += chalk.dim(message.sourceFile.replace(process.cwd() + '/', '')) + '\n'
            output += chalk.bgBlackBright(chalk.dim(fileCache[message.source].slice(Math.max(0, message.line - 2), message.line + 1)
              .map((line, index) => {
                const l = `${message.line - 1 + index}: ${line}`
                return l + ' '.repeat(Math.max(0, 80 - l.length))
              })
              .join('\n')))
            output += '\n\n'
          }
        })

      output += '\n'
    }
  })

  const total = errorCount + warningCount

  if (total > 0) {
    output += chalk[summaryColor].bold([
      '\u2716 ', total, pluralize(' problem', total),
      ' (', errorCount, pluralize(' error', errorCount), ', ',
      warningCount, pluralize(' warning', warningCount), ')\n'
    ].join(''))

    if (fixableErrorCount > 0 || fixableWarningCount > 0) {
      output += chalk[summaryColor].bold([
        '  ', fixableErrorCount, pluralize(' error', fixableErrorCount), ' and ',
        fixableWarningCount, pluralize(' warning', fixableWarningCount),
        ' potentially fixable with the `--fix` option.\n'
      ].join(''))
    }
  }

  return total > 0 ? output : ''
}
