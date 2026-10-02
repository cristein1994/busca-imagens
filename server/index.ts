import { startServer } from './http.ts'

const { port } = await startServer()
console.log(`RODE no ar: http://127.0.0.1:${port}`)
console.log(`na rede: http://0.0.0.0:${port}`)
console.log('CLI: npm run rode')
