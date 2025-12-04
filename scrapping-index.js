const fs = require("fs")
const scrappingElements = require("./scrapping-elements.js")

  ; (async () => {

    if (!fs.existsSync("./locations-urls.json")) {
      const scrappingLocations = require("./scrapping-locations.js")
      await scrappingLocations(process.env.URL_BASE)
    }

    const locationsUrls = require("./locations-urls.json")
    await scrappingElements(locationsUrls)
  })()