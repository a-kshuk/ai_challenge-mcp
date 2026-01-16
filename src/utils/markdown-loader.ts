import { readFile } from "fs/promises";
import path from "path";

/**
 * Загружает содержимое .md файла и возвращает как строку.
 * В случае ошибки — возвращает fallback или падает.
 */
export async function loadMarkdownPrompt(
  filePath: string,
  fallback: string
): Promise<string> {
  try {
    const fullPath = path.resolve(filePath);
    const content = await readFile(fullPath, "utf-8");
    const trimmed = content.trim();
    return trimmed || fallback;
  } catch (error: any) {
    console.warn(
      `⚠️ Не удалось загрузить промпт из "${filePath}":`,
      error.message
    );
    return fallback;
  }
}
