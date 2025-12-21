import { ChatProcessor } from "@agentkit/ai-agent";
import { CliEntryPoint } from "./cli/cli";
import { SchedulerEntryPoint } from "./scheduler/scheduler";
import { AiEntryPoint } from "./types";

export async function selectEntrypoint(): Promise<AiEntryPoint> {
  const args = process.argv.slice(2);
  const processor = new ChatProcessor();
  await processor.init();

  if (args.includes("--cli")) {
    return new CliEntryPoint(processor);
  } else if (args.includes("--scheduler")) {
    return new SchedulerEntryPoint(processor);
  } else {
    console.log("Доступные режимы:");
    console.log("  --cli        Запуск интерактивного режима");
    console.log(
      "  --scheduler  Запуск планировщика (однократное выполнение через 1 минуту)"
    );
    throw new Error("Не указан режим запуска");
  }
}
