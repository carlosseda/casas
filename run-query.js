module.exports = async function runQuery(userQuery) {
  const GraphService = require("./services/graph-service")
  const VectorService = require("./services/vector-service")
  const OpenAIService = require("./services/openai-service")

  const graphService = new GraphService()
  const vectorService = new VectorService({ collectionName: 'idealista-scraping' })
  const openaiService = new OpenAIService()

  try {
    let response = await openaiService.runPrompt(
      "pmpt_69303d87bc4481979b0fc0ccd93d1f330330c052f41048e2",
      { query: userQuery }
    )

    const parsed = JSON.parse(response.output_text)

    const vectorResult = await vectorService.query({
      queryTexts: parsed.queryText,
      nResults: 1,
      where: parsed.whereChromaDb
    })

    const propertyId = vectorResult.ids[0][0]

    const properties = await graphService.getRelatedAndSelf({
      entity: 'Property',
      entityId: propertyId,
      relation: 'HAS_SPECIFICATION',
      entityConnected: 'Specification',
      where: parsed.whereNeo4j
    })

    graphService.close()

    response = await openaiService.runPrompt(
      "pmpt_693135f7b8b48196891b9c8c53cd75a40ecf7bae56fb115e",
      {
        query: userQuery,
        data: JSON.stringify(properties)
      }
    )

    return response.output_text

  } catch (error) {
    console.error("Error en runQuery:", error)
    return null
  }
}