import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import "dotenv/config";

// Инициализация сервисов
const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
});

// server.registerTool(...DockerTools.listContainersTool);
// server.registerTool(...DockerTools.startContainerTool);
// server.registerTool(...DockerTools.stopContainerTool);
// server.registerTool(...DockerTools.removeContainerTool);
// server.registerTool(...DockerTools.getContainerLogsTool);

// Подключаем сервер
const transport = new StdioServerTransport();
server.connect(transport);
