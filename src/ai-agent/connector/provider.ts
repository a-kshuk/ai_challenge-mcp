import { AIHelperInterface } from "./types";
import { GigachatAIHelper } from "./gigachat";

const systemPrompt = "";

export class AIHelperProvider {
  static getAiProvider(type: "gigachat" | "ollama"): AIHelperInterface {
    switch (type) {
      case "gigachat":
        return new GigachatAIHelper(
          {
            clientId: process.env.GIGACHAT_CLIENT_ID || "",
            clientSecret: process.env.GIGACHAT_CLIENT_SECRET || "",
            scope: process.env.GIGACHAT_CLIENT_SCOPE || "",
          },
          {
            talk: process.env.GIGACHAT_MODEL_TALK || "GigaChat",
            tools: process.env.GIGACHAT_MODEL_TOOLS || "GigaChat",
          },
          systemPrompt
        );
    }
    throw new Error(`AI provider ${type} not supported`);
  }
}
