import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import "dotenv/config";
import { ChatProcessor } from "../../ai-agent";
import { AiEntryPoint } from "../types";

export class CliEntryPoint implements AiEntryPoint {
  // CLI использует свою конфигурацию
  chatProcessorConfig = {
    systemPrompt: `Вы — ИИ в интерактивном режиме. Отвечайте подробно, дружелюбно и по делу.`,
    rag: {
      paths: ["_files/Шаблоны.xlsx"],
    },
  };

  constructor(private readonly processor: ChatProcessor) {}

  async run() {
    const SESSION_ID = "cli-session";
    console.log("CLI mode started");

    const rl = createInterface({ input, output });

    while (true) {
      const query = await rl.question("\n🗣️  Ваш запрос: ");
      if (query.trim().toLowerCase() === "exit") {
        console.log("👋 До свидания!");
        rl.close();
        process.exit(0);
      }
      const start = Date.now();
      console.log("🤖 Думаю...");

      const response = await this.processor.processMessage(SESSION_ID, query);
      const end = Date.now();
      const durationSec = ((end - start) / 1000).toFixed(2);

      console.log(`\n🤖 AI (${durationSec} сек):\n${response.message}`);
      if (response.tools.length > 0) {
        console.log(`🛠️  Использованные инструменты:`);
        response.tools.forEach((tool, i) => {
          console.log(
            `  ${i + 1}. ${tool.name} ${JSON.stringify(tool.arguments)}`
          );
        });
      }
    }
  }
}
