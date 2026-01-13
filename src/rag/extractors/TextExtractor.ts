import { readFile } from "fs/promises";
import { Logger } from "winston";

export class TextExtractor {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async extract(filePath: string): Promise<string> {
    this.logger.info("Извлечение текста из текстового файла", { filePath });
    try {
      const text = await readFile(filePath, "utf-8");

      this.logger.info("Текст извлечён", {
        filePath,
        charCount: text.length,
      });

      return text;
    } catch (err: any) {
      this.logger.error("Ошибка при извлечении текста из файла", {
        filePath,
        error: err.message,
      });
      throw new Error(`Не удалось прочитать текстовый файл: ${err.message}`);
    }
  }
}
