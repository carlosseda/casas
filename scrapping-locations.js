const ScrappingService = require("./scrapping-service")
const scrappingService = new ScrappingService()
const locationsUrls = []
const visited = new Set()

module.exports = async function scrappingLocations(urlBase) {

  await scrappingService.generateProfile(process.env.CHROME_PROFILE)

  try {
    const btn = await scrappingService.driver.wait(
      scrappingService.until.elementLocated(scrappingService.by.id("didomi-notice-agree-button")),
      5000
    )
    await scrappingService.driver.executeScript("arguments[0].scrollIntoView()", btn)
    await scrappingService.sleep(400)
    await btn.click()
  } catch { }


  const btnShowAll = await scrappingService.driver.findElement(scrappingService.by.id("sublocations-showall-btn")).catch(() => null)

  if (btnShowAll) {
    await btnShowAll.click()
  }


  let sublocationsUrls = []
  let sublocationsElements = await scrappingService.driver.findElements(scrappingService.by.css(".modal-wrapper #sublocations li a"))

  for (const sublocationsElement of sublocationsElements) {
    const sublocationUrl = await sublocationsElement.getAttribute("href")
    sublocationsUrls.push(sublocationUrl)
  }

  for (const sublocationUrl of sublocationsUrls) {
    await urlsIterator(scrappingService, sublocationUrl)
  }

  await scrappingService.quit()

  fs.writeFileSync(`./locations-urls.json`, JSON.stringify(locationsUrls, null, 2))
}

async function urlsIterator(scrappingService, url) {

  if (visited.has(url)) {
    return
  }

  visited.add(url)

  try {
    await scrappingService.driver.get(url)

    const itemsList = await scrappingService.driver.findElements(scrappingService.by.css(".items-list"))

    if (itemsList.length > 0) {
      locationsUrls.push(url)
      return
    }

    const btnShowAll = await scrappingService.driver.findElement(scrappingService.by.id("sublocations-showall-btn")).catch(() => null)

    if (btnShowAll) {
      await btnShowAll.click()

      let locationsElements = await scrappingService.driver.findElements(scrappingService.by.css(".modal-wrapper #sublocations li a"))

      for (const locationsElement of locationsElements) {
        const locationUrl = await locationsElement.getAttribute("href")
        await urlsIterator(scrappingService, locationUrl)
      }
    } else {
      let locationsElements = await scrappingService.driver.findElements(scrappingService.by.css("#sublocations li a"))

      for (const locationsElement of locationsElements) {
        const locationUrl = await locationsElement.getAttribute("href")
        await urlsIterator(scrappingService, locationUrl)
      }
    }

  } catch (error) {
    console.log(error)
  }
}

