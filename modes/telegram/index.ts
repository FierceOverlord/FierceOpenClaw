import { Telegraf } from "telegraf";
import chalk from "chalk";
import { WELCOME } from "./constants";
import { registerHandlers } from "./handlers";

export async function runTelegramMode() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const ownerId = process.env.TELEGRAM_OWNER_ID?.trim();

  if (!token || !ownerId) {
    console.log(
      chalk.red("TELEGRAM_BOT_TOKEN and TELEGRAM_OWNER_ID must be set in .env\n"),
    );
    return;
  }

  const bot = new Telegraf(token);
  registerHandlers(bot);
  bot.catch((err) => console.error(chalk.red("Telegram error:"), err));

  await bot.telegram.sendMessage(ownerId, WELCOME, { parse_mode: "Markdown" });
  console.log(chalk.green("Sent welcome message to Telegram.\n"));

  bot.launch().catch((err) => {
    console.error(chalk.red("Bot failed to launch:"), err);
    process.exit(1);
  });
  console.log(chalk.green("Telegram bot is running. Press Ctrl+C to stop.\n"));

  await new Promise<void>((resolve) => {
    const stop = () => {
      bot.stop("SIGINT");
      resolve();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}
