import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import "dotenv/config";
import { GitTools } from "./gitTools";
import { SystemTools } from "./systemTools";
import { GithubTools } from "./githubTools";
import { McpTool } from "./types";

const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
});

// Инициализация инструментов
const TOOLS: McpTool<any>[] = [...GitTools, ...SystemTools, ...GithubTools];

TOOLS.forEach((tool) => {
  try {
    server.registerTool(...tool);
  } catch (error) {
    console.error(`Error registering tool ${tool[0]}:`, error);
  }
});

const transport = new StdioServerTransport();
server.connect(transport);
