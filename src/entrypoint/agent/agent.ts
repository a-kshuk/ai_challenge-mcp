import { AiEntryPoint } from "../types";
import { ChatProcessor } from "../../ai-agent";
import { loadMarkdownPrompt } from "../../utils/markdown-loader";

export enum AgentMode {
  PRECOMMIT = "precommit",
}

export class AgentEntryPoint implements AiEntryPoint {
  constructor(
    private readonly processor: ChatProcessor,
    private readonly mode: AgentMode
  ) {}

  async configure(): Promise<void> {
    let systemPrompt: string;

    switch (this.mode) {
      case AgentMode.PRECOMMIT:
        systemPrompt = await loadMarkdownPrompt(
          "./src/entrypoint/agent/precommit.md",
          "Ты — агент анализа кода. Проверь изменения перед коммитом."
        );
        break;
      default:
        throw new Error(`Неподдерживаемый режим агента: ${this.mode}`);
    }

    this.processor.setConfig({
      systemPrompt,
      rag: {
        paths: ["./src"],
      },
    });
  }

  async run(): Promise<void> {
    console.log(`🤖 Запуск агента в режиме: ${this.mode}`);

    const sessionId = `agent-${this.mode}-${Date.now()}`;
    let prompt: string;

    // 🔹 ВАЖНО: это НЕ systemPrompt, а входной запрос
    switch (this.mode) {
      case AgentMode.PRECOMMIT:
        const fs = await import("fs").then((m) => m.promises);
        try {
          prompt = await fs.readFile(
            "src/entrypoint/agent/precommit.md",
            "utf-8"
          );
        } catch (error) {
          console.error("❌ Ошибка: не удалось прочитать 'precommit.md'");
          throw new Error("Файл конфигурации precommit.md не найден.");
        }
        break;
      default:
        throw new Error(`Неподдерживаемый режим агента: ${this.mode}`);
    }

    const start = Date.now();
    console.log("🧠 Агент анализирует...");
    const response = await this.processor.processMessage({
      sessionId,
      text: prompt,
      minScore: 30,
    });
    const end = Date.now();
    const durationSec = ((end - start) / 1000).toFixed(2);

    console.log(`\n✅ Агент завершил обработку за ${durationSec} сек.`);
    console.log(`\n📝 Результат:\n${response.message}`);

    if (response.tools.length > 0) {
      console.log(`🛠️  Использованные инструменты:`);
      response.tools.forEach((tool, i) => {
        console.log(
          `  ${i + 1}. ${tool.name} ${JSON.stringify(tool.arguments)}`
        );
      });
    }

    await this.processor.close();
  }
}
