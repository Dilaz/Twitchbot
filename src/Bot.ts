import { Logger } from 'tslog';
import { Client, Options } from 'tmi.js';
import { Channel } from './models/Channel';
import { knexSnakeCaseMappers, Model } from 'objection';
import * as Knex from 'knex';
import { User } from './models/User';

require('dotenv').config();

const defaultConnectionOptions = {
  secure: true,
  reconnect: true,
};

export class Bot {
  protected readonly logger: Logger;
  protected readonly knex: Knex;
  protected client: Client;
  protected channels: string[];

  protected people: Set<string> = new Set();

  constructor(private readonly connectionOptions: typeof defaultConnectionOptions = defaultConnectionOptions) {
    this.logger = new Logger();
    this.logger.debug('Bot created!');

    this.knex = Knex({
      client: 'postgres',

      connection: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      },

      ...knexSnakeCaseMappers(),
    });
  }

  private async initClient() {
    Model.knex(this.knex);
    this.channels = (await Channel.query().select('name')).map(channel => `#${channel.name}`);

    this.logger.info(`Found ${this.channels.length} channels`)
    const users = await User.query().where('isBot', '=', false);

    users.forEach(user => this.people.add(user.name));
    this.logger.info(`Found ${this.people.size} users`)

    this.client = Client({
      options: { debug: true },
      identity: {
        username: 'Dbot',
        password: process.env.BOT_TOKEN,
      },
      connection: this.connectionOptions,
      channels: this.channels,
    });


    this.client.on('message', this.onMessage);
    this.client.on('connected', this.onConnect);
    this.client.on('connecting', this.onConnecting);
    this.client.on('disconnected', this.onDisconnect);
    this.client.on('join', this.onJoin);
  }

  private checkForUrls(message: string) {
    return message.match(/https?:\/\/[^ ]+\.ru/i) || message.match(/bigfollows/i);
  }

  protected onJoin = async (channel: string, username: string, self: boolean) => {
    if (self) {
      // return this.client.say(channel, 'Oh hello there!');
    }
  }

  protected onMessage = async (channel: string, tags: any, message: string, self: boolean) => {
    if (self) { return; }

    this.logger.info(`${tags['display-name']} -> ${channel}: ${message}`);
    if (this.people.has(tags.username)) { return; }

    if (this.checkForUrls(message) && !tags.mod && !tags.vip) {
      await this.client.timeout(channel, tags.username, 300, 'Spam');
      await User.query().insert({
        name: tags.username,
        lastSeenAt: new Date(),
        isBot: true,
      });
    } else {
      this.logger.debug(`New person! ${tags.username}`)
      this.people.add(tags.username);
      await User.query().insert({
        name: tags.username,
        lastSeenAt: new Date(),
      });
    }
  }

  protected onDisconnect = async (reason: string) => {
    this.logger.info(`Disconnected from server: ${reason}`);
  }

  protected onConnect = async (address: string, port: number) => {
    this.logger.info(`Connected to ${address}:${port}`);
  }

  protected onConnecting = async (address: string, port: number) => {
    this.logger.info(`Connecting to ${address}:${port}`);
  }

  connect = async () => {
    await this.initClient();

    return this.client.connect();
  }
}
