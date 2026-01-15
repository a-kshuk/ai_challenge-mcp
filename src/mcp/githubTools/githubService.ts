import { Octokit } from "@octokit/rest";
import { Logger } from "winston";
import { getLogger } from "../../utils/logger";

/**
 * Сервис для работы с GitHub API (управление задачами)
 * Использует Octokit для безопасного и типизированного взаимодействия с GitHub.
 * Переменные окружения: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
 */
export class GithubService {
  private logger!: Logger;
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor() {
    const token = process.env.GITHUB_TOKEN;
    this.owner = process.env.GITHUB_OWNER!;
    this.repo = process.env.GITHUB_REPO!;

    if (!token) {
      throw new Error("GITHUB_TOKEN не найден в .env файле");
    }
    if (!this.owner || !this.repo) {
      throw new Error("GITHUB_OWNER и GITHUB_REPO должны быть указаны в .env");
    }

    this.octokit = new Octokit({ auth: token });
    this.init();
  }

  /**
   * Асинхронная инициализация логгера
   */
  async init(): Promise<this> {
    this.logger = await getLogger("GithubService");
    this.logger.info("GithubService инициализирован", {
      owner: this.owner,
      repo: this.repo,
    });
    return this;
  }

  /**
   * Проверяет, валиден ли токен, выполняя запрос к /user
   */
  async checkAuth(): Promise<boolean> {
    try {
      await this.octokit.rest.users.getAuthenticated();
      this.logger.info("Аутентификация в GitHub прошла успешно");
      return true;
    } catch (error: any) {
      this.logger.error("Ошибка аутентификации в GitHub", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Создаёт новую задачу (issue) в репозитории GitHub
   * @param title Заголовок задачи
   * @param body Описание задачи (опционально)
   * @returns Объект созданной задачи с её номером и ссылкой
   */
  async createIssue(
    title: string,
    body?: string
  ): Promise<{ number: number; url: string }> {
    try {
      const response = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
      });

      const issue = response.data;
      await this.logger.info(`Задача #${issue.number} создана`, {
        url: issue.html_url,
      });
      return { number: issue.number, url: issue.html_url };
    } catch (error: any) {
      await this.logger.error("Ошибка при создании задачи", {
        error: error.message,
      });
      throw new Error(`GitHub API ошибка: ${error.message}`);
    }
  }

  /**
   * Получает список задач (issues) из репозитория
   * @param state 'open', 'closed', или 'all' (по умолчанию 'open')
   * @returns Массив задач с номером, заголовком, статусом и ссылкой
   */
  async getIssues(state: "open" | "closed" | "all" = "open"): Promise<
    Array<{
      number: number;
      title: string;
      state: string;
      url: string;
    }>
  > {
    try {
      const response = await this.octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state,
        per_page: 100,
      });

      const issues = response.data
        .filter((issue) => !issue.pull_request) // исключаем pull requests
        .map((issue) => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          url: issue.html_url,
        }));

      await this.logger.info(`Получено задач: ${issues.length}`, { state });
      return issues;
    } catch (error: any) {
      await this.logger.error("Ошибка при получении списка задач", {
        error: error.message,
      });
      throw new Error(`GitHub API ошибка: ${error.message}`);
    }
  }

  /**
   * Получает детальную информацию о конкретной задаче
   * @param issueNumber Номер задачи
   * @returns Детали задачи: заголовок, описание, статус, автор, даты
   */
  async getIssueDetails(issueNumber: number): Promise<{
    number: number;
    title: string;
    body: string | null;
    state: string;
    author: string;
    createdAt: string;
    updatedAt: string;
    url: string;
  }> {
    try {
      const response = await this.octokit.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
      });

      const issue = response.data;

      // Проверяем наличие пользователя
      if (!issue.user) {
        throw new Error(
          `Не удалось получить автора задачи #${issueNumber}: данные пользователя отсутствуют`
        );
      }

      const details = {
        number: issue.number,
        title: issue.title,
        body: issue.body ?? null,
        state: issue.state,
        author: issue.user.login,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        url: issue.html_url,
      };

      await this.logger.info(`Получены детали задачи #${issueNumber}`);
      return details;
    } catch (error: any) {
      await this.logger.error(`Ошибка при получении задачи #${issueNumber}`, {
        error: error.message,
      });
      throw new Error(`GitHub API ошибка: ${error.message}`);
    }
  }
}
