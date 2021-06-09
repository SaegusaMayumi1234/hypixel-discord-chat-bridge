const CommunicationBridge = require('../contracts/CommunicationBridge')
const StateHandler = require('./handlers/StateHandler')
const MessageHandler = require('./handlers/MessageHandler')
const CommandHandler = require('./commands/CommandHandler')
const Discord = require('discord.js-light')

class DiscordManager extends CommunicationBridge {
  constructor(app) {
    super()

    this.app = app

    this.stateHandler = new StateHandler(this)
    this.messageHandler = new MessageHandler(this, new CommandHandler(this))
  }

  connect() {
    this.client = new Discord.Client({
      cacheGuilds: true,
      cacheChannels: true,
      cacheOverwrites: false,
      cacheRoles: true,
      cacheEmojis: false,
      cachePresences: false,
    })

    this.client.on('ready', () => this.stateHandler.onReady())
    this.client.on('message', message => this.messageHandler.onMessage(message))

    this.client.login(this.app.config.discord.token).catch(error => {
      this.app.log.error(error)

      process.exit(1)
    })

    process.on('SIGINT', () => this.stateHandler.onClose())
  }

  onBroadcast({ username, message, guildRank }) {
    this.app.log.broadcast(`${username} [${guildRank}]: ${message}`, `Discord`)
    switch (this.app.config.discord.messageMode.toLowerCase()) {
      case 'bot':
        this.app.discord.client.channels.fetch(this.app.config.discord.channel).then(channel => {
          channel.send({
            embed: {
              description: message,
              color: '6495ED',
              timestamp: new Date(),
              footer: {
                text: guildRank,
              },
              author: {
                name: username,
                icon_url: 'https://www.mc-heads.net/avatar/' + username,
              },
            },
          })
        })
        break

      case 'webhook':
        message = message.replace(/@/g, '') // Stop pinging @everyone or @here
        this.app.discord.webhook.send(
          message, { username: username, avatarURL: 'https://www.mc-heads.net/avatar/' + username }
        )
        break

      default:
        throw new Error('Invalid message mode: must be bot or webhook')
    }
  }

  onLogin(username) {
    this.app.log.broadcast(`${username} joined.`, `Discord`)
    switch (this.app.config.discord.messageMode.toLowerCase()) {
      case 'bot':
        this.app.discord.client.channels.fetch(this.app.config.discord.channel).then(channel => {
          channel.send({
            embed: {
              color: '7CFC00',
              timestamp: new Date(),
              author: {
                name: `${username} joined.`,
                icon_url: 'https://www.mc-heads.net/avatar/' + username,
              },
            }
          })
        })
        break

      case 'webhook':
        this.app.discord.webhook.send({
          username: username, avatarURL: 'https://www.mc-heads.net/avatar/' + username, embeds: [{
            color: '7CFC00',
            author: {
              name: `${username} joined.`,
            },
          }]
        })
        break

      default:
        throw new Error('Invalid message mode: must be bot or webhook')
    }
  }

  onLogout(username) {
    this.app.log.broadcast(`${username} left.`, `Discord`)
    switch (this.app.config.discord.messageMode.toLowerCase()) {
      case 'bot':
        this.app.discord.client.channels.fetch(this.app.config.discord.channel).then(channel => {
          channel.send({
            embed: {
              color: 'DC143C',
              timestamp: new Date(),
              author: {
                name: `${username} left.`,
                icon_url: 'https://www.mc-heads.net/avatar/' + username,
              },
            }
          })
        })
        break

      case 'webhook':
        this.app.discord.webhook.send({
          username: username, avatarURL: 'https://www.mc-heads.net/avatar/' + username, embeds: [{
            color: 'DC143C',
            author: {
              name: `${username} left.`,
            },
          }]
        })
        break

      default:
        throw new Error('Invalid message mode: must be bot or webhook')
    }
  }
  
  onEventLog(message) {
    if (!this.app.config.discord.guildeventlog) {
      return
    }
    this.app.log.broadcast(`${message}`, `Event Log`)
    this.app.discord.client.channels.fetch(this.app.config.discord.channellog).then(channel => {
      channel.send({
        embed: {
          description: message,
          color: 'FEE6A8',
          timestamp: new Date(),
          footer: {
            text: "Event was on",
          },
          author: {
            name: "Guild Event Log",
          },
        },
      })
    })
  }
}

module.exports = DiscordManager
