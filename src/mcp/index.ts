import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";

import { WeatherService } from "../services/WeatherServices";

const weatherService = new WeatherService();

const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
});

server.registerTool(
  "get_weather_forecast",
  {
    title: "Получение прогноза погоды",
    description: "Получите прогноз погода для выбранного города",
    inputSchema: {
      city: z.string(),
    },
  },
  async (req) => {
    const data = await weatherService.getWeather(req.city);
    return {
      content: [
        {
          type: "text",
          text: `
1. Проанализируй данные в формате json. 
2. Выведи информацию о погоде
3. Напиши как лучше одеться для выхода на улицу

data: ${data}`,
        },
      ],
    };
  }
);

// Получаем команду через stdio, выполняем её и отдаем ответ
const transport = new StdioServerTransport();
server.connect(transport);
