global.__basedir = __dirname

const { wss } = require('./src/services/websocket-service')
const app = require('./src/app')
const PORT = process.env.PORT || 8080

const server = app.listen(PORT, () => {
  console.log(`El servidor está corriendo en el puerto ${PORT}.`)
})

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})
