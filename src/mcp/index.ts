import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";

import { WeatherService } from "../services/WeatherServices";
import { LaborCostsService } from "../services/LaborCostsService";
import { UserService } from "../services/UserService";
import { TaskService } from "../services/TaskService";
import { LaborCostsReportService } from "../services/LaborCostsReportService";

// Инициализация сервисов
const weatherService = new WeatherService();
const laborCostsService = new LaborCostsService();
const userService = new UserService();
const taskService = new TaskService();
const laborCostsReportService = new LaborCostsReportService(
  laborCostsService,
  userService,
  taskService
);

const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
});

// --- Инструмент: Получение прогноза погоды ---
server.registerTool(
  "get_weather_forecast",
  {
    title: "Получение прогноза погоды",
    description: "Получите прогноз погоды для выбранного города",
    inputSchema: z.object({
      city: z.string().min(1, "Поле 'city' обязательно"),
    }),
  },
  async (req) => {
    try {
      const data = await weatherService.getWeather(req.city);
      return {
        content: [
          {
            type: "text",
            text: `
1. Проанализируй данные в формате JSON.
2. Выведи текущую температуру, осадки, ветер.
3. Дай рекомендацию, как одеться.

Данные:
${data}
            `.trim(),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Ошибка при получении погоды: ${error.message}`,
          },
        ],
      };
    }
  }
);

// --- Инструмент: Получение отчёта по трудозатратам ---
server.registerTool(
  "get_labor_costs",
  {
    title: "Получение статистики по трудозатратам",
    description:
      "Получите детализированный отчёт о трудозатратах за указанную дату для всех пользователей",
    inputSchema: z.object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна быть в формате YYYY-MM-DD"),
    }),
  },
  async (req) => {
    try {
      const { date } = req;

      const report = await laborCostsReportService.generateReport(date);

      if (report.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Нет данных о трудозатратах за ${date} ни для одного пользователя.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `1. Проанализируй данные
2. Составь worklog для для каждого пользователя
data: ${JSON.stringify(report)}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Ошибка при сборе данных: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Подключаем сервер
const transport = new StdioServerTransport();
server.connect(transport);
