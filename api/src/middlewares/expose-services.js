const runQuery = require('../database/run-query.js')

const services = {
  telegramService: new (require('../services/telegram-service'))(process.env.TELEGRAM_TOKEN, null, async (userText) => {
    return await runQuery(userText)
  }),
  mongoService: new (require('../services/mongodb-service'))({ uri: process.env.MONGODB_URI, dbName: process.env.MONGODB_DB })
}

function createServiceMiddleware (serviceName) {
  return (req, res, next) => {
    req[serviceName] = services[serviceName]
    next()
  }
}

module.exports = Object.keys(services).reduce((middlewares, serviceName) => {
  middlewares[`${serviceName}Middleware`] = createServiceMiddleware(serviceName)
  return middlewares
}, {})
