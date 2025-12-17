exports.findAll = async (req, res, next) => {
  try {
    const whereStatement = {}
    whereStatement.deletedAt = { $exists: false }

    const response = await req.mongoService.getCollection('elements', whereStatement)

    res.status(200).send(response)
  } catch (err) {
    next(err)
  }
}

exports.findOne = async (req, res, next) => {
  try {
    const whereStatement = {}
    whereStatement.deletedAt = { $exists: false }
    whereStatement.id = req.params.id

    const response = await req.mongoService.getFirst('elements', whereStatement)

    res.status(200).send(response)
  } catch (err) {
    next(err)
  }
}

exports.search = async (req, res, next) => {
  try {
    const thread = await req.mongoService.insertOne('threads', {
      userQuery: req.body.prompt,
      semanticAnswer: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    req.redisClient.publish('new-query', JSON.stringify({ userQuery: req.body.prompt, semanticAnswer: false, threadId: thread.insertedId, origin: 'web' }))

    res.status(200).send(thread)
  } catch (err) {
    next(err)
  }
}
