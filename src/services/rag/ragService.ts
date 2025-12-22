import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { Ollama } from "ollama";
import pdfParse from "pdf-parse";

interface DocumentChunk {
  id: number;
  text: string;
  embedding: number[];
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
  private isInitialized = true; // Будем считать, что инициализация идёт в процессе

  constructor(private model: string = "nomic-embed-text") {
    this.ollama = new Ollama({ host: "http://localhost:11434" });
  }

  /**
   * Загружает PDF и извлекает текст
   */
  async loadPdf(filePath: string): Promise<string> {
    console.log(`Чтение PDF: ${filePath}`);
    const buffer = await readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
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
   * Генерирует эмбеддинг через Ollama
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ollama.embeddings({
      model: this.model,
      prompt: text,
    });
    return response.embedding;
  }

  /**
   * Полный пайплайн: загрузка → чанки → эмбеддинги (с сохранением прогресса)
   */
  async ingestPdf(
    filePath: string,
    indexFilePath: string = "./data/rag-index.json"
  ): Promise<void> {
    console.log("Загрузка PDF...");
    const text = await this.loadPdf(filePath);
    console.log(`Текст извлечён: ${text.length} символов`);

    const chunks = this.splitText(text, 300, 50);
    console.log(`Создано чанков: ${chunks.length}`);

    // Попробуем загрузить уже обработанные чанки
    try {
      await this.loadIndex(indexFilePath);
      console.log(
        `✅ Прогресс загружен: ${this.chunks.length} чанков уже обработано`
      );
    } catch (err) {
      console.log("🟡 Нет сохранённого прогресса — начнём с нуля");
      this.chunks = [];
    }

    const startIndex = this.chunks.length;
    console.log(`Начинаем с чанка ${startIndex}`);

    for (let i = startIndex; i < chunks.length; i++) {
      const chunkText = chunks[i];
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!success && attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Чанк ${i}, попытка ${attempts}...`);
          const embedding = await this.generateEmbedding(chunkText);
          this.chunks.push({ id: i, text: chunkText, embedding });
          console.log(`Чанк ${i} успешно обработан`);

          // Сохраняем прогресс после каждого успешного чанка
          await this.saveIndex(indexFilePath);

          success = true;

          // Пауза между запросами
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err: any) {
          console.error(
            `Ошибка при обработке чанка ${i}, попытка ${attempts}:`,
            err.message
          );

          if (attempts >= maxAttempts) {
            console.error(
              `❌ Не удалось обработать чанк ${i} после ${maxAttempts} попыток. Пропускаем.`
            );
          } else {
            const delay = Math.pow(2, attempts) * 200; // экспоненциальная задержка
            console.log(`⏳ Ждём ${delay} мс перед повтором...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    }

    console.log(
      `✅ Обработка PDF завершена. Всего обработано чанков: ${this.chunks.length}`
    );
  }

  /**
   * Поиск по схожести
   */
  async search(
    query: string,
    topK: number = 3
  ): Promise<{ text: string; score: number }[]> {
    if (!this.chunks.length) {
      throw new Error("Сначала загрузите PDF с помощью ingestPdf.");
    }

    const queryEmbedding = await this.generateEmbedding(query);
    const similarities = this.chunks
      .map((chunk) => ({
        text: chunk.text,
        score: cosineSimilarity(chunk.embedding, queryEmbedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return similarities;
  }

  /**
   * Сохраняет индекс в JSON (с автосозданием папки)
   */
  async saveIndex(path: string): Promise<void> {
    const dir = dirname(path);
    await mkdir(dir, { recursive: true });

    const data = {
      chunks: this.chunks.map((c) => ({
        ...c,
        embedding: Array.from(c.embedding),
      })),
    };

    await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
    console.log(`💾 Индекс сохранён: ${path}`);
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
      }));

      console.log(`✅ Индекс загружен: ${this.chunks.length} чанков`);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw new Error(`Файл индекса не найден: ${path}. Начнём с нуля.`);
      } else {
        throw new Error(`Ошибка при загрузке индекса: ${err.message}`);
      }
    }
  }
}
