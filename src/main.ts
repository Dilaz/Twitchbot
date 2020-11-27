import { Bot } from "./Bot";
require('dotenv').config();



const main = async () => {
  const bot = new Bot();

  await bot.connect();
}

main().then().catch(e => console.error(e))
