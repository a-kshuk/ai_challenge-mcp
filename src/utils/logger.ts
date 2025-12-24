import winston from "winston";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import fs from "fs";

// CommonJS: __dirname доступен автоматически
const logDir = path.join(__dirname, "../../logs");
const logFile = path.join(logDir, "app.log");

const isDev = process.env.NODE_ENV === "development";

// Формат логов
const logFormat = isDev
  ? winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(
        ({ level, message, timestamp, service = "App", ...meta }) => {
          const args = Object.keys(meta).length
            ? ` | ${JSON.stringify(meta)}`
            : "";
          return `[${timestamp}] ${level} [${service}] ${message}${args}`;
        }
      )
    )
  : winston.format.combine(winston.format.timestamp(), winston.format.json());

/**
 * Создаёт логгер
 */
export async function createLogger(service: string = "App") {
  // Создаём папку logs
  try {
    await mkdir(logDir, { recursive: true });
  } catch (err) {
    console.error("[Logger] Не удалось создать папку:", logDir);
  }

  // Создаём файл, если его нет
  try {
    if (!fs.existsSync(logFile)) {
      await writeFile(logFile, "", { flag: "w" });
    }
  } catch (err) {
    console.error("[Logger] Не удалось инициализировать файл лога:", logFile);
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || "debug",
    format: logFormat,
    defaultMeta: { service },
    transports: [
      // Консоль
      new winston.transports.Console({
        format: isDev
          ? winston.format.simple()
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            ),
      }),
      // Файл
      new winston.transports.File({
        filename: logFile,
        format: winston.format.json(),
      }),
    ],
    // Обработчики ошибок
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logDir, "exceptions.log"),
      }),
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logDir, "rejections.log"),
      }),
    ],
  });
}

// Синглтон
let logger: winston.Logger | null = null;

/**
 * Возвращает единый экземпляр логгера
 */
export async function getLogger(service?: string): Promise<winston.Logger> {
  if (!logger) {
    logger = await createLogger(service);
  }
  return logger;
}

export default getLogger;
