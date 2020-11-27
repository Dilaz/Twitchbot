import { Model, snakeCaseMappers } from "objection";
import { Channel } from "./Channel";

export class User extends Model {
  id: number;

  name: string;

  lastSeenAt: Date;

  isBot: boolean;

  channels: Channel[];

  settings: {};

  static get tableName() {
    return 'users';
  }

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],

      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        isBot: { type: 'boolean' },
        lastSeenAt: { type: 'timestamp' },

        settings: {
          type: 'object',
          properties: {
          }
        }
      }
    };
  }

  static get relationMappings() {
    const Channel = require('./Channel');

    return {
      channels: {
        relation: Model.ManyToManyRelation,
        modelClass: Channel,
        join: {
          from: 'users.id',
          through: {
            from: 'channel_users.user_id',
            to: 'channel_users.channel_id',
          },
          to: 'channels.id',
        },
      },
    };
  }
}
