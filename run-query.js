module.exports = async function runQuery(userQuery) {
  const GraphService = require("./services/graph-service")
  const VectorService = require("./services/vector-service")
  const OpenAIService = require("./services/openai-service")

  const graphService = new GraphService()
  const vectorService = new VectorService({ collectionName: process.env.CHROMADB_DATABASE })
  const openaiService = new OpenAIService()

  try {
    let response = await openaiService.runPrompt(
      process.env.CONSTRUCT_QUERY_PROMPT_ID,
      { query: userQuery }
    )

    const parsed = JSON.parse(response.output_text)

    const vectorResult = await vectorService.query({
      queryTexts: parsed.queryText,
      nResults: 1,
      where: parsed.whereChromaDb
    })

    const elementId = vectorResult.ids[0][0]

    const elements = await graphService.getRelatedAndSelf({
      entity: 'Element',
      entityId: elementId,
      relation: 'HAS_SPECIFICATION',
      entityConnected: 'Specification',
      where: parsed.whereNeo4j
    })

    graphService.close()

    response = await openaiService.runPrompt(
      process.env.SEMANTIC_ANSWER_PROMPT_ID,
      {
        query: userQuery,
        data: JSON.stringify(elements)
      }
    )

    return response.output_text

  } catch (error) {
    console.error("Error en runQuery:", error)
    return null
  }
}