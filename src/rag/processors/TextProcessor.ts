import { createHash } from "crypto";
import { Logger } from "winston";
import { ChunkingMode } from "../types";

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
    if (clean.length < 10) return false;
    if (clean.length > 10000) return false; // защита от огромных чанков
    return /[a-zA-Zа-яА-ЯёЁ0-9]/.test(clean); // есть хотя бы один значимый символ
  }

  hash(text: string): string {
    return createHash("sha256").update(this.normalize(text)).digest("hex");
  }

  /**
   * Грубая оценка размера кода в токенах (по словам и символам)
   */
  private estimateCodeTokenSize(code: string): number {
    return code.split(/\s+/).length + Math.floor(code.length / 50);
  }

  /**
   * Разбивает текст на чанки с поддержкой разных режимов
   * @param text - исходный текст
   * @param chunkSize - количество слов в чанке (игнорируется в режиме lines)
   * @param overlap - количество перекрывающихся слов (только для words)
   * @param mode - режим разбивки: 'words', 'lines', 'code' или 'markdown'
   */
  split(
    text: string,
    chunkSize: number = 100,
    overlap: number = 50,
    mode: ChunkingMode = "words"
  ): TextChunk[] {
    const rawChunks: string[] = [];

    if (mode === "lines") {
      const lines = text.trim().split(/\n+/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          rawChunks.push(trimmed);
        }
      }
    } else if (mode === "code") {
      const blocks = text.trim().split(/\n\s*\n/);
      for (const block of blocks) {
        const cleaned = block.trim();
        if (!cleaned) continue;

        if (this.estimateCodeTokenSize(cleaned) <= chunkSize * 2) {
          rawChunks.push(cleaned);
        } else {
          const words = cleaned.split(/\s+/).filter(Boolean);
          let start = 0;
          while (start < words.length) {
            const end = Math.min(start + chunkSize, words.length);
            rawChunks.push(words.slice(start, end).join(" "));
            if (end >= words.length) break;
            start = end - overlap;
          }
        }
      }
    } else if (mode === "markdown") {
      // Разбивка по заголовкам (##, ### и т.д.)
      const sections = text.split(/\n(?=#{2,})/); // разделяем перед ## и ###
      let currentContext = "";

      for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        // Обновляем контекст, если это заголовок
        const headerMatch = trimmed.match(/^(#{2,3})\s+(.+)$/m);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const title = headerMatch[2].trim();
          if (level === 2) {
            currentContext = title;
          }
          // Для уровня 3 можно добавить подконтекст, но пока не будем усложнять
        }

        // Добавляем чанк с контекстом
        rawChunks.push(
          `${currentContext ? `## ${currentContext}\n\n` : ""}${trimmed}`
        );
      }
    } else {
      // Режим "words"
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
