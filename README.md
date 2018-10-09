# Multiplex eslint results and merge results for common files
<a href="https://travis-ci.org/pimlie/eslint-multiplexer"><img src="https://api.travis-ci.org/pimlie/eslint-multiplexer.svg" alt="Build Status"></a>
<a href="https://ci.appveyor.com/project/pimlie/eslint-multiplexer"><img src="https://ci.appveyor.com/api/projects/status/1y9qs8cakcpe26hu?svg=true" alt="Windows Build Status"></a>
<a href="https://codecov.io/gh/pimlie/eslint-multiplexer"><img src="https://img.shields.io/codecov/c/github/pimlie/eslint-multiplexer/master.svg" alt="Coverage Status"></a>
[![npm](https://img.shields.io/npm/dt/eslint-multiplexer.svg)](https://www.npmjs.com/package/eslint-multiplexer)
[![npm (scoped with tag)](https://img.shields.io/npm/v/eslint-multiplexer/latest.svg)](https://www.npmjs.com/package/eslint-multiplexer)

ESLint helper to combine multiple eslint results and then merge those results for common files to count message occurences.

<p align="center"><img align="center" src="https://user-images.githubusercontent.com/1067403/46256342-b3ceed00-c4a9-11e8-9cfd-df6dafdd3146.png" /></p>

## Installation

```js
yarn add --dev eslint-multiplexer
```

## Usage

You can either pipe the results from eslint, prefix your eslint command or provide a JSON string as cli option

#### Use with CLI option
```
$ eslint-multiplexer -b -i "<json-string-with-results>"
```

#### Pipe from eslint
If you pipe the results directly from eslint you have to specify `json` as the format
```
$ eslint -f json lib1 lib2 lib3 | eslint-multiplexer [options]
```

#### Prefix eslint
Its not necessary to specify `json` as the format when prefixing eslint
```
$ eslint-multiplexer eslint | eslint-multiplexer -b eslint
```

Although the above works and there is nothing wrong with it, for better readability its advised to pipe a third time. That way if you use this in a yarn or npm script the extra options you supply on the yarn/npm command are supplied to eslint-multiplexer and not to eslint

```
$ eslint-multiplexer eslint lib1 | eslint-multiplexer eslint lib2 | eslint-multiplexer -m "([^./]+)\.js"
```

### Similar filename matching

You can either use `-b` to match files by their basename or use `-m` to specify a regex. All joined matches of the regex will be used as the common filename.

If you need to use a group in your regex but dont want to match it, mark the group as non-capturing with `?:`

For example, if you have paths like:
```
lib1/index.js
lib2/dist/index.js
lib3/dist/v1.0/index.js
```

and you wish to combine all the `index.js` files, use this regex:
```js
(?:(lib)[0-9]+(\/))(?:[^\/]+\/)*([^./]+)\.js
```

then the common name for all three files will be 
```
lib/index.js
```

## Keep calm and carry on

When you start combining results of a lot of files, the sheer volume can become quite overwhelming. Especially when you are linting template files by their generated output files, as each output file can have different line numbers for the same error. Use the `threshold` options and `show-source` option to keep a clear overview and steadily work your way through by starting with the most occuring errors

### Threshold options
The factor of how many times a message occured for all the file occurences. E.g. when a message is triggered in 2 out of 3 files and you set a threshold of `0.7`, the message is not above the threshold (0.66 < 0.7).

#### `-t`
Specify a decimal between 0 and 1 to indicate the threshold for messages. The usage of this option will differ per formatter, e.g. in stylish messages below the threshold will be shown dimmed.

#### `-h`
Just hide all messages below the threshold.

### Show source
Use `-s` or `--show-source` to display the (first) source of where the message was triggered. This is especially useful when linting generated templates as the line number of the generated file will most likely not be the same as the line number in the template.


## Formatters

Currently `eslint-multiplexer` supports json and stylish formatters. The default eslint formatters could still be used but wont show message occurences, which is what this is all about more or less. 

Other formatters can be implemented quite easily, PR's are very welcome for that!

## Command-line options

```
      Description
        Combine multiple eslint results and merge results for common files
      Usage
        $ eslint-multiplexer [options] -i <json-string>
        $ eslint -f json | eslint-multiplexer [options]
        $ eslint-multiplexer eslint | eslint-multiplexer eslint
      Options
        --input, -i JSON       Use this stringified JSON as input
        --format, -f  String   Use a specific output format - default: stylish
        --basename, -b Boolean Match similar file names by their basename
        --matcher, -m String   A regex of which the matches (except [0]) are used
                               to match similar file names
        --threshold, -t Float  Messages with an occurence lower than threshold
                               can be differently displayed (eg dimmed with
                               stylish)
        --hide, -h Boolean     Hide messages below the threshold
        --show-source, -s      Show the source of the message
        --help                 Displays this message
```

## TODO
- More formatters?
