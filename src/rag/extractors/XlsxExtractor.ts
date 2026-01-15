import { readFile } from "fs/promises";
import * as XLSX from "xlsx";
import { Logger } from "winston";

/**
 * Утилита для преобразования листа в строку с сохранением структуры таблицы
 */
function sheetToString(sheet: XLSX.WorkSheet): string {
  const json = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1, // Все строки как массивы
    defval: "", // Заменяем undefined на пустую строку
  });

  return json.map((row) => row.join("\t")).join("\n"); // Сохраняем табличность через табуляцию
}

export class XlsxExtractor {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async extract(filePath: string): Promise<string> {
    this.logger.info("Извлечение текста из XLSX", { filePath });
    try {
      const buffer = await readFile(filePath);
      const workbook = XLSX.read(buffer, { type: "buffer" });

      const sheetsText: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const sheetText = sheetToString(worksheet);
        sheetsText.push(`=== Лист: ${sheetName} ===\n${sheetText}`);
      }

      const fullText = sheetsText.join("\n\n");

      this.logger.info("Текст извлечён из XLSX", {
        filePath,
        charCount: fullText.length,
        sheetCount: workbook.SheetNames.length,
      });

      return fullText;
    } catch (err: any) {
      this.logger.error("Ошибка при извлечении текста из XLSX", {
        filePath,
        error: err.message,
      });
      throw new Error(`Не удалось прочитать XLSX: ${err.message}`);
    }
  }
}
