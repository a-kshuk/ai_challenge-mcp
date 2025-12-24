import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { Ollama } from "ollama";
import pdfParse from "pdf-parse";
import { createHash } from "crypto";
import winston from "winston";
import { getLogger } from "../../utils/logger";

interface DocumentChunk {
  id: number;
  text: string;
  embedding: number[];
  hash: string;
}

/**
 * Косинусное сходство
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export class RagService {
  private chunks: DocumentChunk[] = [];
  private ollama: Ollama;
  private logger!: winston.Logger;

  constructor(private model: string = "nomic-embed-text") {
    this.ollama = new Ollama({ host: "http://localhost:11434" });
    this.init();
  }

  /**
   * Асинхронная инициализация логгера
   */
  async init(): Promise<this> {
    this.logger = await getLogger("RagService");
    this.logger.info("RagService инициализирован");
    return this;
  }

  /**
   * Загружает PDF и извлекает текст
   */
  async loadPdf(filePath: string): Promise<string> {
    this.logger.info("Загрузка PDF", { filePath });
    try {
      const buffer = await readFile(filePath);
      const data = await pdfParse(buffer);
      this.logger.info("PDF успешно распознан", {
        charCount: data.text.length,
      });
      return data.text;
    } catch (err: any) {
      this.logger.error("Ошибка при чтении PDF", {
        filePath,
        error: err.message,
        stack: err.stack,
      });
      throw err;
    }
  }

  /**
   * Разбивает текст на чанки
   */
  private splitText(
    text: string,
    chunkSize: number = 300,
    overlap: number = 50
  ): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let start = 0;

    while (start < words.length) {
      const end = start + chunkSize;
      chunks.push(words.slice(start, end).join(" "));
      start = end - overlap;
    }

    return chunks;
  }

  /**
   * Нормализует текст для хэширования
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim()
      .toLowerCase();
  }

  /**
   * Проверяет, является ли чанк валидным
   */
  private isValidChunk(text: string): boolean {
    const clean = this.normalizeText(text);
    return clean.length >= 20 && /[a-zA-Zа-яА-ЯёЁ0-9]/.test(clean);
  }

  /**
   * Генерирует SHA-256 хэш строки
   */
  private hashText(text: string): string {
    return createHash("sha256").update(text).digest("hex");
  }

  /**
   * Генерирует эмбеддинг через Ollama
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.ollama.embeddings({
        model: this.model,
        prompt: text,
      });
      return response.embedding;
    } catch (err: any) {
      this.logger.error("Ошибка при генерации эмбеддинга", {
        error: err.message,
        textPreview: text.substring(0, 100),
      });
      throw err;
    }
  }

  /**
   * Полный пайплайн: загрузка → чанки → эмбеддинги
   */
  async ingestPdf(
    filePath: string,
    indexFilePath: string = "./data/rag-index.json"
  ): Promise<void> {
    this.logger.info("Начало обработки PDF", { filePath, indexFilePath });

    try {
      await this.loadIndex(indexFilePath);
      this.logger.info("Индекс загружен", { chunkCount: this.chunks.length });
    } catch (err: any) {
      this.logger.warn("Индекс не найден или повреждён. Начинаем с нуля", {
        error: err.message,
      });
      this.chunks = [];
    }

    const existingHashes = new Set(this.chunks.map((c) => c.hash));

    const rawText = await this.loadPdf(filePath);
    const chunks = this.splitText(rawText, 100, 50);

    this.logger.info("Чанки созданы", { total: chunks.length });

    for (let i = 0; i < chunks.length; i++) {
      const rawText = chunks[i];

      if (!this.isValidChunk(rawText)) {
        this.logger.debug("Пропуск низкокачественного чанка", { chunkId: i });
        continue;
      }

      const normalizedText = this.normalizeText(rawText);
      const chunkHash = this.hashText(normalizedText);

      if (existingHashes.has(chunkHash)) {
        this.logger.debug("Пропуск дубликата", { chunkId: i });
        continue;
      }

      let success = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!success && attempts < maxAttempts) {
        try {
          attempts++;
          this.logger.debug("Обработка чанка", {
            chunkId: i,
            attempt: attempts,
          });

          const embedding = await this.generateEmbedding(rawText);

          this.chunks.push({
            id: i,
            text: rawText,
            embedding,
            hash: chunkHash,
          });

          existingHashes.add(chunkHash);
          this.logger.info("Чанк успешно обработан", { chunkId: i });

          await this.saveIndex(indexFilePath);
          await new Promise((resolve) => setTimeout(resolve, 100));
          success = true;
        } catch (err: any) {
          this.logger.error("Ошибка при обработке чанка", {
            chunkId: i,
            attempt: attempts,
            maxAttempts,
            error: err.message,
          });

          if (attempts >= maxAttempts) {
            this.logger.warn(
              "Чанк пропущен после максимального числа попыток",
              { chunkId: i }
            );
          } else {
            const delay = Math.pow(2, attempts) * 200;
            this.logger.debug("Повтор через задержку", {
              chunkId: i,
              delayMs: delay,
            });
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    }

    this.logger.info("Обработка PDF завершена", {
      totalProcessed: this.chunks.length,
      filePath,
    });
  }

  /**
   * Поиск по схожести с фильтрацией по порогу
   */
  async search(
    query: string,
    topK: number = 5,
    minScore: number = 0.7
  ): Promise<{ text: string; score: number }[]> {
    if (!this.chunks.length) {
      const msg = "Сначала загрузите PDF с помощью ingestPdf.";
      this.logger.error(msg);
      throw new Error(msg);
    }

    this.logger.debug("Выполнение поискового запроса", {
      query,
      topK,
      minScore,
    });

    const queryEmbedding = await this.generateEmbedding(query);
    const similarities = this.chunks
      .map((chunk) => ({
        text: chunk.text,
        score: cosineSimilarity(chunk.embedding, queryEmbedding),
      }))
      .filter((result) => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (similarities.length === 0) {
      this.logger.warn("По запросу нет релевантных результатов", {
        query,
        minScore,
      });
    } else {
      this.logger.debug("Найдены релевантные фрагменты", {
        resultCount: similarities.length,
      });
    }

    return similarities;
  }

  /**
   * Сохраняет индекс в JSON
   */
  async saveIndex(path: string): Promise<void> {
    try {
      const dir = dirname(path);
      await mkdir(dir, { recursive: true });

      const data = {
        chunks: this.chunks.map((c) => ({
          id: c.id,
          text: c.text,
          embedding: Array.from(c.embedding),
          hash: c.hash,
        })),
      };

      await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
      this.logger.info("Индекс сохранён", { path });
    } catch (err: any) {
      this.logger.error("Ошибка при сохранении индекса", {
        path,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Загружает индекс из JSON
   */
  async loadIndex(path: string): Promise<void> {
    try {
      const content = await readFile(path, "utf-8");
      const data = JSON.parse(content);

      this.chunks = data.chunks.map((c: any) => ({
        id: c.id,
        text: c.text,
        embedding: Float32Array.from(c.embedding),
        hash: c.hash,
      }));

      this.logger.info("Индекс загружен", {
        path,
        chunkCount: this.chunks.length,
      });
    } catch (err: any) {
      if (err.code === "ENOENT") {
        this.logger.warn("Файл индекса не найден", { path });
        throw new Error(`Файл индекса не найден: ${path}. Начнём с нуля.`);
      } else {
        this.logger.error("Ошибка при загрузке индекса", {
          path,
          error: err.message,
        });
        throw new Error(`Ошибка при загрузке индекса: ${err.message}`);
      }
    }
  }
}
