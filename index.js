const runQuery = require("./run-query.js")
const TelegramService = require("./services/telegram-service.js")

const telegram = new TelegramService(
  process.env.TELEGRAM_TOKEN,
  null,
  async (userText) => {
    return await runQuery(userText)
  }
)

console.log("Bot activo. Esperando mensajes...")