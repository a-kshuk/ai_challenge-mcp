import { Ollama } from "ollama";
import { Logger } from "winston";

export interface DocumentChunk {
  id: number;
  text: string;
  embedding: number[];
  hash: string;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += a[i] ** 2;
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export class EmbeddingEngine {
  private chunks: DocumentChunk[] = [];
  private ollama = new Ollama({ host: "http://localhost:11434" });
  private logger!: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.ollama.embeddings({
        model: "nomic-embed-text",
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

  async addChunk(chunk: {
    id: number;
    text: string;
    hash: string;
  }): Promise<void> {
    const embedding = await this.generateEmbedding(chunk.text);
    this.chunks.push({
      ...chunk,
      embedding,
    });
    this.logger.debug("Чанк добавлен в индекс", { chunkId: chunk.id });
  }

  async addChunks(
    chunks: { id: number; text: string; hash: string }[]
  ): Promise<void> {
    for (const chunk of chunks) {
      await this.addChunk(chunk);
    }
  }

  async search(query: string, topK: number = 5, minScore: number = 0.7) {
    if (this.chunks.length === 0) {
      throw new Error("Индекс пуст. Сначала добавьте документы.");
    }

    const queryEmbedding = await this.generateEmbedding(query);
    const results = this.chunks
      .map((chunk) => ({
        text: chunk.text,
        score: cosineSimilarity(chunk.embedding, queryEmbedding),
      }))
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    this.logger.info("Поиск завершён", {
      resultCount: results.length,
      queryPreview: query.substring(0, 100),
    });

    return results;
  }

  getChunkCount(): number {
    return this.chunks.length;
  }

  // Для сохранения/загрузки
  serialize() {
    return this.chunks.map((c) => ({
      id: c.id,
      text: c.text,
      embedding: Array.from(c.embedding),
      hash: c.hash,
    }));
  }

  deserialize(data: any) {
    this.chunks = data.chunks.map((c: any) => ({
      id: c.id,
      text: c.text,
      embedding: Float32Array.from(c.embedding),
      hash: c.hash,
    }));
    this.logger.info("Индекс восстановлен", { chunkCount: this.chunks.length });
  }
}
