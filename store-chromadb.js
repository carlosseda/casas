(async () => {
  const fs = require("fs")
  const VectorService = require("./services/vector-service")
  const OpenAIService = require("./services/openai-service")
  const openai = new OpenAIService()
  const vectorService = new VectorService({ collectionName: 'idealista-scraping' })

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
      "pmpt_69300b20e0f081948fe192466cab5b8b011e3a9968f912f9",
      { "json": jsonString }
    )

    const parsed = JSON.parse(response.output_text)
    const keywords = JSON.stringify(parsed.keywords)

    const id = file.replace(".json", "")

    result.ids.push(id)
    result.documents.push(keywords)
    result.metadatas.push({
      meters: obj.meters,
      rooms: obj.rooms,
      price: obj.price,
      monthsDeposit: obj.monthsDeposit,
      typeOfRental: obj.typeOfRental,
      bathrooms: obj.bathrooms
    })
  })

  await Promise.all(tasks)

  fs.writeFileSync("./pending-chroma-ingest.json", JSON.stringify(result, null, 2))

  const pendingChromaIngest = JSON.parse(fs.readFileSync("./pending-chroma-ingest.json", "utf8"))

  await vectorService.addDocuments(pendingChromaIngest)

  console.log("Archivo pending-chroma-ingest.json generado correctamente.")
})()