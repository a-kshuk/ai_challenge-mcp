import { AIHelperInterface } from "./types";
import { GigachatAIHelper } from "./gigachat";
import { OllamaAIHelper } from "./ollama";

const systemPrompt = `Ты асистент разработчика.

Используйте RAG для подключения к документации вашего проекта

Через MCP подключите ассистента к текущему git-репозиторию

Команда */help* - отвечает на вопросы о проекте
`;

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
      case "ollama":
        return new OllamaAIHelper(systemPrompt);
    }
  }
}
