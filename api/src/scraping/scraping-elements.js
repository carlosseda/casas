const ScrappingService = require('../services/scrapping-service.js')
const scrappingService = new ScrappingService()
const storeMongoDB = require('./store-mongodb.js')
const storeChromaDB = require('./store-chromadb.js')
const storeNeo4j = require('./store-neo4j.js')
const fs = require('fs')
const path = require('path')
const baseDir = path.join(__dirname, 'data')

module.exports = async function scrappingElements (locationsUrls) {
  const today = new Date().toISOString().slice(0, 10)
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir)

  await scrappingService.generateProfile(process.env.CHROME_PROFILE)

  for (const url of locationsUrls) {
    const clean = url.replace(/\/mapa\/?$/, '')
    const parts = clean.split('/').filter(Boolean)
    const locationSlug = parts[parts.length - 1]
    const locationDoneFile = `${baseDir}/location-${locationSlug}.done`

    if (fs.existsSync(locationDoneFile)) {
      console.log(`⏭️ Localización ya procesada (${locationSlug}), se omite: ${url}`)
      continue
    }

    console.log(`▶️ Procesando localización (${locationSlug}): ${url}`)
    await scrappingElement(scrappingService, url, locationSlug)

    fs.writeFileSync(
      locationDoneFile,
      JSON.stringify({ url, locationSlug, date: today }, null, 2),
      'utf-8'
    )

    console.log(`✅ Localización completada: ${locationSlug}`)
    await scrappingService.sleep(300000)
  }

  await scrappingService.quit()
  console.log(`✅ Proceso finalizado. Datos en la carpeta ${baseDir}`)

  const elements = await storeMongoDB(baseDir)
  await storeChromaDB(elements)
  await storeNeo4j(elements)
}

async function scrappingElement (scrappingService, url, locationSlug) {
  await scrappingService.driver.get(url)

  try {
    const btn = await scrappingService.driver.wait(
      scrappingService.until.elementLocated(scrappingService.by.id('didomi-notice-agree-button')),
      5000
    )
    await scrappingService.driver.executeScript('arguments[0].scrollIntoView()', btn)
    await scrappingService.sleep(400)
    await btn.click()
  } catch { }

  await scrappingService.driver.wait(scrappingService.until.elementLocated(scrappingService.by.css('div.item-info-container')), 15000)

  const propertiesUrls = []

  while (true) {
    for (let i = 0; i < scrappingService.random(3, 6); i++) {
      await scrappingService.driver.executeScript(`window.scrollBy(0, ${scrappingService.random(500, 900)});`)
      await scrappingService.sleep(scrappingService.random(700, 1600))
    }

    const items = await scrappingService.driver.findElements(scrappingService.by.css('div.item-info-container'))
    if (!items.length) break

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        const url = await item.findElement(scrappingService.by.css('a.item-link')).getAttribute('href').catch(() => '')
        if (!url || propertiesUrls.includes(url)) continue
        propertiesUrls.push(url)
      } catch (e) {
        console.log('❌ Error en anuncio:', e.message)
      }
    }

    let next
    try { next = await scrappingService.driver.findElement(scrappingService.by.css('li.next:not(.disabled) a')) } catch { }
    if (!next) break

    await scrappingService.driver.executeScript('arguments[0].scrollIntoView()', next)
    await scrappingService.sleep(1000)
    await next.click()
    await scrappingService.sleep(1800)
  }

  for (let i = 0; i < propertiesUrls.length; i++) {
    const url = propertiesUrls[i]

    const id = url.split('/inmueble/')[1]?.split('/')[0]
    if (!id) {
      console.log(`⚠️ No se ha podido extraer ID de: ${url}`)
      continue
    }

    const filePath = `${baseDir}/${id}.json`
    if (fs.existsSync(filePath)) {
      console.log(`⏭️ Inmueble ya procesado (${id}), se omite`)
      continue
    }

    await scrappingService.driver.get(url)
    await scrappingService.sleep(1500)

    try {
      const captchaElement = await scrappingService.driver.findElement(scrappingService.by.css('#captcha__frame'))
      if (captchaElement) {
        console.log(`🧩 Captcha detectado en ${url}, esperando unos segundos...`)
        await scrappingService.sleep(5000)
      }
    } catch { }

    const property = { url, locationSlug }

    property.typeOfRental = 'long-term'
    property.title = await scrappingService.driver.findElement(scrappingService.by.css('.main-info__title-main')).getText().catch(() => '')

    try {
      property.description = (await scrappingService.driver.findElement(scrappingService.by.css('.comment p')).getAttribute('innerHTML'))
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?p>/gi, '')
        .trim()
    } catch {
      property.description = ''
    }

    property.isAttic = /ático/i.test(property.title)
    const detailsElements = await scrappingService.driver.findElements(scrappingService.by.css('.info-features span'))
    const details = await Promise.all(detailsElements.map(d => d.getText()))

    for (const detail of details) {
      if (/hab/i.test(detail)) property.rooms = parseInt(detail)
      else if (/m²/i.test(detail)) property.meters = parseInt(detail)
    }

    // Precio
    try {
      const price = await scrappingService.driver.findElement(scrappingService.by.css('.info-data-price .txt-bold')).getText().catch(() => '')
      property.price = parseInt(price.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'), 10) || 0
    } catch {
      property.price = 0
    }

    property.monthsDeposit = 0

    const priceDetailsElements = await scrappingService.driver.findElements(scrappingService.by.css('.price-features__container .flex-feature-details'))

    for (const priceDetailsElement of priceDetailsElements) {
      const priceDetail = await priceDetailsElement.getText()
      if (/Fianza/i.test(priceDetail)) {
        property.monthsDeposit = parseInt(priceDetail.replace(/[^\d]/g, '')) || 0
      }
    }

    property.specifications = []

    const basicSpecificationsSection = await scrappingService.driver.findElements(
      scrappingService.by.xpath('//h2[contains(normalize-space(.), "Características básicas")]')
    )

    if (basicSpecificationsSection.length > 0) {
      const basicSpecificationsElements = await scrappingService.driver.findElements(
        scrappingService.by.xpath(
          `//h2[contains(normalize-space(.), "Características básicas")]
            /following-sibling::div[1]//li`
        )
      )

      for (const basicSpecificationsElement of basicSpecificationsElements) {
        const basicSpecification = await basicSpecificationsElement.getText()

        if (/habitación|habitaciones/i.test(basicSpecification)) continue
        else if (/m²/i.test(basicSpecification)) continue
        else if (/baño|baños/i.test(basicSpecification)) property.bathrooms = parseInt(basicSpecification)

        else if (/garaje/i.test(basicSpecification)) {
          property.parking = true
          if (/€/i.test(basicSpecification)) {
            property.parkingMonthPrice = parseInt(basicSpecification.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'), 10) || 0
          } else if (/incluida/i.test(basicSpecification)) {
            property.parkingMonthPrice = 0
          }
        } else if (/Construido en/i.test(basicSpecification)) property.yearBuilt = parseInt(basicSpecification)

        else property.specifications.push(basicSpecification)
      }
    }

    const buildingSection = await scrappingService.driver.findElements(
      scrappingService.by.xpath('//h2[contains(normalize-space(.), "Edificio")]')
    )

    if (buildingSection.length > 0) {
      const buildingElements = await scrappingService.driver.findElements(
        scrappingService.by.xpath(
          `//h2[contains(normalize-space(.), "Edificio")]
            /following-sibling::div[1]//li`
        )
      )

      for (const buildingElement of buildingElements) {
        const building = await buildingElement.getText()

        if (/Con ascensor/i.test(building)) property.hasElevator = true
        else if (/Sin ascensor/i.test(building)) property.hasElevator = false
        else if (/Bajo /i.test(building)) property.floor = 0
        else if (/ª/i.test(building)) {
          property.floor = parseInt(
            building.replace(/[^\d,.-]/g, '').replace(',', '.')
          )
        } else if (/Interior/i.test(building)) property.floorOrientation = 'interior'
        else if (/Exterior/i.test(building)) property.floorOrientation = 'exterior'
      }
    }

    const equipmentSection = await scrappingService.driver.findElements(
      scrappingService.by.xpath('//h2[contains(normalize-space(.), "Equipamiento")]')
    )

    if (equipmentSection.length > 0) {
      const equipmentElements = await scrappingService.driver.findElements(
        scrappingService.by.xpath(
          `//h2[contains(normalize-space(.), "Equipamiento")]
            /following-sibling::div[1]//li`
        )
      )

      for (const equipmentElement of equipmentElements) {
        const equipment = await equipmentElement.getText()
        property.specifications.push(equipment)
      }
    }

    const energySection = await scrappingService.driver.findElements(
      scrappingService.by.xpath('//h2[contains(normalize-space(.), "Certificado energético")]')
    )

    if (energySection.length > 0) {
      const energyElements = await scrappingService.driver.findElements(
        scrappingService.by.xpath(
          `//h2[contains(normalize-space(.), "Certificado energético")]
            /following-sibling::div[1]//li`
        )
      )

      for (const energyElement of energyElements) {
        const energy = await energyElement.getText()

        if (/exento/i.test(energy)) {
          property.energyConsumption = energy
          property.energyEmission = energy
          continue
        } else if (/trámite/i.test(energy)) {
          property.energyConsumption = energy
          property.energyEmission = energy
          continue
        } else if (/Consumo/i.test(energy)) {
          const certificationIcon = await energyElement.findElement(scrappingService.by.xpath('.//span[2]'))
          const certificationIconClassName = await certificationIcon.getAttribute('class')
          const match = certificationIconClassName.match(/[a-z]$/i)
          const letter = match ? match[0].toUpperCase() : null

          property.energyConsumption = letter
        } else if (/Emisiones/i.test(energy)) {
          const certificationIcon = await energyElement.findElement(scrappingService.by.xpath('.//span[2]'))
          const certificationIconClassName = await certificationIcon.getAttribute('class')
          const match = certificationIconClassName.match(/[a-z]$/i)
          const letter = match ? match[0].toUpperCase() : null

          property.energyEmission = letter
        }
      }
    }

    const tagElements = await scrappingService.driver.findElements(scrappingService.by.css('.detail-info-tags .tag'))

    for (const tagElement of tagElements) {
      const tag = await tagElement.getText()

      if (/Alquiler de temporada/i.test(tag)) {
        property.typeOfRental = 'temporal'
        continue
      }

      property.specifications.push(tag)
    }

    try {
      const noShowAddressElement = await scrappingService.driver.findElement(scrappingService.by.css('.no-show-address-feedback-text'))
      if (noShowAddressElement) {
        property.exactCoordinates = false
      }
    } catch {
      property.exactCoordinates = true
    }

    try {
      await scrappingService.driver.executeScript('document.getElementById("mapWrapper").scrollIntoView();')
      await scrappingService.sleep(1000)

      const img = await scrappingService.driver.findElement(scrappingService.by.id('sMap'))
      const src = await img.getAttribute('src')
      const centerMatch = src.match(/center=([^&]+)/)

      if (centerMatch) {
        const coords = decodeURIComponent(centerMatch[1])
        property.latitude = parseFloat(coords.split(',')[0]) || null
        property.longitude = parseFloat(coords.split(',')[1]) || null
      } else {
        property.latitude = null
        property.longitude = null
      }
    } catch {
      property.latitude = null
      property.longitude = null
    }

    try {
      fs.writeFileSync(filePath, JSON.stringify(property, null, 2), 'utf-8')
      console.log(`💾 Guardado inmueble ${id} en ${filePath}`)
    } catch (e) {
      console.error(`❌ Error guardando el inmueble ${id}:`, e.message)
    }
  }
}
