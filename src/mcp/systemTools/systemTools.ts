import { z } from "zod";
import { McpTool } from "../types";
import { SystemService } from "./systemServices";

const systemService = new SystemService();

/**
 * Инструмент: Чтение текстового файла
 */
const readFileTool: McpTool<{ path: string }> = [
  "system_read_file",
  {
    title: "Чтение файла",
    description: "Считывает содержимое текстового файла по указанному пути.",
    inputSchema: z.object({
      path: z.string().describe("Путь к файлу, который нужно прочитать"),
    }),
  },
  async (req) => {
    try {
      const content = await systemService.readFile(req.path);
      return {
        content: [
          {
            type: "text" as const,
            text: `Содержимое файла ${req.path}:\n\n\`\`\`\n${content}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при чтении файла: ${(error as Error).message}`,
          },
        ],
      };
    }
  },
];

/**
 * Группировка системных инструментов
 */
export const SystemTools = [readFileTool];
