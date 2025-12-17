import { ChatProcessor } from "../ai/chat-processor";
import { CliEntryPoint } from "./cli";
import { AiEntryPoint } from "./types";

export async function selectEntrypoint(): Promise<AiEntryPoint> {
  const args = process.argv.slice(2);
  const processor = new ChatProcessor();
  await processor.init();

  if (args.includes("--cli")) {
    return new CliEntryPoint(processor);
  } else {
    throw new Error("Usage: node dist/index.js --cli");
  }
}
