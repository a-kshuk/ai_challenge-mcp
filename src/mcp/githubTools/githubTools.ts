import { z } from "zod";
import { McpTool } from "../types";
import { GithubService } from "./githubService";

let githubService: GithubService;

// Обёртка вместо top-level await
async function initService() {
  githubService = new GithubService();
  await githubService.init();
  await githubService.checkAuth();
}

// Вызываем инициализацию
initService().catch(console.error);

/**
 * Инструмент: Создать задачу (issue) в GitHub
 */
const createIssueTool: McpTool<{ title: string; body?: string }> = [
  "github_create_issue",
  {
    title: "Создать задачу в GitHub",
    description: "Создаёт новую задачу (issue) в репозитории GitHub.",
    inputSchema: z.object({
      title: z.string().min(1, { message: "Заголовок задачи обязателен" }),
      body: z.string().optional(),
    }),
  },
  async (req) => {
    if (!req || !req.title) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Ошибка: Необходимо указать заголовок задачи.",
          },
        ],
      };
    }

    try {
      const { number, url } = await githubService.createIssue(
        req.title,
        req.body
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Задача успешно создана.\n\nНомер: #${number}\nСсылка: ${url}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Не удалось создать задачу: ${(error as Error).message}`,
          },
        ],
      };
    }
  },
];

/**
 * Инструмент: Получить список задач (issues) из репозитория
 */
const getIssuesTool: McpTool<{ state?: "open" | "closed" | "all" }> = [
  "github_get_issues",
  {
    title: "Получить список задач GitHub",
    description:
      "Возвращает список задач (issues) из репозитория: открытые, закрытые или все.",
    inputSchema: z.object({
      state: z.enum(["open", "closed", "all"]).optional().default("open"),
    }),
  },
  async (req) => {
    const state = req?.state || "open";

    try {
      const issues = await githubService.getIssues(state);
      if (issues.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Нет задач с состоянием '${state}'.`,
            },
          ],
        };
      }

      const text = issues
        .map(
          (issue) =>
            `#${issue.number} ${issue.title} [${issue.state.toUpperCase()}]`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Список задач (${state}):\n\n${text}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при получении списка задач: ${
              (error as Error).message
            }`,
          },
        ],
      };
    }
  },
];

/**
 * Инструмент: Получить детали задачи GitHub по номеру
 */
const getIssueDetailsTool: McpTool<{ issueNumber: number }> = [
  "github_get_issue_details",
  {
    title: "Получить детали задачи GitHub",
    description:
      "Возвращает подробную информацию о задаче: заголовок, описание, статус, автор, даты.",
    inputSchema: z.object({
      issueNumber: z
        .number()
        .int()
        .positive("Номер задачи должен быть положительным числом"),
    }),
  },
  async (req) => {
    if (!req || typeof req.issueNumber !== "number") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Ошибка: Требуется указать номер задачи (issueNumber).",
          },
        ],
      };
    }

    try {
      const details = await githubService.getIssueDetails(req.issueNumber);

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `🔍 Детали задачи #${details.number}`,
              ``,
              `📌 Заголовок: ${details.title}`,
              `📄 Описание: ${details.body ? details.body : "(отсутствует)"}`,
              `🔖 Статус: ${details.state === "open" ? "Открыта" : "Закрыта"}`,
              `👤 Автор: ${details.author}`,
              `📅 Создана: ${new Date(details.createdAt).toLocaleString()}`,
              `🔄 Обновлена: ${new Date(details.updatedAt).toLocaleString()}`,
              `🔗 Ссылка: ${details.url}`,
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при получении деталей задачи: ${
              (error as Error).message
            }`,
          },
        ],
      };
    }
  },
];

/**
 * Группировка всех инструментов GitHub
 */
export const GithubTools = [
  createIssueTool,
  getIssuesTool,
  getIssueDetailsTool,
];
