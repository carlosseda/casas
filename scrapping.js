const { exec } = require("child_process")
const { Builder, By, until } = require("selenium-webdriver")
const chrome = require("selenium-webdriver/chrome")
const fs = require("fs")
const net = require("net")

const sleep = ms => new Promise(r => setTimeout(r, ms))
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const locationsUrls = require("./locations-urls.json")

// === CONFIGURACIÓN DE SALIDA POR FECHA ===
const today = new Date().toISOString().slice(0, 10)

const baseDir = `./data/${today}`
if (!fs.existsSync("./data")) fs.mkdirSync("./data")
if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir)

// Obtener el “slug” que hay justo antes de /mapa
function getLocationSlug(url) {
  // elimina el sufijo /mapa o /mapa/
  const clean = url.replace(/\/mapa\/?$/, "")
  const parts = clean.split("/").filter(Boolean)
  return parts[parts.length - 1] // último segmento
}

; (async () => {

  const profile = "C:\\temp\\ChromeProfiles"

  if (!fs.existsSync(profile)) fs.mkdirSync(profile, { recursive: true })
  exec(
    `"${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe" ` +
    `--remote-debugging-port=9222 --user-data-dir="${profile}" --start-maximized`
  )

  // Esperar a que Chrome abra el puerto 9222
  await new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      const socket = new net.Socket()
      socket
        .once("connect", () => { socket.destroy(); resolve() })
        .once("error", () => {
          socket.destroy()
          if (Date.now() - start > 15000) reject(new Error("⏰ Timeout esperando puerto 9222"))
          else setTimeout(check, 400)
        })
        .connect(9222, "127.0.0.1")
    }
    check()
  })

  const options = new chrome.Options()
  options.options_["debuggerAddress"] = "127.0.0.1:9222"
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build()

  for (const url of locationsUrls) {
    const locationSlug = getLocationSlug(url)
    const locationDoneFile = `${baseDir}/location-${locationSlug}.done`

    // Si ya se procesó esta localización previamente, se salta
    if (fs.existsSync(locationDoneFile)) {
      console.log(`⏭️ Localización ya procesada (${locationSlug}), se omite: ${url}`)
      continue
    }

    console.log(`▶️ Procesando localización (${locationSlug}): ${url}`)
    await scrapping(driver, url, locationSlug)

    // Marcar localización como completada
    fs.writeFileSync(
      locationDoneFile,
      JSON.stringify({ url, locationSlug, date: today }, null, 2),
      "utf-8"
    )
    console.log(`✅ Localización completada: ${locationSlug}`)

    // Pausa larga entre localizaciones
    await sleep(300000)
  }

  await driver.quit()
  console.log(`✅ Proceso finalizado. Datos en la carpeta ${baseDir}`)

})()

async function scrapping(driver, url, locationSlug) {

  await driver.get(url)

  try {
    const btn = await driver.wait(
      until.elementLocated(By.id("didomi-notice-agree-button")),
      5000
    )
    await driver.executeScript("arguments[0].scrollIntoView()", btn)
    await sleep(400)
    await btn.click()
  } catch { }

  await driver.wait(until.elementLocated(By.css("div.item-info-container")), 15000)

  const propertiesUrls = []

  while (true) {

    for (let i = 0; i < random(3, 6); i++) {
      await driver.executeScript(`window.scrollBy(0, ${random(500, 900)});`)
      await sleep(random(700, 1600))
    }

    let items = await driver.findElements(By.css("div.item-info-container"))
    if (!items.length) break

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        const url = await item.findElement(By.css("a.item-link")).getAttribute("href").catch(() => "")
        if (!url || propertiesUrls.includes(url)) continue
        propertiesUrls.push(url)
      } catch (e) {
        console.log("❌ Error en anuncio:", e.message)
      }
    }

    let next
    try { next = await driver.findElement(By.css("li.next:not(.disabled) a")) } catch { }
    if (!next) break

    await driver.executeScript("arguments[0].scrollIntoView()", next)
    await sleep(1000)
    await next.click()
    await sleep(1800)
  }

  for (let i = 0; i < propertiesUrls.length; i++) {

    const url = propertiesUrls[i]

    // Calcular ID antes de cargar la página y comprobar si ya existe el JSON
    const id = url.split("/inmueble/")[1]?.split("/")[0]
    if (!id) {
      console.log(`⚠️ No se ha podido extraer ID de: ${url}`)
      continue
    }

    const filePath = `${baseDir}/${id}.json`
    if (fs.existsSync(filePath)) {
      console.log(`⏭️ Inmueble ya procesado (${id}), se omite`)
      continue
    }

    await driver.get(url)
    await sleep(1500)

    try {
      const captchaElement = await driver.findElement(By.css("#captcha__frame"))
      if (captchaElement) {
        console.log(`🧩 Captcha detectado en ${url}, esperando unos segundos...`)
        await sleep(5000)
      }
    } catch { }

    const property = { url, locationSlug }

    property.typeOfRental = "long-term"
    property.title = await driver.findElement(By.css(".main-info__title-main")).getText().catch(() => "")

    try {
      property.description = (await driver.findElement(By.css(".comment p")).getAttribute("innerHTML"))
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?p>/gi, "")
        .trim()
    } catch {
      property.description = ""
    }

    property.isAttic = /ático/i.test(property.title)
    const detailsElements = await driver.findElements(By.css(".info-features span"))
    const details = await Promise.all(detailsElements.map(d => d.getText()))

    for (const detail of details) {
      if (/hab/i.test(detail)) property.rooms = parseInt(detail)
      else if (/m²/i.test(detail)) property.meters = parseInt(detail)
    }

    // Precio
    try {
      const price = await driver.findElement(By.css(".info-data-price .txt-bold")).getText().catch(() => "")
      property.price = parseInt(price.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."), 10) || 0;
    } catch {
      property.price = 0
    }

    property.monthsDeposit = 0

    const priceDetailsElements = await driver.findElements(By.css(".price-features__container .flex-feature-details"))

    for (const priceDetailsElement of priceDetailsElements) {
      const priceDetail = await priceDetailsElement.getText()
      if (/Fianza/i.test(priceDetail)) {
        property.monthsDeposit = parseInt(priceDetail.replace(/[^\d]/g, "")) || 0
      }
    }

    // Especificaciones
    property.specifications = []

    let basicSpecificationsSection = await driver.findElements(
      By.xpath(`//h2[contains(normalize-space(.), "Características básicas")]`)
    )

    if (basicSpecificationsSection.length > 0) {
      const basicSpecificationsElements = await driver.findElements(
        By.xpath(
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
            property.parkingMonthPrice = parseInt(basicSpecification.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."), 10) || 0;
          } else if (/incluida/i.test(basicSpecification)) {
            property.parkingMonthPrice = 0
          }
        }

        else if (/Construido en/i.test(basicSpecification)) property.yearBuilt = parseInt(basicSpecification)

        else property.specifications.push(basicSpecification)
      }
    }

    let buildingSection = await driver.findElements(
      By.xpath(`//h2[contains(normalize-space(.), "Edificio")]`)
    )

    if (buildingSection.length > 0) {
      const buildingElements = await driver.findElements(
        By.xpath(
          `//h2[contains(normalize-space(.), "Edificio")]
            /following-sibling::div[1]//li`
        )
      )

      for (const buildingElement of buildingElements) {
        const building = await buildingElement.getText()

        if (/Con ascensor/i.test(building)) property.hasElevator = true
        else if (/Sin ascensor/i.test(building)) property.hasElevator = false
        else if (/Bajo /i.test(building)) property.floor = 0
        else if (/ª/i.test(building)) property.floor = parseInt(
          building.replace(/[^\d,.-]/g, "").replace(",", ".")
        )
        else if (/Interior/i.test(building)) property.floorOrientation = "interior"
        else if (/Exterior/i.test(building)) property.floorOrientation = "exterior"
      }
    }

    let equipmentSection = await driver.findElements(
      By.xpath(`//h2[contains(normalize-space(.), "Equipamiento")]`)
    )

    if (equipmentSection.length > 0) {
      const equipmentElements = await driver.findElements(
        By.xpath(
          `//h2[contains(normalize-space(.), "Equipamiento")]
            /following-sibling::div[1]//li`
        )
      )

      for (const equipmentElement of equipmentElements) {
        const equipment = await equipmentElement.getText()
        property.specifications.push(equipment)
      }
    }

    let energySection = await driver.findElements(
      By.xpath(`//h2[contains(normalize-space(.), "Certificado energético")]`)
    )

    if (energySection.length > 0) {
      const energyElements = await driver.findElements(
        By.xpath(
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
        }

        else if (/trámite/i.test(energy)) {
          property.energyConsumption = energy
          property.energyEmission = energy
          continue
        }

        else if (/Consumo/i.test(energy)) {
          const certificationIcon = await energyElement.findElement(By.xpath(".//span[2]"))
          const certificationIconClassName = await certificationIcon.getAttribute("class")
          const match = certificationIconClassName.match(/[a-z]$/i)
          const letter = match ? match[0].toUpperCase() : null

          property.energyConsumption = letter
        }

        else if (/Emisiones/i.test(energy)) {
          const certificationIcon = await energyElement.findElement(By.xpath(".//span[2]"))
          const certificationIconClassName = await certificationIcon.getAttribute("class")
          const match = certificationIconClassName.match(/[a-z]$/i)
          const letter = match ? match[0].toUpperCase() : null

          property.energyEmission = letter
        }
      }
    }

    // Etiquetas
    let tagElements = await driver.findElements(By.css(".detail-info-tags .tag"))

    for (const tagElement of tagElements) {
      const tag = await tagElement.getText()

      if (/Alquiler de temporada/i.test(tag)) {
        property.typeOfRental = "temporal"
        continue
      }

      property.specifications.push(tag)
    }

    // Coordenadas GPS
    try {
      const noShowAddressElement = await driver.findElement(By.css(".no-show-address-feedback-text"))
      if (noShowAddressElement) {
        property.exactCoordinates = false
      }
    } catch {
      property.exactCoordinates = true
    }

    try {
      await driver.executeScript("document.getElementById('mapWrapper').scrollIntoView();")
      await sleep(1000)

      const img = await driver.findElement(By.id("sMap"))
      const src = await img.getAttribute("src")
      const centerMatch = src.match(/center=([^&]+)/)

      if (centerMatch) {
        const coords = decodeURIComponent(centerMatch[1])
        property.latitude = parseFloat(coords.split(",")[0]) || null
        property.longitude = parseFloat(coords.split(",")[1]) || null
      } else {
        property.latitude = null
        property.longitude = null
      }
    } catch {
      property.latitude = null
      property.longitude = null
    }

    // Guardado del inmueble
    try {
      fs.writeFileSync(filePath, JSON.stringify(property, null, 2), "utf-8")
      console.log(`💾 Guardado inmueble ${id} en ${filePath}`)
    } catch (e) {
      console.error(`❌ Error guardando el inmueble ${id}:`, e.message)
    }
  }
}
