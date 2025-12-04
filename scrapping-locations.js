const { exec } = require("child_process")
const { Builder, By, until } = require("selenium-webdriver")
const chrome = require("selenium-webdriver/chrome")
const fs = require("fs")
const net = require("net")
const sleep = ms => new Promise(r => setTimeout(r, ms))
const locationsUrls = []
const visited = new Set()

async function idealista(urlBase) {

  const profile = "C:\\temp\\ChromeProfile"

  if (!fs.existsSync(profile)) fs.mkdirSync(profile, { recursive: true })
  exec(`"${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="${profile}" --start-maximized`)

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
  await driver.get(urlBase)
  
  try {
    const btn = await driver.wait(
      until.elementLocated(By.id("didomi-notice-agree-button")),
      5000
    )
    await driver.executeScript("arguments[0].scrollIntoView()", btn)
    await sleep(400)
    await btn.click()
  } catch { }


  const btnShowAll = await driver.findElement(By.id("sublocations-showall-btn")).catch(() => null)

  if (btnShowAll) {
    await btnShowAll.click()
  }


  let sublocationsUrls = []
  let sublocationsElements = await driver.findElements(By.css(".modal-wrapper #sublocations li a"))

  for (const sublocationsElement of sublocationsElements) {
    const sublocationUrl = await sublocationsElement.getAttribute("href")
    sublocationsUrls.push(sublocationUrl)
  }

  for (const sublocationUrl of sublocationsUrls) {
    await urlsIterator(driver, sublocationUrl)
  }

  async function urlsIterator(driver, url) {

    if (visited.has(url)) {
      return
    }

    visited.add(url)

    try{
      await driver.get(url)

      const itemsList = await driver.findElements(By.css(".items-list"))

      if (itemsList.length > 0) {
        locationsUrls.push(url)
        return
      }

      const btnShowAll = await driver.findElement(By.id("sublocations-showall-btn")).catch(() => null)

      if (btnShowAll) {
        await btnShowAll.click()

        let locationsElements = await driver.findElements(By.css(".modal-wrapper #sublocations li a"))

        for (const locationsElement of locationsElements) {
          const locationUrl = await locationsElement.getAttribute("href")
          await urlsIterator(driver, locationUrl)
        }
      }else{
        let locationsElements = await driver.findElements(By.css("#sublocations li a"))

        for (const locationsElement of locationsElements) {
          const locationUrl = await locationsElement.getAttribute("href")
          await urlsIterator(driver, locationUrl)
        }
      }
    
    }catch(error){
      console.log(error)
    }  
  }

  await driver.quit()

  fs.writeFileSync(`./locations-urls.json`, JSON.stringify(locationsUrls, null, 2))
}

idealista("https://www.idealista.com/alquiler-viviendas/balears-illes/mallorca/mapa");
