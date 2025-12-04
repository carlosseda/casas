(async () => {
  const fs = require("fs")
  const path = require("path")
  const MongoDBService = require("./services/mongodb-service")
  const mongoService = new MongoDBService({
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB
  })

  try {

    const dir = "./data/2025-11-28"

    const jsonFiles = fs.readdirSync(dir)
      .filter(f => f.endsWith(".json"))

    if (jsonFiles.length === 0) {
      console.log("No se han encontrado ficheros .json en la carpeta data")
      return
    }

    const docsToInsert = []

    for (const file of jsonFiles) {
      const fullPath = path.join(dir, file)
      const raw = fs.readFileSync(fullPath, "utf8")
      const parsed = JSON.parse(raw)

      const id = file.replace(".json", "")
      parsed.id = id

      docsToInsert.push(parsed)
    }

    if (docsToInsert.length === 0) {
      return
    }

    const result = await mongoService.insertMany("elements", docsToInsert)
    console.log(`✅ Insertados ${result.insertedCount} documentos`)

  } catch (err) {
    console.error("❌ Error general:", err)
  } finally {
    await mongoService.close()
  }
})()
