module.exports = async function storeNeo4j(elements) {
  const fs = require("fs")
  const path = require("path")
  const GraphService = require("./services/graph-service")
  const graphService = new GraphService()

  try {
    const specificationSet = new Set();

    for (const element of elements) {
      for (const specification of element.specifications) {
        const normalized = String(specification).trim();
        if (normalized.length > 0) {
          specificationSet.add(normalized);
        }
      }
    }

    const uniqueSpecifications = Array.from(specificationSet);

    for (let i = 0; i < uniqueSpecifications.length; i++) {
      const id = String(i + 1)
      await graphService.createNode("Specification", {
        id,
        name: uniqueSpecifications[i]
      })
    }

    for (const element of elements) {
      const id = String(element.id)
      delete element._id

      await graphService.createNode("Element", element)

      for (const specification of element.specifications) {

        const normalized = String(specification).trim();

        await graphService.createRelation("Element", "HAS_SPECIFICATION", "Specification", {
          entityId: id,
          relatedEntityId: String(uniqueSpecifications.indexOf(normalized) + 1)
        })
      }
    }

    console.log("✅ Neo4j completado")

    await graphService.close()

  } catch (error) {
    console.error(error)
    await graphService.close()
  }
}