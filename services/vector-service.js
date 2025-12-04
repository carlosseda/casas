const { ChromaClient } = require("chromadb")
const { OpenAIEmbeddingFunction } = require("@chroma-core/openai")

module.exports = class VectorService {

  constructor({
    collectionName,
    apiKey = process.env.OPENAI_API_KEY,
    modelName = "text-embedding-3-small",
    clientOptions = {},
  }) {
    if (!collectionName) {
      throw new Error("VectorService: collectionName es obligatorio")
    }
    if (!apiKey) {
      throw new Error("VectorService: apiKey de OpenAI no definida")
    }

    this.collectionName = collectionName
    this.client = new ChromaClient(clientOptions)

    this.embeddingFunction = new OpenAIEmbeddingFunction({
      apiKey,
      modelName,
    })

    this.collection = null
  }

  async getCollection() {
    if (!this.collection) {
      this.collection = this.client.getOrCreateCollection({
        name: this.collectionName,
        embeddingFunction: this.embeddingFunction,
      })
    }
    return this.collection
  }

  async addDocuments({ ids, documents, metadatas = [] }) {

    if (!Array.isArray(ids) || !Array.isArray(documents)) {
      throw new Error("VectorService.addDocuments: ids y documents deben ser arrays")
    }

    if (ids.length !== documents.length) {
      throw new Error("VectorService.addDocuments: ids y documents deben tener la misma longitud")
    }

    if (metadatas.length && metadatas.length !== ids.length) {
      throw new Error("VectorService.addDocuments: metadatas debe tener la misma longitud que ids/documents")
    }

    const collection = await this.getCollection()

    await collection.add({
      ids,
      documents,
      metadatas: metadatas.length ? metadatas : undefined,
    })
  }

  async query({ queryTexts, nResults = 5, where, whereDocument }) {
    if (!Array.isArray(queryTexts) || !queryTexts.length) {
      throw new Error("VectorService.query: queryTexts debe ser un array no vacío")
    }

    const collection = await this.getCollection()

    const result = await collection.query({
      queryTexts,
      nResults,
      where,
      whereDocument,
    })

    return result
  }

  async delete({ ids, where, whereDocument } = {}) {
    const collection = await this.getCollection()
    await collection.delete({
      ids,
      where,
      whereDocument,
    })
  }

  async resetCollection() {
    await this.client.deleteCollection({ name: this.collectionName })

    this.collection = this.client.getOrCreateCollection({
      name: this.collectionName,
      embeddingFunction: this.embeddingFunction,
    })
  }
}

