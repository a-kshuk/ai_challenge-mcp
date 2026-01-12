import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { Logger } from "winston";
import { getLogger } from "../utils/logger";
import { PdfExtractor } from "./extractors/PdfExtractor";
import { TextProcessor } from "./processors/TextProcessor";
import { EmbeddingEngine } from "./embedding/EmbeddingEngine";

export class RagService {
  private pdfExtractor!: PdfExtractor;
  private textProcessor!: TextProcessor;
  private embeddingEngine!: EmbeddingEngine;
  private logger!: Logger;

  async init() {
    this.logger = await getLogger("RagService");
    this.pdfExtractor = new PdfExtractor(this.logger);
    this.textProcessor = new TextProcessor(this.logger);
    this.embeddingEngine = new EmbeddingEngine(this.logger);
    await this.ingestPdf("./fnp.pdf");
  }

  async ingestPdf(
    filePath: string,
    indexFilePath: string = "./data/rag-index.json"
  ) {
    this.logger.info("Начало обработки PDF", { filePath });

    // 1. Загружаем текст
    const text = await this.pdfExtractor.extract(filePath);

    // 2. Разбиваем на чанки
    const chunks = this.textProcessor.split(text, 100, 50);

    // 3. Загружаем существующий индекс
    const existingHashes = await this.loadExistingHashes(indexFilePath);

    // 4. Дедупликация
    const newChunks = this.textProcessor.deduplicate(chunks, existingHashes);

    // 5. Генерируем эмбеддинги и добавляем в индекс
    for (const chunk of newChunks) {
      let success = false;
      let attempts = 0;

      while (!success && attempts < 3) {
        try {
          attempts++;
          await this.embeddingEngine.addChunk(chunk);
          success = true;
        } catch (err: any) {
          this.logger.warn("Повторная попытка генерации эмбеддинга", {
            chunkId: chunk.id,
            attempt: attempts,
          });
          await new Promise((r) => setTimeout(r, Math.pow(2, attempts) * 200));
        }
      }
    }

    // 6. Сохраняем
    await this.saveIndex(indexFilePath);

    this.logger.info("PDF инжест завершён", {
      newChunks: newChunks.length,
      totalChunks: this.embeddingEngine.getChunkCount(),
    });
  }

  async search(query: string, topK: number = 5, minScore: number = 0.7) {
    return await this.embeddingEngine.search(query, topK, minScore);
  }

  private async loadExistingHashes(path: string): Promise<Set<string>> {
    const hashes = new Set<string>();
    try {
      const content = await readFile(path, "utf-8");
      const data = JSON.parse(content);
      this.embeddingEngine.deserialize(data);
      data.forEach((c: any) => hashes.add(c.hash));
    } catch (err: any) {
      this.logger.warn("Индекс не найден или повреждён", { path });
    }
    return hashes;
  }

  private async saveIndex(path: string): Promise<void> {
    try {
      const dir = dirname(path);
      await mkdir(dir, { recursive: true });
      const data = this.embeddingEngine.serialize();
      await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
      this.logger.info("Индекс сохранён", { path });
    } catch (err: any) {
      this.logger.error("Ошибка при сохранении индекса", {
        error: err.message,
      });
      throw err;
    }
  }
}
