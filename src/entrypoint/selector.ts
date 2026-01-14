import { ChatProcessor } from "../ai-agent";
import { CliEntryPoint } from "./cli/cli";
import { AiEntryPoint } from "./types";
import { AgentEntryPoint, AgentMode } from "./agent/agent";

export async function selectEntrypoint(): Promise<AiEntryPoint> {
  const args = process.argv.slice(2);
  const processor = new ChatProcessor();
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
  } else {
    console.log("Доступные режимы:");
    console.log("  --cli               Запуск интерактивного режима");
    console.log("  --agent --mode=...   Запуск автономного агента");
    console.log("    Доступные режимы: precommit");
    throw new Error("Не указан режим запуска");
  }
}
