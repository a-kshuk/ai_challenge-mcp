import { AiEntryPoint } from "../types";
import { ChatProcessor } from "../../ai-agent";

export enum AgentMode {
  PRECOMMIT = "precommit",
}

export class AgentEntryPoint implements AiEntryPoint {
  constructor(
    private readonly processor: ChatProcessor,
    private readonly mode: AgentMode
  ) {}

  async run(): Promise<void> {
    console.log(`🤖 Запуск агента в режиме: ${this.mode}`);

    const sessionId = `agent-${this.mode}-${Date.now()}`;
    let prompt: string;

    switch (this.mode) {
      case AgentMode.PRECOMMIT:
        const fs = await import("fs").then((m) => m.promises);
        try {
          prompt = await fs.readFile(
            "src/entrypoint/agent/precommit.md",
            "utf-8"
          );
        } catch {
          console.error("❌ Ошибка: не удалось прочитать файл 'precommit.md'");
          throw new Error("Конфигурационный файл precommit.md не найден.");
        }
        break;
      default:
        console.error(`❌ Неизвестный режим агента: ${this.mode}`);
        throw new Error(`Неподдерживаемый режим агента: ${this.mode}`);
    }

    const start = Date.now();
    console.log("🧠 Агент анализирует...");
    const response = await this.processor.processMessage(sessionId, prompt);
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
