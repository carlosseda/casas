module.exports = (redisClient, subscriberClient) => {
  require('./new-query.js').handleEvent(redisClient, subscriberClient)
}
