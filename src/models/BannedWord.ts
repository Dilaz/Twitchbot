import { Model, snakeCaseMappers } from 'objection';
import { Channel } from './Channel';


export class BannedWord extends Model {
  id: number;
  str: string;
  regex: boolean;

  channel?: Channel;

  static get tableName() {
    return 'banned_words';
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
          from: 'banned_words.channel_id',
          to: 'channels.id',
        },
      },
    };
  }
}
