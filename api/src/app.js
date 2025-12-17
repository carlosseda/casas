const express = require('express')
const app = express()
const errorHandler = require('./middlewares/error-handler')
const exposeServiceMiddleware = require('./middlewares/expose-services')
const IORedis = require('ioredis')
const redisClient = new IORedis(process.env.REDIS_URL)
const subscriberClient = new IORedis(process.env.REDIS_URL)
require('./events')(redisClient, subscriberClient)

app.use((req, res, next) => {
  req.redisClient = redisClient
  next()
})

const routes = require('./routes')

app.use(express.json({ limit: '10mb', extended: true }))
app.use(...Object.values(exposeServiceMiddleware))

app.use('/api', routes)
app.use(errorHandler)

module.exports = app
