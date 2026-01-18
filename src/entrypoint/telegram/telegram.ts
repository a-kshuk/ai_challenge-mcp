import { AiEntryPoint } from "../types";
import { ChatProcessor } from "../../ai-agent";
import { Telegraf, Context } from "telegraf";
import { loadMarkdownPrompt } from "../../utils/markdown-loader";

interface SessionState {
  userName?: string;
}

const userSessions = new Map<number, SessionState>();

export class TelegramEntryPoint implements AiEntryPoint {
  private bot: Telegraf<Context>;

  constructor(
    private readonly processor: ChatProcessor,
    private readonly botToken: string = process.env.TELEGRAM_BOT_TOKEN!
  ) {
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN не задан в .env");
    }
    this.bot = new Telegraf<Context>(botToken);
  }

  async configure(): Promise<void> {
    const systemPrompt = await loadMarkdownPrompt(
      "./src/entrypoint/telegram/systemPrompt.md",
      "Ты — ассистент поддержки. Говори вежливо и по-русски."
    );

    this.processor.setConfig({
      systemPrompt,
      rag: {
        paths: ["_files/Шаблоны.xlsx"],
      },
    });
  }

  async run(): Promise<void> {
    this.bot.start(async (ctx) => {
      const userId = ctx.from.id;
      const firstName = ctx.from.first_name;

      if (firstName && firstName.length >= 2) {
        userSessions.set(userId, { userName: firstName });
        await ctx.reply(`Здравствуйте, ${firstName}! Чем могу помочь?`);
      } else {
        userSessions.set(userId, {});
        await ctx.reply("Здравствуйте! Как вас зовут?");
      }
    });

    this.bot.on("text", async (ctx) => {
      const userId = ctx.from.id;
      const message = ctx.message.text.trim();
      const session = userSessions.get(userId) || {};

      // Шаг 1: Узнаём имя
      if (!session.userName) {
        if (
          message.length >= 2 &&
          message.length <= 30 &&
          /^[А-ЯЁа-яёA-Za-z]+$/.test(message)
        ) {
          session.userName = message;
          userSessions.set(userId, session);
          await ctx.reply(
            `Приятно познакомиться, ${message}! Чем могу помочь?`
          );
        } else {
          await ctx.reply("Пожалуйста, скажите, как вас зовут. Например: Иван");
        }
        return;
      }

      try {
        const sessionId = `telegram-${userId}`;
        console.log(`[Telegram] ${session.userName}: ${message}`);
        await ctx.reply("🤔 Думаю...");

        const response = await this.processor.processMessage({
          sessionId,
          text: message,
          topK: 15,
        });
        await ctx.reply(response.message);

        if (response.tools.length > 0) {
          const toolsUsed = response.tools
            .map(
              (tool, i) =>
                `${i + 1}. ${tool.name} ${JSON.stringify(tool.arguments)}`
            )
            .join("\n");
          await ctx.reply(`🛠️ Использованные инструменты:\n${toolsUsed}`);
        }
      } catch (err) {
        console.error("[Telegram] Ошибка:", err);
        await ctx.reply("Произошла ошибка. Попробуйте позже.");
      }
    });

    await this.bot.launch();
    console.log("✅ Telegram-бот запущен");
  }
}
