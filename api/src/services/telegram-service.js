const TelegramBot = require('node-telegram-bot-api')
const MongoService = require('./mongodb-service')

module.exports = class TelegramService {
  constructor (telegramToken, chatId = null, onTextCallback = null) {
    this.token = telegramToken
    this.chatId = chatId
    this.onTextCallback = onTextCallback
    this.bot = new TelegramBot(this.token, { polling: true })
    this.mongoService = new MongoService({ uri: process.env.MONGODB_URI, dbName: process.env.MONGODB_DB })

    this.bot.on('message', async (msg) => {
      const chatId = this.chatId || msg.chat.id

      if (msg.text && this.onTextCallback && msg.text.startsWith('/buscar')) {
        const userQuery = msg.text.trim().replace('/buscar', '')

        const thread = await this.mongoService.insertOne('threads', {
          userQuery,
          semanticAnswer: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })

        const result = await this.onTextCallback({ userQuery, semanticAnswer: true, threadId: thread.insertedId, origin: 'telegram' })

        if (result) {
          await this.sendMessage(chatId, result)
        } else {
          await this.sendMessage(chatId, 'No se pudo procesar tu solicitud.')
        }
      }
    })
  }

  async sendMessage (chatId, message) {
    try {
      await this.bot.sendMessage(chatId, message)
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
    }
  }
}
