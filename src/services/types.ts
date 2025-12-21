import { ZodSchema } from "zod";

/**
 * Общий тип для инструмента MCP.
 *
 * Формат: [name, metadata, handler]
 *
 * Пример:
 * ```ts
 * const tool: McpTool<{ city: string }> = [
 *   'get_weather',
 *   {
 *     title: 'Погода',
 *     description: 'Получить погоду по городу',
 *     inputSchema: z.object({ city: z.string() }),
 *   },
 *   async (req) => { ... }
 * ];
 * ```
 */
export type McpTool<Input = void> = [
  name: string,
  metadata: {
    title: string;
    description: string;
    inputSchema: Input extends void
      ? ZodSchema<Input> | undefined
      : ZodSchema<Input>;
  },
  handler: (request: Input) => Promise<{
    content: Array<{
      type: "text";
      text: string;
    }>;
  }>
];
