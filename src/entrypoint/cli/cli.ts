import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { ChatProcessor } from "../../ai-agent";
import { AiEntryPoint } from "../types";
import { loadMarkdownPrompt } from "../../utils/markdown-loader";

export class CliEntryPoint implements AiEntryPoint {
  private readonly SESSION_ID = "cli-session";

  constructor(private readonly processor: ChatProcessor) {}

  async configure(): Promise<void> {
    const systemPrompt =
      "Вы — ИИ в интерактивном режиме. Отвечайте подробно, дружелюбно и по делу.";

    this.processor.setConfig({
      systemPrompt,
      rag: {
        paths: ["src", "README.md", "package.json"],
      },
    });
  }

  async run(): Promise<void> {
    console.log("CLI mode started");

    const rl = createInterface({ input, output });

    while (true) {
      const query = await rl.question("\n🗣️  Ваш запрос: ");
      if (query.trim().toLowerCase() === "exit") {
        console.log("👋 До свидания!");
        rl.close();
        return;
      }

      const start = Date.now();
      console.log("🤖 Думаю...");

      try {
        const response = await this.processor.processMessage({
          sessionId: this.SESSION_ID,
          text: query,
        });
        const durationSec = ((Date.now() - start) / 1000).toFixed(2);

        console.log(`\n🤖 AI (${durationSec} сек):\n${response.message}`);

        if (response.tools.length > 0) {
          console.log(`🛠️  Использованные инструменты:`);
          response.tools.forEach((tool, i) => {
            console.log(
              `  ${i + 1}. ${tool.name} ${JSON.stringify(tool.arguments)}`
            );
          });
        }
      } catch (error) {
        console.error("❌ Ошибка обработки запроса:", error);
        console.log("Извините, произошла ошибка. Попробуйте ещё раз.");
      }
    }
  }
}
