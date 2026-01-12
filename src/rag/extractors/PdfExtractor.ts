import { readFile } from "fs/promises";
import pdfParse from "pdf-parse";

import { Logger } from "winston";

export class PdfExtractor {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async extract(filePath: string): Promise<string> {
    this.logger.info("Извлечение текста из PDF", { filePath });
    try {
      const buffer = await readFile(filePath);
      const data = await pdfParse(buffer);
      const text = data.text;

      this.logger.info("Текст извлечён", {
        filePath,
        charCount: text.length,
      });

      return text;
    } catch (err: any) {
      this.logger.error("Ошибка при извлечении текста из PDF", {
        filePath,
        error: err.message,
      });
      throw new Error(`Не удалось прочитать PDF: ${err.message}`);
    }
  }
}
