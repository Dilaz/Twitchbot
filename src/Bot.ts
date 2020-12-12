import { Logger } from 'tslog';
import { Client } from 'tmi.js';
import { Channel } from './models/Channel';
import { knexSnakeCaseMappers, Model } from 'objection';
import * as Knex from 'knex';
import { User } from './models/User';
import { connect as amqpConnect, Connection, Channel as MqChannel } from 'amqplib'
import { Url } from './models/Url';
import { BannedWord } from './models/BannedWord';

require('dotenv').config();

const defaultConnectionOptions = {
  secure: true,
  reconnect: true,
};

export class Bot {
  protected readonly mqChannelName = 'channels';
  protected readonly banMessage = 'Spambot';
  protected readonly logger: Logger = new Logger();
  protected readonly knex: Knex;
  protected client: Client;
  protected mqClient: Connection;
  protected mqChannel: MqChannel;
  private isConnected: boolean = false;

  protected people: Set<string> = new Set();
  protected channels: Map<string, Channel> = new Map();
  private seenPeople: Map<string, Date> = new Map();
  private spambots: Set<string> = new Set();
  private spamurls: Set<string> = new Set();
  protected bannedWords: Array<string | RegExp> = [];
  protected bannedWordsPerChannel: Map<string, Array<string | RegExp>> = new Map();

  constructor(private readonly connectionOptions: typeof defaultConnectionOptions = defaultConnectionOptions) {
    this.logger.debug('Bot created!');

    this.knex = Knex({
      client: 'postgres',

      connection: {
        debug: true,
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT) || 5432,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
      },

      ...knexSnakeCaseMappers(),
    });


  }

  private async initMq() {
    if (process.env.USE_MQ !== 'true') {
      return;
    }

    this.mqClient = await amqpConnect(process.env.MQ_URL || 'amqp://localhost', 'heartbeat=60');

    this.logger.debug('MQ connection opened');

    this.mqChannel = await this.mqClient.createChannel();

    this.logger.debug('MQ channel create');

    await this.mqChannel.assertQueue(this.mqChannelName, { durable: true });

    await this.mqChannel.consume(this.mqChannelName, async (message) => {
      this.logger.debug(`New message: ${message.content}`);
      try {
        const obj = JSON.parse(message.content.toString());
        switch (obj.type) {
          case 'newChannel':
            await this.newChannel(obj.name);
            break;
          case 'deleteChannel':
            await this.removeChannel(obj.name);
            break;
          default:
            this.logger.warn(`Invalid message type: ${obj.type}`);
            break;
        }

        this.mqChannel.ack(message);
      } catch (e) {
        this.logger.error(JSON.stringify(e))
        this.mqChannel.nack(message, false, false);
      }

    }, { consumerTag: 'twitchbot' });
  }

  /**
   * Init the tmi.js client
   */
  private async initClient() {
    Model.knex(this.knex);

    // Load channels
    const channels = await Channel.query();
    channels.forEach(channel => this.channels.set(`#${channel.name}`, channel));
    this.logger.info(`Found ${this.channels.size} channels`)
    channels.forEach(channel => this.bannedWordsPerChannel.set(`#${channel.name}`, []));

    // Load users
    const users = await User.query();
    users.forEach(user => user.isBot ? this.spambots.add(user.name) : this.people.add(user.name));
    this.logger.info(`Found ${this.people.size} users`);
    this.logger.info(`Found ${this.spambots.size} spambots`);

    // Load spam urls
    const urls = await Url.query().where('spam', '=', true);
    urls.forEach(url => this.spamurls.add(url.url));
    this.logger.info(`Found ${this.spamurls.size} spam urls`);

    // Load banned words
    let regexes = 0;
    const bannedWords = await BannedWord.query().withGraphFetched('channel');
    bannedWords.forEach(word => {
      const matchWord = word.regex ? new RegExp(word.str, 'i') : word.str;
      regexes += word.regex ? 1 : 0;
      if (!word.channel) {
        this.bannedWords.push(matchWord)
      } else {
        this.bannedWordsPerChannel.get(word.channel.name).push(matchWord);
      }
    });
    this.logger.info(`Found ${this.bannedWords.length} global banned words (${regexes} regex)`);

    this.client = Client({
      identity: {
        username: 'Dbot',
        password: process.env.BOT_TOKEN,
      },
      connection: this.connectionOptions,
      channels: [...this.channels.keys()],
    });


    this.client.on('message', this.onMessage);
    this.client.on('connected', this.onConnect);
    this.client.on('connecting', this.onConnecting);
    this.client.on('disconnected', this.onDisconnect);
    this.client.on('join', this.onJoin);
  }

  /**
   * Trigger to join to a new channel
   * @param name Channel name
   */
  protected async newChannel(name: string) {
    if (this.channels.has(name)) {
      this.logger.warn(`Channel already exists: ${name}`)
      throw { err: 'channel_already_exists' };
    } else if (!name) {
      this.logger.warn('Empty channel name!')
      throw { err: 'empty_channel_name' };
    }
    this.logger.info(`Joining a new channel: ${name}`)
    this.client.join(name);

    const channel = await Channel.query().insert({ name });
    this.channels.set(name, channel);
  }

  /**
   *Trigger to leave existing channel
   * @param name Channel name
   */
  protected async removeChannel(name: string) {
    if (!this.channels.has(name)) {
      this.logger.warn(`Channel does not exist: ${name}`)
      throw { err: 'channel_does_not_exist' };
    } else if (!name) {
      this.logger.warn('Empty channel name!')
      throw { err: 'empty_channel_name' };
    }
    this.logger.info(`Leaving channel: ${name}`)
    this.client.part(name);

    this.channels.delete(name);
    await Channel.query().where('name', '=', name).delete();
  }

  /**
   *
   * @param channel
   * @param message
   */
  private checkForBannedStrings(channel: string, message: string): boolean {
    for (const word of this.bannedWords) {
      if (message.match(word)) {
        return true;
      }
    }

    for (const word of this.bannedWordsPerChannel.get(channel)) {
      if (message.match(word)) {
        return true;
      }
    }

    return false;
  }

  protected onJoin = async (channel: string, username: string, self: boolean) => {
    if (self) { return; }
    this.logger.debug(`${username} joined ${channel}`);

    // Check the new user from the list of spambots
    if (this.spambots.has(username)) {
      await this.banOrTimeout(channel, username, true);
    }
  }


  /**
   * Callback for new message
   * @param channel
   * @param tags
   * @param message
   * @param self
   */
  protected onMessage = async (channel: string, tags: any, message: string, self: boolean) => {
    if (self) { return; }

    this.logger.info(`${tags['display-name']} -> ${channel}: ${message}`);

    if (this.people.has(tags.username)) { return; }

    if ((this.spambots.has(tags.username) || this.checkForBannedStrings(channel, message)) && !tags.mod && !tags.vip) {
      await this.banOrTimeout(channel, tags.username);

      // Save the urls
      if (this.hasUrl(message)) {
        const urls = this.getUrls(message);
        for (const url of urls) {
          if (this.spamurls.has(url)) { continue; }
          this.logger.info(`New spam url: ${url}`)
          this.spamurls.add(url);

          await Url.query().insert({
            url,
            spam: true,
          });
        }
      }
    } else {
      this.logger.debug(`New person! ${tags.username}`)
      this.people.add(tags.username);
      await User.query().insert({
        name: tags.username,
        lastSeenAt: new Date(),
      });
    }
  }

  /**
   * Ban or timeout user according to the settings
   * @param channel
   * @param username
   * @param forceBan Just ban user, no timeouts
   */
  private async banOrTimeout(channel: string, username: string, forceBan: boolean = false) {
    const channelObj = this.channels.get(channel);
    if (!forceBan && channelObj.settings?.timeoutOnly) {
      await this.client.timeout(channel, username, 300, this.banMessage);
    } else {
      try {
        await this.client.ban(channel, username, this.banMessage);
      } catch (e) {
        this.logger.error(`Could not ban ${username} in ${channel}. Maybe I'm not a mod?`);
      }
    }

    if (!this.spambots.has(username)) {
      await User.query().insert({
        name: username,
        lastSeenAt: new Date(),
        isBot: true,
      });

      this.spambots.add(username);
    }
  }

  public getStatus(): boolean {
    return this.isConnected;
  }

  protected hasUrl(str: string): boolean {
    return !!str.match(/https?:\/\//);
  }

  protected getUrls(str: string): string[] {
    return str.match(/(https?:\/\/[^ ]+)/gi);
  }

  protected onDisconnect = async (reason: string) => {
    this.isConnected = false;
    this.logger.info(`Disconnected from server: ${reason}`);
  }

  protected onConnect = async (address: string, port: number) => {
    this.isConnected = true;
    this.logger.info(`Connected to ${address}:${port}`);
  }

  protected onConnecting = async (address: string, port: number) => {
    this.logger.info(`Connecting to ${address}:${port}`);
  }

  connect = async () => {
    await this.initClient();
    await this.initMq();

    return this.client.connect();
  }
}
