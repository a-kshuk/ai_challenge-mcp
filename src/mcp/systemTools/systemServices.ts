import { readFile } from "fs/promises";
import { getLogger } from "../../utils/logger";
import { Logger } from "winston";

export class SystemService {
  private logger!: Logger;

  constructor() {
    this.init();
  }

  /**
   * Асинхронная инициализация логгера
   */
  async init(): Promise<this> {
    this.logger = await getLogger("SystemService");
    this.logger.info("SystemService инициализирован");
    return this;
  }

  /**
   * Считывает содержимое текстового файла по указанному пути
   * @param filePath Путь к файлу
   * @returns Содержимое файла как строка
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const data = await readFile(filePath, "utf-8");
      await this.logger.info(`Файл успешно прочитан: ${filePath}`, {
        charCount: data.length,
      });
      return data;
    } catch (error: any) {
      await this.logger.error(`Ошибка при чтении файла: ${filePath}`, {
        error: error.message,
      });
      throw new Error(`Не удалось прочитать файл: ${error.message}`);
    }
  }
}
