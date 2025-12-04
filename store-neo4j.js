(async () => {
  try {
    const fs = require("fs")
    const path = require("path")
    const GraphService = require("./services/graph-service")
    const graphService = new GraphService()

    const dir = "./data/2025-11-28"

    const jsonFiles = fs.readdirSync(dir)
      .filter(f => f.endsWith(".json"))

    const specificationSet = new Set();

    for (const file of jsonFiles) {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const data = JSON.parse(raw);

      for (const specification of data.specifications) {
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

    for (const file of jsonFiles) {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const data = JSON.parse(raw);

      const id = String(file.replace(".json", ""))

      const element = {
        id,
        ...data
      }

      delete element.specifications

      await graphService.createNode("Element", element)

      for (const specification of data.specifications) {

        const normalized = String(specification).trim();

        await graphService.createRelation("Element", "HAS_SPECIFICATION", "Specification", {
          entityId: id,
          relatedEntityId: String(uniqueSpecifications.indexOf(normalized) + 1)
        })
      }
    }

    await graphService.close()

  } catch (error) {
    console.error(error)
    await graphService.close()
  }

})()