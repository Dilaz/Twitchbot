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
`POSTGRES_HOST`: Postgres database host (defaults to localhost)
`POSTGRES_PORT`: Postgres database port (defaults to 5432)
`POSTGRES_USER`: Postgres database user
`POSTGRES_PASSWORD`: Postgres database password
`POSTGRES_DB`: Postgres database name

`USE_MQ`: `true`/`false` if RabbitMQ should be used to receive updates

Required if `USE_MQ` is `true`
`MQ_PORT`: RabbitMQ port
`MQ_UI_PORT`: RabbitMQ web UI port
`MQ_URL`: RabbitMQ connection url

```bash
docker-compose up -d
node dist/main.js
```

## Development
```bash
tsc --watch
```

## Kubernetes
```bash
kubectl apply -f k8s/twitchbot-configmap.yaml
kubectl create secret generic -n twitchbot twitchbot-secrets --from-literal=BOT_TOKEN=__TWITCH_BOT_TOKEN__ --from-literal=POSTGRES_PASSWORD=__POSTGRESQL_PASSWORD__
kubectl apply -f k8s/twitchbot.yaml
```
