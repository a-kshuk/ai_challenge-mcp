import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, basename, extname, join } from "path";
import { Logger } from "winston";
import { getLogger } from "../utils/logger";
import { ProjectExtractor } from "./extractors/ProjectExtractor";
import { TextProcessor } from "./processors/TextProcessor";
import { EmbeddingEngine } from "./embedding/EmbeddingEngine";
import { ExtractedDocument } from "./types";
import { stat } from "fs/promises";

export class RagService {
  private projectExtractor!: ProjectExtractor;
  private textProcessor!: TextProcessor;
  private embeddingEngine!: EmbeddingEngine;
  private logger!: Logger;

  async init(paths: string[], exclude: string[] = []): Promise<void> {
    this.logger = await getLogger("RagService");
    this.projectExtractor = new ProjectExtractor(this.logger);
    this.textProcessor = new TextProcessor(this.logger);
    this.embeddingEngine = new EmbeddingEngine(this.logger);

    this.logger.info("RagService инициализирован", {
      totalPaths: paths.length,
      paths,
      exclude: exclude.length > 0 ? exclude : "нет",
    });

    for (const path of paths) {
      try {
        await this.ingest(path, exclude);
      } catch (err) {
        this.logger.error("Ошибка при инжесте пути", {
          path,
          error: (err as Error).message,
        });
      }
    }

    this.logger.info("Инициализация завершена", {
      totalChunks: this.embeddingEngine.getChunkCount(),
    });
  }

  /**
   * Приватный метод: инжест одного пути с исключениями
   */
  private async ingest(path: string, exclude: string[]): Promise<void> {
    const stats = await stat(path);
    const name = basename(path, extname(path));
    const indexFilePath = join("./data", `${name}.json`);

    this.logger.info("Начало инжеста", { path });

    let documents: ExtractedDocument[] = [];

    if (stats.isFile()) {
      const doc = await this.projectExtractor.extractFromFile(path);
      if (doc) documents.push(doc);
    } else if (stats.isDirectory()) {
      documents = await this.projectExtractor.extractFromDirectory(
        path,
        exclude
      );
    } else {
      this.logger.warn("Путь не является файлом или директорией", { path });
      return;
    }

    const existingHashes = await this.loadExistingHashes(indexFilePath);

    for (const { text, mode } of documents) {
      const chunks = this.textProcessor.split(text, 100, 50, mode);
      const newChunks = this.textProcessor.deduplicate(chunks, existingHashes);

      for (const chunk of newChunks) {
        let success = false;
        let attempts = 0;

        while (!success && attempts < 3) {
          try {
            attempts++;
            await this.embeddingEngine.addChunk(chunk);
            success = true;
          } catch (err: any) {
            this.logger.warn("Повторная попытка", {
              chunkId: chunk.id,
              attempt: attempts,
            });
            await new Promise((r) =>
              setTimeout(r, Math.pow(2, attempts) * 200)
            );
          }
        }
      }
    }

    await this.saveIndex(indexFilePath);

    this.logger.info("Инжест завершён", {
      source: path,
      totalDocuments: documents.length,
      indexFile: indexFilePath,
    });
  }

  /**
   * Поиск по векторной базе
   */
  async search(query: string, topK: number = 5, minScore: number = 0.7) {
    return await this.embeddingEngine.search(query, topK, minScore);
  }

  /**
   * Загрузка существующих хешей из файла
   */
  private async loadExistingHashes(path: string): Promise<Set<string>> {
    const hashes = new Set<string>();
    try {
      const content = await readFile(path, "utf-8");
      const data = JSON.parse(content);
      this.embeddingEngine.deserialize(data);
      data.forEach((c: any) => hashes.add(c.hash));
    } catch (err) {
      this.logger.warn("Индекс не найден или повреждён", { path });
    }
    return hashes;
  }

  /**
   * Сохранение индекса в файл
   */
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
