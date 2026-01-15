import { createHash } from "crypto";
import { Logger } from "winston";

export interface TextChunk {
  id: number;
  text: string;
  hash: string;
}

export class TextProcessor {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  normalize(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim()
      .toLowerCase();
  }

  isValid(text: string): boolean {
    const clean = this.normalize(text);
    return clean.length >= 20 && /[a-zA-Zа-яА-ЯёЁ0-9]/.test(clean);
  }

  hash(text: string): string {
    return createHash("sha256").update(this.normalize(text)).digest("hex");
  }

  /**
   * Разбивает текст на чанки с поддержкой разных режимов
   * @param text - исходный текст
   * @param chunkSize - количество слов в чанке (игнорируется в режиме lines)
   * @param overlap - количество перекрывающихся слов (только для words)
   * @param mode - режим разбивки: 'words' или 'lines'
   */
  split(
    text: string,
    chunkSize: number = 100,
    overlap: number = 50,
    mode: "words" | "lines" = "words"
  ): TextChunk[] {
    const rawChunks: string[] = [];

    if (mode === "lines") {
      // Разбивка по строкам — подходит для табличных данных
      const lines = text.trim().split(/\n+/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          rawChunks.push(trimmed);
        }
      }
    } else {
      // Стандартная разбивка по словам
      const words = text.split(/\s+/).filter((word) => word.length > 0);
      let start = 0;

      while (start < words.length) {
        const end = Math.min(start + chunkSize, words.length);
        rawChunks.push(words.slice(start, end).join(" "));
        if (end >= words.length) break;
        start = end - overlap;
      }
    }

    // Фильтрация, нумерация и хеширование
    const chunks: TextChunk[] = [];
    let id = 0;

    for (const rawText of rawChunks) {
      if (this.isValid(rawText)) {
        chunks.push({
          id: id++,
          text: rawText,
          hash: this.hash(rawText),
        });
      }
    }

    this.logger.info("Текст разбит на чанки", {
      chunkCount: chunks.length,
      mode,
      chunkSize,
      overlap,
    });

    return chunks;
  }

  /**
   * Удаляет дубликаты чанков по хешу
   */
  deduplicate(chunks: TextChunk[], existingHashes: Set<string>): TextChunk[] {
    const unique = chunks.filter((chunk) => !existingHashes.has(chunk.hash));
    this.logger.info("Дедупликация завершена", {
      originalCount: chunks.length,
      uniqueCount: unique.length,
    });
    return unique;
  }
}
