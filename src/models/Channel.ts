import { Model, snakeCaseMappers } from "objection";
import { User } from "./User";

export class Channel extends Model {
  id: number;

  name: string;

  users: User[];

  settings: {};

  static get tableName() {
    return 'channels';
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

        settings: {
          type: 'object',
          properties: {
            timeoutOnly: { type: 'boolean' },
          }
        }
      }
    };
  }

  static get relationMappings() {
    const User = require('./User');

    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'channels.id',
          through: {
            from: 'channel_users.channel_id',
            to: 'channel_users.user_id',
          },
          to: 'users.id',
        },
      },
    };
  }
}
