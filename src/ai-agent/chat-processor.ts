import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { AIHelperProvider } from "./connector/provider";
import { AIHelperInterface, ToolDescriptor } from "./connector/types";
import { RagService } from "../rag";
import { ChatProcessorConfig } from "../entrypoint/types";

export class ChatProcessor {
  private ai?: AIHelperInterface;
  private readonly mcp: Client;
  private readonly rag: RagService = new RagService();
  private readonly tools: ToolDescriptor[] = [];
  private readonly typeAgent: "gigachat" | "ollama";

  // Конфиг устанавливается отдельно
  private config: ChatProcessorConfig | null = null;

  private isInitialized = false;

  constructor(typeAgent: "gigachat" | "ollama") {
    this.typeAgent = typeAgent;
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }

  /**
   * Устанавливает конфигурацию.
   * Должен быть вызван до init().
   */
  setConfig(config?: ChatProcessorConfig): this {
    this.config = {
      rag: {
        paths: [],
      },
      systemPrompt: "Вы — помощник, отвечающий на вопросы.",
      ...config,
    };

    this.ai = AIHelperProvider.getAiProvider(
      this.typeAgent,
      config?.systemPrompt || "Вы — помощник, отвечающий на вопросы."
    );

    return this;
  }

  /**
   * Инициализирует компоненты: MCP, RAG, инструменты.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.config) {
      throw new Error("ChatProcessor: вызовите setConfig() перед init().");
    }

    try {
      const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/mcp/index.js"],
      });

      this.mcp.connect(transport);
      await this.rag.init(this.config.rag.paths, this.config.rag.exclude);

      const toolListResponse = await this.mcp.listTools();
      this.tools.push(...toolListResponse.tools);

      this.isInitialized = true;
      console.log("✅ ChatProcessor инициализирован");
    } catch (error) {
      console.error("❌ Ошибка инициализации ChatProcessor:", error);
      throw error;
    }
  }

  /**
   * Основной метод обработки сообщения.
   */
  async processMessage(input: {
    sessionId: string;
    text: string;
    topK?: number;
    minScore?: number;
  }): Promise<{
    message: string;
    tools: { name: string; arguments: Record<string, unknown> }[];
    sources: string[];
  }> {
    const { sessionId, text, topK = 10, minScore } = input;

    if (!this.isInitialized) {
      throw new Error("ChatProcessor не инициализирован. Вызовите init().");
    }

    if (!this.ai) {
      throw new Error(
        "ChatProcessor: AI-провайдер не установлен. Вызовите setConfig() перед использованием."
      );
    }

    if (!text.trim()) {
      return { message: "Пустой запрос.", tools: [], sources: [] };
    }

    const toolsUsed: { name: string; arguments: Record<string, unknown> }[] =
      [];
    const sources: string[] = [];
    const startTime = Date.now();

    try {
      // 🔍 1. Поиск в RAG — результат сохраняется в сессии
      const ragDocs = await this.rag.search(text, topK, minScore);
      if (ragDocs.length > 0) {
        sources.push(...ragDocs.map((_, i) => `RAG-источник ${i + 1}`));
        await this.ai.storeToolResult(sessionId, {
          request: { name: "rag_retrieval", arguments: { query: text } },
          content: ragDocs.join("\n\n"),
          structuredContent: ragDocs,
        });
      }

      // 🔧 2. Вызов инструментов через MCP
      const response = await this.ai.chatWithTools(sessionId, text, this.tools);
      if (response.toolCalls?.length) {
        for (const call of response.toolCalls) {
          toolsUsed.push(call);

          try {
            const result = await this.mcp.callTool({
              name: call.name,
              arguments: call.arguments,
            });

            const content = (result.content as any[])
              .map((item) =>
                item.type === "text" ? item.text : item.resource?.data || ""
              )
              .join("\n\n");

            await this.ai.storeToolResult(sessionId, {
              request: call,
              content,
              structuredContent: result.structuredContent,
            });
          } catch (toolError) {
            console.warn(
              `⚠️ Ошибка вызова инструмента ${call.name}:`,
              toolError
            );
          }
        }
      }

      // 🧠 3. Финальный ответ — передаём только оригинальный текст
      const reply = await this.ai.simpleChat(sessionId, text);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(
        `🟢 Ответ сформирован за ${duration} сек. Источники: ${sources.length}, Инструменты: ${toolsUsed.length}`
      );

      return {
        message: reply,
        tools: toolsUsed,
        sources,
      };
    } catch (error) {
      console.error("❌ Ошибка обработки сообщения:", error);
      return {
        message: "Извините, произошла ошибка при обработке запроса.",
        tools: [],
        sources: [],
      };
    }
  }

  /**
   * Закрывает соединения.
   */
  async close(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await this.mcp.close();
      this.isInitialized = false;
      console.log("🔌 ChatProcessor отключён");
    } catch (error) {
      console.error("Ошибка при закрытии MCP:", error);
    }
  }
}
