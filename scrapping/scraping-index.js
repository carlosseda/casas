const path = require("path");
const fs = require("fs");
const scrappingElements = require("./scraping-elements.js");

; (async () => {

  const baseDir = __dirname;
  const locationsPath = path.join(baseDir, "locations-urls.json");

  if (!fs.existsSync(locationsPath)) {
    const scrappingLocations = require("./scraping-locations.js");
    await scrappingLocations(process.env.URL_BASE);
  }

  const locationsUrls = require("./locations-urls.json");
  await scrappingElements(locationsUrls);

})();