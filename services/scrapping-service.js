const { exec } = require("child_process")
const { Builder, By, until } = require("selenium-webdriver")
const chrome = require("selenium-webdriver/chrome")
const net = require("net")
const fs = require("fs")

module.exports = class ScrappingService {
  constructor(profile) {
    this.driver = null
    this.until = until
    this.by = By
  }

  async generateProfile(profile) {
    if (!fs.existsSync(profile)) fs.mkdirSync(profile, { recursive: true })

    if (profile.includes("\\")) {
      exec(`"${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="${profile}" --start-maximized`)
    } else {
      exec(`google-chrome --remote-debugging-port=9222 --user-data-dir="${profile}" --start-maximized`)
    }

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
    this.driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build()
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  async quit() {
    await this.driver.quit()
  }
}
