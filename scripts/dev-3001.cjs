process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const { spawn } = require('child_process')
const nextBin = require.resolve('next/dist/bin/next')

const child = spawn(process.execPath, ['--max-old-space-size=8192', nextBin, 'dev', '--webpack', '-p', '3001'], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd()
})

child.on('exit', code => {
  process.exit(code ?? 0)
})
