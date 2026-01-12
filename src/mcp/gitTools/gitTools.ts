import { z } from "zod";
import { McpTool } from "../types";
import { GitService } from "./gitService";

const gitService = new GitService();

/**
 * Инструмент: Получение текущей ветки Git
 */
const getCurrentBranchTool: McpTool<void> = [
  "git_get_current_branch",
  {
    title: "Получить текущую ветку Git",
    description:
      "Возвращает имя текущей активной ветки в локальном Git-репозитории.",
    inputSchema: undefined,
  },
  async () => {
    try {
      const branch = await gitService.getCurrentBranch();
      return {
        content: [
          {
            type: "text" as const,
            text: `Текущая Git-ветка: ${branch}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при получении текущей ветки: ${
              (error as Error).message
            }`,
          },
        ],
      };
    }
  },
];

/**
 * Инструмент: Получить список всех веток
 */
const listBranchesTool: McpTool<{ all?: boolean }> = [
  "git_list_branches",
  {
    title: "Получить список веток",
    description: "Возвращает список локальных (и опционально удалённых) веток.",
    inputSchema: z.object({
      all: z.boolean().optional().default(false),
    }),
  },
  async (req?: { all?: boolean }) => {
    try {
      const branches = await gitService.getAllBranches(req);
      return {
        content: [
          {
            type: "text" as const,
            text: `Ветки:\n${branches.join("\n")}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при получении списка веток: ${
              (error as Error).message
            }`,
          },
        ],
      };
    }
  },
];

/**
 * Группировка всех Git-инструментов
 */
export const GitTools = [getCurrentBranchTool, listBranchesTool];
