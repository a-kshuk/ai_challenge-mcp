import { z } from "zod";
import { McpTool } from "../types";
import { RagService } from "./ragService";

const ragService = new RagService();

/**
 * Инструмент: Поиск в документе по запросу
 */
const ragSearchTool: McpTool<{ query: string }> = [
  "rag_search",
  {
    title: "Поиск по контексту в документе",
    description:
      "Выполняет поиск ответа на вопрос в PDF-документе. Автоматически загружает и индексирует документ при первом запуске.",
    inputSchema: z.object({
      query: z.string().min(1, "Запрос не может быть пустым"),
    }),
  },
  async (req) => {
    try {
      // Путь к PDF и индексу фиксированы, не передаются извне
      const pdfPath = "./fnp.pdf";
      const indexPath = "./data/rag-index.json";

      // Индексация документа (если ещё не загружен — ingestPdf сам загрузит и продолжит)
      await ragService.ingestPdf(pdfPath, indexPath);
      await ragService.saveIndex(indexPath);

      // Поиск по запросу
      const results = await ragService.search(req.query, 3);
      if (!results || results.length === 0 || results[0].score < 0.1) {
        return {
          content: [
            {
              type: "text" as const,
              text: "",
            },
          ],
        };
      }

      const texts = results.map((r) => r.text).join("\n\n---\n\n");
      return {
        content: [
          {
            type: "text" as const,
            text: texts,
          },
        ],
      };
    } catch (error) {
      console.error("Ошибка при выполнении RAG-поиска:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: "",
          },
        ],
      };
    }
  },
];

/**
 * Группировка всех RAG-инструментов для регистрации
 */
export const RagTools = {
  ragSearchTool,
};
