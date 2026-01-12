import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import "dotenv/config";
import { GitTools } from "./gitTools";
import { McpTool } from "./types";

// Инициализация сервисов
const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
});

const TOOLS: McpTool<any>[] = [...GitTools];

TOOLS.forEach((tool) => {
  try {
    server.registerTool(...tool);
  } catch (error) {
    console.error(`Error registering tool ${tool[0]}:`, error);
  }
});

// Подключаем сервер
const transport = new StdioServerTransport();
server.connect(transport);
