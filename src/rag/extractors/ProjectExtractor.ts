import { TextExtractor } from "./TextExtractor";
import { PdfExtractor } from "./PdfExtractor";
import { XlsxExtractor } from "./XlsxExtractor";
import { Logger } from "winston";
import { readdir, stat } from "fs/promises";
import path from "path";
import { ExtractedDocument } from "../types";
import { minimatch } from "minimatch";

export class ProjectExtractor {
  private logger: Logger;
  private textExtractor: TextExtractor;
  private pdfExtractor: PdfExtractor;
  private xlsxExtractor: XlsxExtractor;

  constructor(logger: Logger) {
    this.logger = logger;
    this.textExtractor = new TextExtractor(logger);
    this.pdfExtractor = new PdfExtractor(logger);
    this.xlsxExtractor = new XlsxExtractor(logger);
  }

  /**
   * Извлекает документы из одного файла
   */
  async extractFromFile(filePath: string): Promise<ExtractedDocument | null> {
    const ext = path.extname(filePath).toLowerCase();
    const source = path.basename(filePath);

    try {
      let text = "";
      let mode: "words" | "lines" = "words";

      if (ext === ".pdf") {
        text = await this.pdfExtractor.extract(filePath);
        mode = "words";
      } else if (ext === ".xlsx") {
        text = await this.xlsxExtractor.extract(filePath);
        mode = "lines";
      } else if (this.isTextExtension(ext)) {
        text = await this.textExtractor.extract(filePath);
        mode = "words";
      } else {
        this.logger.debug("Формат файла не поддерживается", { filePath });
        return null;
      }

      return { text, mode, source };
    } catch (err) {
      this.logger.warn("Ошибка при чтении файла", {
        filePath,
        error: (err as Error).message,
      });
      return null;
    }
  }

  /**
   * Извлекает документы из директории с поддержкой исключений
   */
  async extractFromDirectory(
    dirPath: string,
    exclude: string[] = []
  ): Promise<ExtractedDocument[]> {
    this.logger.info("Начало извлечения из директории", {
      dirPath,
      exclude,
    });

    const documents: ExtractedDocument[] = [];

    const relativeToRoot = (fullPath: string) =>
      path.relative(dirPath, fullPath).replace(/\\/g, "/"); // нормализуем для Windows

    const readDirRecursive = async (currentPath: string) => {
      const entries = await readdir(currentPath);

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry);
        const relPath = relativeToRoot(entryPath);
        const entryStat = await stat(entryPath);

        // Проверка на исключение
        const isExcluded = exclude.some((pattern) =>
          minimatch(relPath, pattern, { dot: true })
        );

        if (isExcluded) {
          this.logger.debug("Пропуск исключённого пути", { path: entryPath });
          continue;
        }

        if (entryStat.isDirectory()) {
          await readDirRecursive(entryPath);
        } else if (entryStat.isFile()) {
          const ext = path.extname(entry).toLowerCase();
          const source = path.basename(entryPath);

          try {
            let text = "";
            let mode: "words" | "lines" = "words";

            if (ext === ".pdf") {
              text = await this.pdfExtractor.extract(entryPath);
              mode = "words";
            } else if (ext === ".xlsx") {
              text = await this.xlsxExtractor.extract(entryPath);
              mode = "lines";
            } else if (this.isTextExtension(ext)) {
              text = await this.textExtractor.extract(entryPath);
              mode = "words";
            } else {
              this.logger.debug("Формат файла не поддерживается", {
                filePath: entryPath,
              });
              continue;
            }

            documents.push({ text, mode, source });
          } catch (err) {
            this.logger.warn("Пропуск файла из-за ошибки", {
              filePath: entryPath,
              error: (err as Error).message,
            });
          }
        }
      }
    };

    try {
      await readDirRecursive(dirPath);
      this.logger.info("Извлечение завершено", {
        totalDocuments: documents.length,
      });
      return documents;
    } catch (err: any) {
      this.logger.error("Ошибка при обходе директории", {
        dirPath,
        error: err.message,
      });
      throw new Error(`Не удалось обработать директорию: ${err.message}`);
    }
  }

  private isTextExtension(ext: string): boolean {
    const textExtensions = [
      ".txt",
      ".md",
      ".ts",
      ".js",
      ".json",
      ".html",
      ".css",
      ".tsx",
      ".jsx",
      ".yaml",
      ".yml",
      ".xml",
    ];
    return textExtensions.includes(ext);
  }
}
