import { exec } from "child_process";
import { promisify } from "util";
import { getLogger } from "../../utils/logger";
import { Logger } from "winston";

const execAsync = promisify(exec);

export class GitService {
  private logger!: Logger;

  constructor(private model: string = "nomic-embed-text") {
    this.init();
  }

  /**
   * Асинхронная инициализация логгера
   */
  async init(): Promise<this> {
    this.logger = await getLogger("GitService");
    this.logger.info("GitService инициализирован");
    return this;
  }

  /**
   * Получает текущую активную ветку в Git-репозитории
   * @param repoPath Опциональный путь к репозиторию. По умолчанию — текущая директория
   * @returns Название текущей ветки
   */
  async getCurrentBranch(repoPath?: string): Promise<string> {
    const command = "git branch --show-current";
    const options = repoPath ? { cwd: repoPath } : undefined;

    try {
      const { stdout } = await execAsync(command, options);
      const output =
        typeof stdout === "string" ? stdout : stdout.toString("utf8");
      const branch = output.trim();

      if (!branch) {
        await this.logger.warn(
          "Текущая ветка не найдена. Возможно, пустой репозиторий или нет коммитов."
        );
        throw new Error(
          "Не удалось определить текущую ветку. Возможно, это не Git-репозиторий или ещё нет коммитов."
        );
      }

      await this.logger.info(`Текущая ветка: ${branch}`);
      return branch;
    } catch (error: any) {
      await this.logger.error("Ошибка при получении текущей ветки", {
        error: error.message,
      });

      throw new Error(`Git ошибка: ${error.message}`);
    }
  }

  /**
   * Получает список всех веток (локальных и/или удалённых)
   * @param options.all Если true — включает удалённые ветки (git branch -a)
   * @param repoPath Опциональный путь к репозиторию
   * @returns Массив имён веток
   */
  async getAllBranches(
    options?: { all?: boolean },
    repoPath?: string
  ): Promise<string[]> {
    const flag = options?.all ? "-a" : "";
    const command = `git branch ${flag}`;
    const execOptions = repoPath ? { cwd: repoPath } : undefined;

    try {
      const { stdout } = await execAsync(command, execOptions);
      const output =
        typeof stdout === "string" ? stdout : stdout.toString("utf8");

      const branches = output
        .split("\n")
        .map((line) => line.trim().replace(/^[*+\s]+/, ""))
        .filter(Boolean);

      await this.logger.info(`Найдено веток: ${branches.length}`, { branches });

      return branches;
    } catch (error: any) {
      await this.logger.error("Ошибка при получении списка веток", {
        error: error.message,
      });

      throw new Error(`Git ошибка: ${error.message}`);
    }
  }
}
