(async () => {
  const fs = require("fs")
  const VectorService = require("./services/vector-service")
  const OpenAIService = require("./services/openai-service")
  const openai = new OpenAIService()
  const vectorService = new VectorService({ collectionName: process.env.CHROMADB_DATABASE })
  const MongoDBService = require("./services/mongodb-service")
  const mongoService = new MongoDBService({
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB
  })

  try {
    const elements = await mongoService.getCollection("elements")

    const result = {
      ids: [],
      documents: [],
      metadatas: []
    }

    const tasks = elements.map(async (element) => {
      const jsonString = JSON.stringify(element)

      const response = await openai.runPrompt(
        process.env.EXTRACT_KEYWORDS_BY_JSON_PROMPT_ID,
        { "json": jsonString }
      )

      const parsed = JSON.parse(response.output_text)
      const keywords = JSON.stringify(parsed.keywords)

      result.ids.push(element.id)
      result.documents.push(keywords)
      result.metadatas.push({
        ...element
      })
    })

    await Promise.all(tasks)

    fs.writeFileSync("./last-chroma-ingest.json", JSON.stringify(result, null, 2))

    const lastChromaIngest = JSON.parse(fs.readFileSync("./last-chroma-ingest.json", "utf8"))

    await vectorService.addDocuments(lastChromaIngest)

    console.log("✅ Ingestión completada")
  } catch (error) {
    console.error("❌ Error general:", error)
  } finally {
    await mongoService.close()
  }
})()