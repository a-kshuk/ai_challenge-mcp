import { ChatProcessor } from "../ai-agent";
import { CliEntryPoint } from "./cli/cli";
import { AiEntryPoint, ChatProcessorConfig } from "./types";
import { AgentEntryPoint, AgentMode } from "./agent/agent";
import { TelegramEntryPoint } from "./telegram/telegram";

export async function selectEntrypoint(): Promise<AiEntryPoint> {
  const args = process.argv.slice(2);
  const processor = new ChatProcessor("ollama");

  let entrypoint: AiEntryPoint;

  if (args.includes("--cli")) {
    entrypoint = new CliEntryPoint(processor);
  } else if (args.includes("--agent")) {
    const modeArg = args.find((arg) => arg.startsWith("--mode="));
    const mode = modeArg ? (modeArg.split("=")[1] as AgentMode) : undefined;

    if (mode !== AgentMode.PRECOMMIT) {
      console.log("Доступные режимы агента:");
      console.log("  --mode=precommit    Режим проверки перед коммитом");
      throw new Error("Не указан или неверно указан режим агента");
    }

    entrypoint = new AgentEntryPoint(processor, mode);
  } else if (args.includes("--telegram")) {
    entrypoint = new TelegramEntryPoint(processor);
  } else {
    console.log("Доступные режимы:");
    console.log("  --cli               Запуск интерактивного режима");
    console.log("  --agent --mode=...   Запуск автономного агента");
    console.log("    Доступные режимы: precommit");
    console.log("  --telegram          Запуск Telegram-бота");
    throw new Error("Не указан режим запуска");
  }

  // 🔧 Если entrypoint умеет настраивать processor — делаем это
  if (entrypoint.configure) {
    await entrypoint.configure();
  }

  // Инициализируем processor после настройки
  await processor.init();

  return entrypoint;
}
