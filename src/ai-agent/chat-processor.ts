import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { AIHelperProvider } from "./connector/provider";
import { AIHelperInterface, ToolDescriptor } from "./connector/types";
import { RagService } from "../rag"; // твой модуль RAG

export class ChatProcessor {
  ai: AIHelperInterface;
  private mcp: Client;
  private transport: StdioClientTransport;
  private rag: RagService = new RagService();
  private tools: ToolDescriptor[] = [];

  constructor(systemPrompt?: string) {
    this.ai = AIHelperProvider.getAiProvider("ollama", systemPrompt);
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
    this.transport = new StdioClientTransport({
      command: "node",
      args: ["dist/mcp/index.js"],
    });
  }

  async init() {
    this.mcp.connect(this.transport);
    await this.rag.init(["_files/Шаблоны.xlsx"]);
    this.tools = (await this.mcp.listTools()).tools;
  }

  async processMessage(
    sessionId: string,
    text: string
  ): Promise<{
    message: string;
    tools: { name: string; arguments: Record<string, unknown> }[];
    sources: string[]; // Добавим источники из RAG
  }> {
    const toolsUsed: { name: string; arguments: Record<string, unknown> }[] =
      [];
    const finalOutput: string[] = [];
    const sources: string[] = [];

    // 🔍 Шаг 1: Получаем релевантные документы из RAG
    const ragDocs = await this.rag.search(text);
    if (ragDocs.length > 0) {
      // Сохраним для статистики/источников
      sources.push(...ragDocs.map((_, i) => `RAG-источник ${i + 1}`));
      // Сохраним контекст в сессию, чтобы ИИ его увидел
      await this.ai.storeToolResult(sessionId, {
        request: {
          name: "rag_retrieval",
          arguments: { query: text },
        },
        content: ragDocs.join("\n\n"),
        structuredContent: ragDocs,
      });
    }

    // 🔁 Шаг 2: Используем chatWithTools — возможно, ИИ решит использовать MCP
    const response = await this.ai.chatWithTools(sessionId, text, this.tools);

    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const call of response.toolCalls) {
        toolsUsed.push(call);

        const result = await this.mcp.callTool({
          name: call.name,
          arguments: call.arguments,
        });

        const arrayResult = result.content as any[];
        const flattened = arrayResult
          .map((item) =>
            item.type === "text" ? item.text : item.resource?.data || ""
          )
          .join("\n\n");

        await this.ai.storeToolResult(sessionId, {
          request: call,
          content: flattened,
          structuredContent: result.structuredContent,
        });
      }

      // 🧠 После инструментов — финальный ответ с учётом RAG и MCP
      const reply = await this.ai.simpleChat(
        sessionId,
        `На основе локальных данных (инструменты и RAG), ответь на вопрос: "${text}". ` +
          `Если использовались данные — укажи источники в формате: Источники: [MCP: имя_инструмента], [RAG-источник 1], ...`
      );
      finalOutput.push(reply);
    } else {
      // ❌ Нет инструментов — но есть RAG?
      if (ragDocs.length > 0) {
        const reply = await this.ai.simpleChat(
          sessionId,
          `Ответь на вопрос, используя только следующую информацию из базы знаний:\n\n${ragDocs.join(
            "\n\n"
          )}\n\nВопрос: ${text}\n\n` +
            `В конце укажи: Источники: [RAG-источник 1], [RAG-источник 2], ...`
        );
        finalOutput.push(reply);
      } else {
        // 💬 Нет ни инструментов, ни RAG — простой ответ
        finalOutput.push(response.message);
      }
    }

    return {
      message: finalOutput.join("\n"),
      tools: toolsUsed,
      sources, // возвращаем источники RAG
    };
  }

  async close() {
    try {
      await this.mcp.close();
    } catch (error) {
      console.error("Ошибка при закрытии MCP:", error);
    }
  }
}
