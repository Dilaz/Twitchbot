import { Model, snakeCaseMappers } from 'objection';


export class Url extends Model {
  id: number;
  url: string;
  spam: boolean;

  static get tableName() {
    return 'urls';
  }

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['url'],

      properties: {
        id: { type: 'integer' },
        url: { type: 'string', minLength: 1, maxLength: 255 },
        spam: { type: 'boolean' },
      }
    };
  }

}