# Twitch moderator bot

A super simple moderator bot that bans/timeouts people, if their first message contains a `.ru` link or the word `bigfollows`. Channels and users are saved to __Postgres__, which is included in the `docker-compose.yaml`. Using Knex.js and Objection.js for DB and tmi.js for Twitch chat.

## Install & compile
```bash
npm install
tsc
```

or for docker
```bash
npm run docker:build
```

This will create an image called `dbot-twitchbot`

## Migrations
```bash
npx knex migrate:latest
```

## Running
Required env variables:  
`BOT_TOKEN`: Twitch bot token  
`DB_HOST`: Postgres database host (defaults to localhost)  
`DB_PORT`: Postgres database port (defaults to 5432)  
`DB_USER`: Postgres database user  
`DB_PASSWORD`: Postgres database password  
`DB_DATABASE`: Postgres database name  

`USE_MQ`: `true`/`false` if RabbitMQ should be used to receive updates

Required if `USE_MQ` is `true`  
`MQ_PORT`: RabbitMQ port  
`MQ_PORT`: RabbitMQ web UI port  
`MQ_URL`: RabbitMQ connection url  

```bash
docker-compose up -d
node dist/main.js
```

## Development
```bash
tsc --watch
```
