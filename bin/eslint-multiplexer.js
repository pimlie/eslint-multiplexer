#!/usr/bin/env node

const buildOptions = require('minimist-options')
const minimist = require('minimist')

const options = buildOptions({
  stopEarly: true,
  help: {
    type: 'boolean',
    default: false
  },
  input: {
    type: 'string',
    default: undefined,
    alias: 'i'
  },
  format: {
    type: 'string',
    default: undefined,
    alias: 'f'
  },
  basename: {
    type: 'boolean',
    default: undefined,
    alias: 'b'
  },
  matcher: {
    type: 'string',
    default: undefined,
    alias: 'm'
  },
  threshold: {
    type: 'number',
    default: undefined,
    alias: 't'
  },
  hideBelowThreshold: {
    type: 'boolean',
    default: undefined,
    alias: ['h', 'hide']
  },
  showSource: {
    type: 'boolean',
    default: undefined,
    alias: 's'
  },
  nopipe: {
    type: 'boolean',
    default: undefined
  },
  debug: {
    type: 'boolean',
    default: undefined
  }
})

const args = minimist(process.argv.slice(2), options)
const cli = {
  input: args['_'],
  flags: args
}

if (cli.flags.help) {
  console.log(`
      Description
        Combine multiple eslint results and merge results for common files
      Usage
        $ eslint-multiplexer [options] -i <json-string>
        $ eslint | eslint-multiplexer [options]
        $ eslint-multiplexer eslint | eslint-multiplexer eslint
      Options
        --input, -i JSON       Use this stringified JSON as input
        --format, -f  String   Use a specific output format - default: stylish
        --basename, -b Boolean Match similar file names by their basename
        --matcher, -m String   A regex of which the first match is used to match
                               similar file names, default
                               is /?([^/]+)$ (basename)
        --threshold, -t Float  Messages with an occurence lower than threshold
                               can be differently displayed (eg dimmed with
                               stylish)
        --hide, -h Boolean     Hide messages below the threshold
        --show-source, -s      Show the source of the message
        --help                 Displays this message
  `)
} else {
  process.on('unhandledRejection', (reason) => {
    console.error(reason.message)
    process.exitCode = 1
  })

  const Multiplexer = require('..')
  Multiplexer.run(cli)
}