import { Message, Ollama, Tool } from "ollama";
import { SessionStorage } from "./session-storage";
import {
  AIHelperInterface,
  SingleToolRequest,
  ToolCallRequest,
  ToolCallResult,
  ToolDescriptor,
} from "./types";

type Session = {
  messages: Message[];
};

export class OllamaAIHelper implements AIHelperInterface {
  protected session: SessionStorage<Session> = new SessionStorage<Session>(
    () => ({
      messages: this.systemPrompt
        ? [{ role: "system", content: this.systemPrompt }]
        : [],
    })
  );

  private readonly model: string = "qwen3:latest";
  private readonly ollama: Ollama;

  constructor(private readonly systemPrompt: string, model = "qwen3:latest") {
    this.ollama = new Ollama();
    this.model = model;
  }

  async chatWithTools(
    sessionId: string,
    message: string,
    tools: ToolDescriptor[]
  ): Promise<ToolCallRequest> {
    const session = this.session.get(sessionId);

    session.messages.push({
      role: "user",
      content: message,
    });

    const toolOptions = tools.map((tool) => {
      const convertTool: Tool = {
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description || "",
          parameters: {
            ...tool.inputSchema,
            type: "object",
            required: Array.isArray(tool.inputSchema.required)
              ? (tool.inputSchema.required as string[])
              : [],
          },
        },
      };
      return convertTool;
    });

    const response = await this.ollama.chat({
      model: this.model,
      messages: session.messages,
      tools: toolOptions.length > 0 ? toolOptions : undefined,
      stream: false,
    });

    const messageData = response.message;
    const toolCalls: SingleToolRequest[] = [];

    if (messageData.tool_calls) {
      for (const call of messageData.tool_calls) {
        toolCalls.push({
          name: call.function.name,
          arguments: call.function.arguments as Record<string, unknown>,
        });
      }
    }

    session.messages.push(messageData);

    return {
      message: messageData.content || "",
      toolCalls,
    };
  }

  async storeToolResult(
    sessionId: string,
    result: ToolCallResult
  ): Promise<void> {
    const session = this.session.get(sessionId);

    session.messages.push({
      role: "tool",
      content: JSON.stringify(result.structuredContent || result.content || {}),
    });
  }

  async simpleChat(sessionId: string, message: string): Promise<string> {
    const session = this.session.get(sessionId);

    session.messages.push({
      role: "user",
      content: message,
    });

    const response = await this.ollama.chat({
      model: this.model,
      messages: session.messages,
      stream: false,
    });

    const content = response.message.content;
    session.messages.push(response.message);

    return content;
  }

  async resetSession(sessionId: string): Promise<void> {
    this.session.reset(sessionId);
  }
}
