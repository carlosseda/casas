const neo4j = require('neo4j-driver')

module.exports = class GraphService {

  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_DATABASE_URL,
      neo4j.auth.basic(
        process.env.NEO4J_DATABASE_USER,
        process.env.NEO4J_DATABASE_PASSWORD
      )
    )

    this.session = this.driver.session({ database: process.env.NEO4J_DATABASE })
  }

  createNode = async (entity, data) => {
    try {
      const entityCamelCase = entity.charAt(0).toLowerCase() + entity.slice(1)

      const setString = Object.entries(data)
        .map(([key]) => `${entityCamelCase}.${key} = $${key}`)
        .join(',')

      const query = `
        MERGE (${entityCamelCase}:${entity} {id: $id})
        SET ${setString}
        RETURN ${entityCamelCase}
      `

      const node = await this.session.run(query, data)
      return node
    } catch (err) {
      console.error(err)
      return false
    }
  }

  createRelation = async (entity, relation, relatedEntity, data) => {
    try {
      const entityCamelCase = entity.charAt(0).toLowerCase() + entity.slice(1)
      const relatedEntityCamelCase = relatedEntity.charAt(0).toLowerCase() + relatedEntity.slice(1)

      let query = `
        MATCH (${entityCamelCase}:${entity} {id: $entityId})
        MATCH (${relatedEntityCamelCase}:${relatedEntity} {id: $relatedEntityId})
        MERGE (${entityCamelCase})-[r:${relation}]->(${relatedEntityCamelCase})
      `

      const params = {
        entityId: String(data.entityId),
        relatedEntityId: String(data.relatedEntityId),
      }

      if (data.properties && Object.keys(data.properties).length > 0) {
        query += `
        ON CREATE SET r += $properties
        ON MATCH SET r += $properties
        `
        params.properties = data.properties
      }

      query += ` RETURN r`

      const result = await this.session.run(query, params)
      return result
    } catch (err) {
      console.error(err)
      return false
    }
  }

  getRelated = async ({ entity, entityId, relation, entityConnected, where, limit = 10 }) => {
    try {
      let query = `
        MATCH (p:${entity} {id: $entityId})
        MATCH (p)-[:${relation}]->(s:${entityConnected})
        MATCH (p2:${entity})-[:${relation}]->(s2:${entityConnected})
        WHERE s.id = s2.id 
      `

      if (where !== "") {
        query += `
          AND ${where}
        `
      }

      query += `
        RETURN distinct p2
        LIMIT toInteger($limit)
      `

      const records = await this.session.run(query, {
        entityId: String(entityId),
        limit: neo4j.int(limit)
      })

      const result = records.records.map(record => {
        return record._fields[0].properties
      })

      return result
    } catch (err) {
      console.error(err)
      return false
    }
  }

  getRelatedAndSelf = async ({ entity, entityId, relation, entityConnected, where, limit = 10 }) => {
    try {
      let query = `
        MATCH (p:${entity} {id: $entityId})
        OPTIONAL MATCH (p)-[:${relation}]->(s:${entityConnected})<-[:${relation}]-(p2:${entity})
      `

      if (where !== "") {
        query += `
          WHERE ${where}
        `
      }

      query += `
        WITH p, collect(distinct p2) as related
        UNWIND [p] + related as result
        RETURN distinct result
        LIMIT toInteger($limit)
      `

      const records = await this.session.run(query, {
        entityId: String(entityId),
        limit: neo4j.int(limit)
      })

      const result = records.records.map(record => {
        return record._fields[0].properties
      })

      return result
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async close() {
    await this.session.close()
    await this.driver.close()
  }
}
