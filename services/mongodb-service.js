const { MongoClient } = require("mongodb")

module.exports = class VectorService {

  constructor({
    uri,
    dbName
  }) {
    this.uri = uri
    this.dbName = dbName

    this.client = new MongoClient(uri)
    this.client.connect()
    this.db = this.client.db(this.dbName)
  }

  async changeDb(dbName) {
    this.dbName = dbName
    this.db = this.client.db(this.dbName)
  }

  async getCollection(collection) {
    return this.db.collection(collection).find().toArray()
  }

  async getFirst(collection) {
    return await this.db.collection(collection).findOne()
  }

  async insertMany(collection, docs) {
    return await this.db.collection(collection).insertMany(docs)
  }

  async insertOne(collection, doc) {
    return await this.db.collection(collection).insertOne(doc)
  }

  async updateOne(collection, filter, update) {
    return await this.db.collection(collection).updateOne(filter, update)
  }

  async updateMany(collection, filter, update) {
    return await this.db.collection(collection).updateMany(filter, update)
  }

  async close() {
    await this.client.close()
  }

}

