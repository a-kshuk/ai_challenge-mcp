import { z } from "zod";
import { McpTool } from "../types";
import { DockerService } from "./dockerService";

const dockerService = new DockerService();

/**
 * Инструмент: Получение списка контейнеров
 */
const listContainersTool: McpTool<void> = [
  "docker_list_containers",
  {
    title: "Получение списка Docker-контейнеров",
    description:
      "Получает список всех контейнеров (работающих и остановленных).",
    inputSchema: undefined,
  },
  async () => {
    try {
      const containers = await dockerService.listContainers();
      return {
        content: [
          {
            type: "text" as const,
            text: `Список контейнеров:\n${JSON.stringify(containers, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при получении списка контейнеров: ${
              (error as Error).message
            }`,
          },
        ],
      };
    }
  },
];

/**
 * Инструмент: Запуск контейнера
 */
const startContainerTool: McpTool<{ image: string; name?: string }> = [
  "docker_start_container",
  {
    title: "Запуск Docker-контейнера",
    description: "Запускает новый контейнер из указанного образа.",
    inputSchema: z.object({
      image: z.string().min(1, "Имя образа обязательно"),
      name: z.string().optional(),
    }),
  },
  async (req) => {
    try {
      const containerId = await dockerService.startContainer(
        req.image,
        req.name
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Контейнер успешно запущен. ID: ${containerId}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при запуске контейнера: ${(error as Error).message}`,
          },
        ],
      };
    }
  },
];

/**
 * Инструмент: Остановка контейнера
 */
const stopContainerTool: McpTool<{ containerId: string }> = [
  "docker_stop_container",
  {
    title: "Остановка Docker-контейнера",
    description: "Останавливает работающий контейнер по его ID.",
    inputSchema: z.object({
      containerId: z.string().min(1, "ID контейнера обязателен"),
    }),
  },
  async (req) => {
    try {
      await dockerService.stopContainer(req.containerId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Контейнер ${req.containerId} успешно остановлен.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при остановке контейнера: ${
              (error as Error).message
            }`,
          },
        ],
      };
    }
  },
];

/**
 * Инструмент: Удаление контейнера
 */
const removeContainerTool: McpTool<{ containerId: string }> = [
  "docker_remove_container",
  {
    title: "Удаление Docker-контейнера",
    description: "Удаляет остановленный (или запущенный) контейнер по его ID.",
    inputSchema: z.object({
      containerId: z.string().min(1, "ID контейнера обязателен"),
    }),
  },
  async (req) => {
    try {
      await dockerService.removeContainer(req.containerId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Контейнер ${req.containerId} успешно удалён.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при удалении контейнера: ${(error as Error).message}`,
          },
        ],
      };
    }
  },
];

/**
 * Инструмент: Получение логов контейнера
 */
const getContainerLogsTool: McpTool<{ containerId: string }> = [
  "docker_get_container_logs",
  {
    title: "Получение логов контейнера",
    description: "Получает stdout и stderr указанного контейнера.",
    inputSchema: z.object({
      containerId: z.string().min(1, "ID контейнера обязателен"),
    }),
  },
  async (req) => {
    try {
      const logs = await dockerService.getLogs(req.containerId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Логи контейнера ${req.containerId}:\n${logs || "(пусто)"}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ошибка при получении логов: ${(error as Error).message}`,
          },
        ],
      };
    }
  },
];

/**
 * Группировка всех инструментов для удобной регистрации
 */
export const DockerTools = {
  listContainersTool,
  startContainerTool,
  stopContainerTool,
  removeContainerTool,
  getContainerLogsTool,
};
