(async () => {
  const fs = require("fs")
  const VectorService = require("./services/vector-service")
  const OpenAIService = require("./services/openai-service")
  const openai = new OpenAIService()
  const vectorService = new VectorService({ collectionName: process.env.CHROMADB_DATABASE })

  const dir = "./data/2025-11-28"

  const jsonFiles = fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))

  const result = {
    ids: [],
    documents: [],
    metadatas: []
  }

  const tasks = jsonFiles.map(async (file) => {
    const raw = fs.readFileSync(`${dir}/${file}`, "utf8")
    const jsonString = JSON.stringify(raw)
    const obj = JSON.parse(raw)

    const response = await openai.runPrompt(
      process.env.EXTRACT_KEYWORDS_BY_JSON_PROMPT_ID,
      { "json": jsonString }
    )

    const parsed = JSON.parse(response.output_text)
    const keywords = JSON.stringify(parsed.keywords)

    const id = file.replace(".json", "")

    delete obj.specifications

    result.ids.push(id)
    result.documents.push(keywords)
    result.metadatas.push({
      ...obj
    })
  })

  await Promise.all(tasks)

  fs.writeFileSync("./pending-chroma-ingest.json", JSON.stringify(result, null, 2))

  const pendingChromaIngest = JSON.parse(fs.readFileSync("./pending-chroma-ingest.json", "utf8"))

  await vectorService.addDocuments(pendingChromaIngest)

  console.log("Archivo pending-chroma-ingest.json generado correctamente.")
})()