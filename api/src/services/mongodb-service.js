const { MongoClient } = require('mongodb')
const { ObjectId } = require('mongodb')

module.exports = class MongodbService {
  constructor ({
    uri,
    dbName
  }) {
    this.uri = uri
    this.dbName = dbName

    this.client = new MongoClient(uri)
    this.client.connect()
    this.db = this.client.db(this.dbName)
  }

  createId (id) {
    return new ObjectId(id)
  }

  changeDb (dbName) {
    this.dbName = dbName
    this.db = this.client.db(this.dbName)
  }

  async getCollection (collection, whereStatement = {}) {
    return await this.db.collection(collection).find(whereStatement).toArray()
  }

  async getFirst (collection, whereStatement = {}) {
    return await this.db.collection(collection).findOne(whereStatement)
  }

  async insertMany (collection, docs = []) {
    return await this.db.collection(collection).insertMany(docs)
  }

  async insertOne (collection, doc = {}) {
    return await this.db.collection(collection).insertOne(doc)
  }

  async updateOne (collection, whereStatement = {}, update = {}) {
    return await this.db.collection(collection).updateOne(whereStatement, update)
  }

  async updateMany (collection, whereStatement = {}, update = {}) {
    return await this.db.collection(collection).updateMany(whereStatement, update)
  }

  async close () {
    await this.client.close()
  }
}
