import { TextExtractor } from "./TextExtractor";
import { Logger } from "winston";
import { readdir, stat } from "fs/promises";
import path from "path";

const TEXT_EXT = [".txt", ".md", ".ts", ".js", ".json", ".html", ".css"]; // расширения файлов, которые считаем текстовыми

export class ProjectExtractor {
  private logger: Logger;
  private textExtractor: TextExtractor;

  constructor(logger: Logger) {
    this.logger = logger;
    this.textExtractor = new TextExtractor(logger);
  }

  async extractFromDirectory(dirPath: string): Promise<string> {
    this.logger.info("Начало извлечения текста из папки", { dirPath });
    const texts: string[] = [];

    const readDirRecursive = async (currentPath: string) => {
      const entries = await readdir(currentPath);

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry);
        const entryStat = await stat(entryPath);

        if (entryStat.isDirectory()) {
          await readDirRecursive(entryPath); // рекурсивный обход подпапок
        } else if (entryStat.isFile()) {
          const ext = path.extname(entry).toLowerCase();
          if (TEXT_EXT.includes(ext)) {
            try {
              const text = await this.textExtractor.extract(entryPath);
              texts.push(`// Файл: ${entryPath}\n${text}\n\n`);
            } catch (err) {
              this.logger.warn("Пропуск файла из-за ошибки при чтении", {
                filePath: entryPath,
                error: (err as Error).message,
              });
            }
          }
        }
      }
    };

    try {
      await readDirRecursive(dirPath);
      const combinedText = texts.join("");
      this.logger.info("Извлечение текста завершено", {
        dirPath,
        totalChars: combinedText.length,
        totalFiles: texts.length,
      });
      return combinedText;
    } catch (err: any) {
      this.logger.error("Ошибка при обходе директории", {
        dirPath,
        error: err.message,
      });
      throw new Error(`Не удалось обработать директорию: ${err.message}`);
    }
  }
}
