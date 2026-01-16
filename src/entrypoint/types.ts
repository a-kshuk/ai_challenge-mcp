/**
 * Конфигурация для ChatProcessor
 */
export interface ChatProcessorConfig {
  systemPrompt?: string;
  rag: {
    paths: string[];
    exclude?: string[];
  };
}

/**
 * Базовый интерфейс для входных точек (CLI, Telegram, Agent и т.д.)
 */

export interface AiEntryPoint {
  /**
   * Настраивает ChatProcessor перед инициализацией.
   * Вызывается до init().
   */
  configure(): Promise<void>;

  /**
   * Основной метод запуска.
   */
  run(): Promise<void>;
}
