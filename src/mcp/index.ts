import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import "dotenv/config";

import { WeatherService } from "../services/WeatherServices";
import { LaborCostsService } from "../services/LaborCostsService";
import { UserService } from "../services/UserService";
import { TaskService } from "../services/TaskService";
import { LaborCostsReportService } from "../services/LaborCostsReportService";
import { FileService } from "../services/FileService";
import { setupTestDB } from "../db/test-db";

// Инициализация сервисов
const weatherService = new WeatherService();
const fileService = new FileService();
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

server.registerTool(
  "save_text_md",
  {
    title: "Получение прогноза погоды",
    description: "Получите прогноз погода для выбранного города",
    inputSchema: {
      text: z.string(),
    },
  },
  async (req) => {
    try {
      const data = await fileService.saveFile(req.text);
      return {
        content: [
          {
            type: "text",
            text: `Файл успешно сохранен`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Ошибка при сохранении файла: ${error.message}`,
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
      await setupTestDB();
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
