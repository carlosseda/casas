module.exports = async function storeChromaDB (elements) {
  const VectorService = require('../services/vector-service')
  const OpenAIService = require('../services/openai-service')
  const vectorService = new VectorService({ collectionName: process.env.CHROMADB_DATABASE })
  const openai = new OpenAIService()
  const fs = require('fs')

  try {
    const result = {
      ids: [],
      documents: [],
      metadatas: []
    }

    const tasks = elements.map(async (element) => {
      const jsonString = JSON.stringify(element)

      const response = await openai.runPrompt(
        process.env.EXTRACT_KEYWORDS_BY_JSON_PROMPT_ID,
        { json: jsonString }
      )

      const parsed = JSON.parse(response.output_text)
      const keywords = JSON.stringify(parsed.keywords)

      delete element._id

      Object.keys(element).forEach((key) => {
        if (element[key] === null) {
          element[key] = ''
        }
      })

      result.ids.push(element.id)
      result.documents.push(keywords)
      result.metadatas.push({
        ...element,
        specifications: ''
      })
    })

    await Promise.all(tasks)
    fs.writeFileSync('chromadb.json', JSON.stringify(result))
    await vectorService.addDocuments(result)

    console.log('✅ Chromadb completado')
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}
