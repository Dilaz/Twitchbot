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
```bash
docker-compose up -d
node dist/main.js
```

## Development
```bash
tsc --watch
```
