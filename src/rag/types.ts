/**
 * Режим разбивки текста — влияет на логику TextProcessor.split()
 */
export type ChunkingMode = "words" | "lines" | "code" | "markdown";

/**
 * Документ, извлечённый из файла
 */
export interface ExtractedDocument {
  /**
   * Извлечённый текст
   */
  text: string;

  /**
   * Режим разбивки:
   * - "words" — разбивать по словам (для обычного текста)
   * - "lines" — каждая строка как чанк (для таблиц)
   */
  mode: ChunkingMode;

  /**
   * Источник документа — имя или путь к файлу
   */
  source: string;
}
