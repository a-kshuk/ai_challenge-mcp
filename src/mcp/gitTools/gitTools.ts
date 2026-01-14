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
 * Инструмент: Получить статус изменений (какие файлы изменены, добавлены, удалены)
 */
const getDiffStatusTool: McpTool<void> = [
  "git_get_diff_status",
  {
    title: "Получить статус изменений",
    description:
      "Возвращает список всех изменённых файлов в рабочей директории с указанием статуса (изменён, добавлен, удалён и т.д.).",
    inputSchema: undefined,
  },
  async () => {
    try {
      const changes = await gitService.getDiffStatus();
      if (changes.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Нет изменений в рабочей директории.",
            },
          ],
        };
      }

      const text = changes
        .map((change) => `${change.status.padEnd(3)} ${change.file}`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Изменённые файлы:\n\n${text}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при получении статуса изменений: ${
              (error as Error).message
            }`,
          },
        ],
      };
    }
  },
];

/**
 * Инструмент: Получить diff изменений (проиндексированных)
 */
const getDiffPatchTool: McpTool<void> = [
  "git_get_diff_patch",
  {
    title: "Получить проиндексированные изменения (staged)",
    description:
      "Возвращает полный текст изменений, добавленных в staging (через git add), которые войдут в следующий коммит.",
    inputSchema: undefined,
  },
  async () => {
    try {
      const diff = await gitService.getDiffPatch();
      return {
        content: [
          {
            type: "text" as const,
            text: `Изменения, готовые к коммиту (staged):\n\n\`\`\`diff\n${diff}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при получении diff --staged: ${
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
export const GitTools = [
  getCurrentBranchTool,
  listBranchesTool,
  getDiffStatusTool,
  getDiffPatchTool,
];
