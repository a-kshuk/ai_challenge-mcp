import { ChatProcessor } from "../ai-agent";
import { CliEntryPoint } from "./cli/cli";
import { AiEntryPoint, ChatProcessorConfig } from "./types";
import { AgentEntryPoint, AgentMode } from "./agent/agent";
import { TelegramEntryPoint } from "./telegram/telegram";

export async function selectEntrypoint(): Promise<AiEntryPoint> {
  const args = process.argv.slice(2);

  // Общая конфигурация
  const config: ChatProcessorConfig = {
    systemPrompt: `Ты — ассистент поддержки в Telegram. Ты должен:
1. Узнать имя пользователя.
2. Выяснить проблему.
3. Предложить решение, используя только данные из RAG.
4. Никогда не выдавать приватные данные.
Говори вежливо и по-русски.`,
    rag: {
      paths: ["_files/Шаблоны.xlsx"],
    },
  };

  const processor = new ChatProcessor(config);
  await processor.init();

  if (args.includes("--cli")) {
    return new CliEntryPoint(processor);
  } else if (args.includes("--agent")) {
    const modeArg = args.find((arg) => arg.startsWith("--mode="));
    const mode = modeArg ? (modeArg.split("=")[1] as AgentMode) : undefined;

    if (mode !== AgentMode.PRECOMMIT) {
      console.log("Доступные режимы агента:");
      console.log("  --mode=precommit    Режим проверки перед коммитом");
      throw new Error("Не указан или неверно указан режим агента");
    }

    return new AgentEntryPoint(processor, mode);
  } else if (args.includes("--telegram")) {
    return new TelegramEntryPoint(processor);
  } else {
    console.log("Доступные режимы:");
    console.log("  --cli               Запуск интерактивного режима");
    console.log("  --agent --mode=...   Запуск автономного агента");
    console.log("    Доступные режимы: precommit");
    console.log("  --telegram          Запуск Telegram-бота");
    throw new Error("Не указан режим запуска");
  }
}

// Опционально: загрузка system prompt из файла
async function loadSystemPrompt(): Promise<string> {
  try {
    const fs = await import("fs/promises");
    return await fs.readFile(
      "src/entrypoint/telegram/systemPrompt.md",
      "utf-8"
    );
  } catch {
    return "Вы — помощник поддержки. Отвечайте вежливо и по делу.";
  }
}
