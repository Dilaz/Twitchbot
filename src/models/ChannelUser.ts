import { Model, snakeCaseMappers } from 'objection';
import { Channel } from './Channel';
import { User } from './User';

export class ChannelUser extends Model {
  id: number;

  lastSeenAt: Date;

  channelId: number;
  userId: number;

  channel: Channel;

  user: User;

  static get tableName() {
    return 'channel_users';
  }

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get relationMappings() {
    return {
      channel: {
        relation: Model.BelongsToOneRelation,
        modelClass: Channel,
        join: {
          from: 'channel_users.channel_id',
          to: 'channels.id',
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'channel_users.user_id',
          to: 'users.id',
        },
      }
    };
  }
}