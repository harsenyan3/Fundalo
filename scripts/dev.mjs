import { spawn } from 'node:child_process'

const cwd = process.cwd()

function run(name, command, args) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  })

  child.on('exit', (code) => {
    if (code !== 0) {
      process.exit(code || 1)
    }
  })

  return child
}

const processes = [
  run('api', 'node', ['server/index.js']),
  run('vite', 'npm', ['run', 'dev', '--', '--host']),
]

function shutdown(signal) {
  processes.forEach((child) => {
    if (!child.killed) {
      child.kill(signal)
    }
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
