import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { LogService } from "../services/LogService";

const logService = new LogService();

const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
});

server.registerTool(
  "save_log",
  {
    title: "Сохранение логов",
    description: "Записывает в логи переданный текст. Поле текста обязательное",
    inputSchema: {
      text: z.string(),
    },
  },
  async (req) => {
    await logService.saveLog(req.text);
    return { content: [{ type: "text", text: `Сообщение отправлено` }] };
  }
);

// Получаем команду через stdio, выполняем её и отдаем ответ
const transport = new StdioServerTransport();
server.connect(transport);
