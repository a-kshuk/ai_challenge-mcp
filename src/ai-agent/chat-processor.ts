import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { AIHelperProvider } from "./connector/provider";
import { AIHelperInterface, ToolDescriptor } from "./connector/types";
import { RagService } from "../rag";
import { ChatProcessorConfig } from "../entrypoint/types";

export class ChatProcessor {
  ai: AIHelperInterface;
  private mcp: Client;
  private transport: StdioClientTransport;
  private rag: RagService = new RagService();
  private tools: ToolDescriptor[] = [];

  // Сохраняем конфиг
  private readonly config: Required<ChatProcessorConfig>;

  constructor(config?: ChatProcessorConfig) {
    // Устанавливаем значения по умолчанию
    this.config = {
      systemPrompt:
        config?.systemPrompt ?? "Вы — помощник, отвечающий на вопросы.",
      rag: {
        paths: config?.rag.paths ?? ["_files/Шаблоны.xlsx"],
        exclude: config?.rag.exclude ?? [],
      },
    };

    this.ai = AIHelperProvider.getAiProvider(
      "ollama",
      this.config.systemPrompt
    );
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
    this.transport = new StdioClientTransport({
      command: "node",
      args: ["dist/mcp/index.js"],
    });
  }

  async init() {
    this.mcp.connect(this.transport);
    await this.rag.init(this.config.rag.paths, this.config.rag.exclude);
    this.tools = (await this.mcp.listTools()).tools;
  }

  async processMessage(
    sessionId: string,
    text: string
  ): Promise<{
    message: string;
    tools: { name: string; arguments: Record<string, unknown> }[];
    sources: string[];
  }> {
    const toolsUsed: { name: string; arguments: Record<string, unknown> }[] =
      [];
    const finalOutput: string[] = [];
    const sources: string[] = [];

    // 🔍 Шаг 1: Поиск в RAG
    const ragDocs = await this.rag.search(text, 10);
    if (ragDocs.length > 0) {
      sources.push(...ragDocs.map((_, i) => `RAG-источник ${i + 1}`));

      await this.ai.storeToolResult(sessionId, {
        request: {
          name: "rag_retrieval",
          arguments: { query: text },
        },
        content: ragDocs.join("\n\n"),
        structuredContent: ragDocs,
      });
    }

    // 🔁 Шаг 2: Использование инструментов (MCP)
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

      // Финальный ответ с учётом результатов инструментов и RAG
      const reply = await this.ai.simpleChat(
        sessionId,
        `На основе локальных данных (инструменты и RAG), ответь на вопрос: "${text}". ` +
          `Если использовались данные — укажи источники в формате: Источники: [MCP: имя_инструмента], [RAG-источник 1], ...`
      );
      finalOutput.push(reply);
    } else {
      // Нет вызовов инструментов
      if (ragDocs.length > 0) {
        // Ответ только по данным из RAG
        const reply = await this.ai.simpleChat(
          sessionId,
          `Ответь на вопрос, используя только следующую информацию из базы знаний:\n\n${ragDocs.join(
            "\n\n"
          )}\n\nВопрос: ${text}\n\n` +
            `В конце укажи: Источники: [RAG-источник 1], [RAG-источник 2], ...`
        );
        finalOutput.push(reply);
      } else {
        // Простой ответ от модели
        finalOutput.push(response.message);
      }
    }

    return {
      message: finalOutput.join("\n"),
      tools: toolsUsed,
      sources,
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
