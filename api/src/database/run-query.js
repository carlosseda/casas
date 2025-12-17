module.exports = async function runQuery ({ userQuery, semanticAnswer, threadId, origin }) {
  const GraphService = require('../services/graph-service')
  const VectorService = require('../services/vector-service')
  const OpenAIService = require('../services/openai-service')
  const MongoDBService = require('../services/mongodb-service')
  const { broadcast } = require('../services/websocket-service')

  const mongoService = new MongoDBService({
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB
  })

  const graphService = new GraphService()
  const vectorService = new VectorService({ collectionName: process.env.CHROMADB_DATABASE })
  const openaiService = new OpenAIService()

  try {
    const element = await mongoService.getFirst('elements')
    delete element._id
    delete element.id
    delete element.specifications

    const whereFields = Object.fromEntries(
      Object.entries(element).map(([key, value]) => [key, typeof value])
    )

    const constructQueryResponse = await openaiService.runPrompt(
      process.env.CONSTRUCT_QUERY_PROMPT_ID,
      { query: userQuery, wherefields: JSON.stringify(whereFields) }
    )

    if (origin === 'web') {
      broadcast(threadId, {
        threadId,
        completePercentage: 20,
        message: 'Construyendo la consulta'
      })
    }

    const parsed = JSON.parse(constructQueryResponse.output_text)

    const baseQueryOptions = {
      queryTexts: parsed.queryText,
      nResults: 1
    }

    const hasWhereChromaDb =
      parsed.whereChromaDb &&
      typeof parsed.whereChromaDb === 'object' &&
      Object.keys(parsed.whereChromaDb).length > 0

    const queryOptions = hasWhereChromaDb
      ? { ...baseQueryOptions, where: parsed.whereChromaDb }
      : baseQueryOptions

    if (origin === 'web') {
      broadcast(threadId, {
        threadId,
        completePercentage: 40,
        message: 'Buscando mejor resultado'
      })
    }

    const vectorResult = await vectorService.query(queryOptions)

    if (origin === 'web') {
      broadcast(threadId, {
        threadId,
        completePercentage: 60,
        message: 'Buscando resultados relacionados'
      })
    }

    const elementId = vectorResult.ids[0][0]

    const elements = await graphService.getRelatedAndSelf({
      entity: 'Element',
      entityId: elementId,
      relation: 'HAS_SPECIFICATION',
      entityConnected: 'Specification',
      where: parsed.whereNeo4j
    })

    graphService.close()

    if (origin === 'web') {
      broadcast(threadId, {
        threadId,
        completePercentage: 80,
        message: 'Procesando resultados'
      })
    }

    const promptId = semanticAnswer
      ? process.env.SEMANTIC_ANSWER_PROMPT_ID
      : process.env.FILTER_ELEMENTS_PROMPT_ID

    const response = await openaiService.runPrompt(promptId, {
      query: userQuery,
      data: JSON.stringify(elements)
    })

    await mongoService.updateOne('threads', { _id: mongoService.createId(threadId) }, {
      $set: {
        constructQueryResponse,
        vectorResult,
        elements,
        answer: response.output_text,
        updatedAt: new Date()
      }
    })

    if (!semanticAnswer) {
      const idsCandidates = JSON.parse(response.output_text)
      response.output_text = elements.filter(element => idsCandidates.includes(element.id))
    }

    if (origin === 'web') {
      broadcast(threadId, {
        threadId,
        completePercentage: 100,
        message: 'Listo',
        response: response.output_text
      })
    } else {
      return response.output_text
    }
  } catch (error) {
    if (origin === 'web') {
      broadcast(threadId, {
        threadId,
        completePercentage: 100,
        message: 'Error'
      })
    }
    console.error('Error en runQuery:', error)
    return null
  }
}
