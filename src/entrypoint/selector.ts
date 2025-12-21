import { ChatProcessor } from "../ai-agent";
import { CliEntryPoint } from "./cli/cli";
import { AiEntryPoint } from "./types";

export async function selectEntrypoint(): Promise<AiEntryPoint> {
  const args = process.argv.slice(2);
  const processor = new ChatProcessor();
  await processor.init();

  if (args.includes("--cli")) {
    return new CliEntryPoint(processor);
  } else {
    console.log("Доступные режимы:");
    console.log("  --cli        Запуск интерактивного режима");
    throw new Error("Не указан режим запуска");
  }
}
