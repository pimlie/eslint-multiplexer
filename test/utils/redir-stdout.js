const net = require('net')
const { Console } = require('console')

const socket = new net.Socket({
  fd: 3,
  readable: false,
  writable: true
})

Object.defineProperty(process, 'stdout', {
  configurable: true,
  enumerable: true,
  get: () => socket
})

const newConsole = new Console(socket, process.stderr)
console.log = newConsole.log
console.info = newConsole.info
