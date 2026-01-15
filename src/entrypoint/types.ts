// src/entrypoint/types.ts

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
export interface AiEntryPoint<T = unknown> {
  /**
   * Запуск entrypoint'а
   */
  run(): Promise<T> | void;

  /**
   * Опциональная конфигурация для ChatProcessor.
   * Если не указана — используются значения по умолчанию.
   */
  chatProcessorConfig?: ChatProcessorConfig;
}
