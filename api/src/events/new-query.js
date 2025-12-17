const runQuery = require('../database/run-query.js')

exports.handleEvent = async (redisClient, subscriberClient) => {
  subscriberClient.subscribe('new-query', (err) => {
    if (err) {
      console.error('Error al suscribirse al canal:', err)
    }
  })

  subscriberClient.on('message', async (channel, message) => {
    if (channel === 'new-query') {
      const data = JSON.parse(message)
      await runQuery(data)
    }
  })
}
