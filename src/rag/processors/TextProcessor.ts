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

  split(
    text: string,
    chunkSize: number = 100,
    overlap: number = 50
  ): TextChunk[] {
    const words = text.split(/\s+/);
    const chunks: TextChunk[] = [];
    let start = 0;
    let id = 0;

    while (start < words.length) {
      const end = start + chunkSize;
      const rawText = words.slice(start, end).join(" ");
      const cleanText = this.normalize(rawText);

      if (this.isValid(rawText)) {
        chunks.push({
          id: id++,
          text: rawText,
          hash: this.hash(cleanText),
        });
      }

      start = end - overlap;
    }

    this.logger.info("Текст разбит на чанки", { chunkCount: chunks.length });
    return chunks;
  }

  deduplicate(chunks: TextChunk[], existingHashes: Set<string>): TextChunk[] {
    const unique = chunks.filter((chunk) => !existingHashes.has(chunk.hash));
    this.logger.info("Дедупликация завершена", {
      originalCount: chunks.length,
      uniqueCount: unique.length,
    });
    return unique;
  }
}
