const spawn = require('cross-spawn')

const spawnHelper = (args) => {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''

    const sp = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    sp.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    sp.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    sp.on('close', () => {
      resolve({ stdout, stderr })
    })
  })
}

describe('cli', () => {
  test('basic operation', async () => {
    const { stdout, stderr } = await spawnHelper([
      './bin/eslint-multiplexer',
      '--nopipe',
      './node_modules/.bin/eslint',
      '--no-ignore', './test/fixtures'
    ])

    expect(stderr).toBe('')
    expect(stdout).toEqual(expect.stringContaining('first/index.js'))
    expect(stdout).toEqual(expect.not.stringContaining('2x'))
  })

  test('match basename', async () => {
    const { stdout, stderr } = await spawnHelper([
      './bin/eslint-multiplexer',
      '--nopipe',
      '-b',
      './node_modules/.bin/eslint',
      '--no-ignore', './test/fixtures'
    ])

    expect(stderr).toBe('')
    expect(stdout).toEqual(expect.stringContaining('2x'))
    expect(stdout).toEqual(expect.stringContaining('index.js'))
    expect(stdout).toEqual(expect.not.stringContaining('first/index.js'))
  })

  test('match default regex', async () => {
    const { stdout, stderr } = await spawnHelper([
      './bin/eslint-multiplexer',
      '--nopipe',
      '-m=',
      './node_modules/.bin/eslint',
      '--no-ignore', './test/fixtures'
    ])

    expect(stderr).toBe('')
    expect(stdout).toEqual(expect.stringContaining('2x'))
    expect(stdout).toEqual(expect.stringContaining('index.js'))
    expect(stdout).toEqual(expect.not.stringContaining('first/index.js'))
  })

  test('match custom regex', async () => {
    const { stdout, stderr } = await spawnHelper([
      './bin/eslint-multiplexer',
      '--nopipe',
      '-m', '([^./]+).js$',
      './node_modules/.bin/eslint',
      '--no-ignore', './test/fixtures'
    ])

    expect(stderr).toBe('')
    expect(stdout).toEqual(expect.stringContaining('2x'))
    expect(stdout).toEqual(expect.stringContaining('index'))
    expect(stdout).toEqual(expect.not.stringContaining('index.js'))
  })

  test('below threshold', async () => {
    const { stdout, stderr } = await spawnHelper([
      './bin/eslint-multiplexer',
      '--nopipe',
      '-b', '-t', '0.6',
      './node_modules/.bin/eslint',
      '--no-ignore', './test/fixtures'
    ])

    expect(stderr).toBe('')
    expect(stdout).toEqual(expect.stringContaining('2x'))
    expect(stdout).toEqual(expect.stringContaining('1x'))
    expect(stdout).toEqual(expect.not.stringContaining('1 problem (1 error, 0 warnings)'))
  })

  test('below threshold hidden', async () => {
    const { stdout, stderr } = await spawnHelper([
      './bin/eslint-multiplexer',
      '--nopipe',
      '-b', '-t', '0.6', '-h',
      './node_modules/.bin/eslint',
      '--no-ignore', './test/fixtures'
    ])

    expect(stderr).toBe('')
    expect(stdout).toEqual(expect.stringContaining('2x'))
    expect(stdout).toEqual(expect.not.stringContaining('1x'))
    expect(stdout).toEqual(expect.stringContaining('1 problem (1 error, 0 warnings)'))
  })

  test('show source', async () => {
    const { stdout, stderr } = await spawnHelper([
      './bin/eslint-multiplexer',
      '--nopipe',
      '-s',
      './node_modules/.bin/eslint',
      '--no-ignore', './test/fixtures'
    ])

    expect(stderr).toBe('')
    expect(stdout).toEqual(expect.stringContaining('0: function'))
  })

  test('stdin as input', async () => {
    const { stdout, stderr } = await new Promise((resolve) => {
      const eslint = spawn(process.execPath, [
        './node_modules/.bin/eslint',
        '--no-ignore', './test/fixtures',
        '-f', 'json'
      ], { stdio: [ 'inherit', 'pipe', 'inherit' ] })

      const multiplexer = spawn(process.execPath, [
        './bin/eslint-multiplexer',
        '--nopipe',
        '-b'
      ], { stdio: [ 'pipe', 'pipe', 'pipe' ] })

      multiplexer.stdin.setEncoding('utf8')
      eslint.stdout.pipe(multiplexer.stdin)

      let stdout = ''
      let stderr = ''
      multiplexer.stdout.on('data', (chunk) => {
        stdout += chunk
      })
      multiplexer.stderr.on('data', (chunk) => {
        stderr += chunk
      })

      multiplexer.on('close', () => {
        resolve({ stdout, stderr })
      })
    })

    expect(stderr).toBe('')
    expect(stdout).toEqual(expect.stringContaining('2x'))
    expect(stdout).toEqual(expect.stringContaining('index.js'))
  })

  test('multiple pipes', async () => {
    const { stdout, stderr } = await new Promise((resolve) => {
      const eslint1 = spawn(process.execPath, [
        './bin/eslint-multiplexer',
        './node_modules/.bin/eslint',
        '--no-ignore', './test/fixtures/index.js'
      ], { stdio: [ 'inherit', 'pipe', 'inherit' ] })

      const eslint2 = spawn(process.execPath, [
        './bin/eslint-multiplexer',
        './node_modules/.bin/eslint',
        '--no-ignore', './test/fixtures/first/index.js'
      ], { stdio: [ 'pipe', 'pipe', 'inherit' ] })

      eslint2.stdin.setEncoding('utf8')
      eslint1.stdout.pipe(eslint2.stdin)

      const multiplexer = spawn(process.execPath, [
        './bin/eslint-multiplexer',
        '--nopipe',
        '-b', '--debug'
      ], { stdio: [ 'pipe', 'pipe', 'pipe' ] })

      multiplexer.stdin.setEncoding('utf8')
      eslint2.stdout.pipe(multiplexer.stdin)

      let stdout = ''
      let stderr = ''
      multiplexer.stdout.on('data', (chunk) => {
        stdout += chunk
      })
      multiplexer.stderr.on('data', (chunk) => {
        stderr += chunk
      })

      multiplexer.on('close', () => {
        resolve({ stdout, stderr })
      })
    })

    expect(stderr).toBe('')
    expect(stdout).toEqual(expect.stringContaining('2x'))
    expect(stdout).toEqual(expect.stringContaining('1x'))
    expect(stdout).toEqual(expect.stringContaining('index.js'))
  })
})
