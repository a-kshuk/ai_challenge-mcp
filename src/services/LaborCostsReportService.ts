import { LaborCostsService } from "./LaborCostsService";
import { UserService } from "./UserService";
import { TaskService } from "./TaskService";
import { LaborCostResponseDto } from "../dto/labor-costs.dto";
import { TaskResponseDto } from "../dto/task.dto";
import { UserResponseDto } from "../dto/user.dto";
import { ActivityType } from "../db/models/laborCosts.model";

// Обновляем интерфейс: time теперь number
interface LaborCostsReportTask {
  time: number; // ✅ Вместо string — теперь number (в минутах)
  title: string;
  details?: string;
  activity: ActivityType;
}

export interface LaborCostsReportEntry {
  full_name: string;
  tasks: LaborCostsReportTask[];
}

export class LaborCostsReportService {
  constructor(
    private laborCostsService: LaborCostsService,
    private userService: UserService,
    private taskService: TaskService
  ) {}

  /**
   * Формирует отчёт по трудозатратам за указанную дату для всех пользователей
   * @param date - дата в формате YYYY-MM-DD
   * @returns массив записей с именем пользователя и списком задач
   */
  async generateReport(date: string): Promise<LaborCostsReportEntry[]> {
    const users = await this.userService.getAllUsers();
    if (users.length === 0) {
      return [];
    }

    // Получаем трудозатраты для всех пользователей параллельно
    const costsPromises = users.map((user) =>
      this.laborCostsService.getLaborCostsByDate(date, user.id)
    );
    const costsArrays = await Promise.all(costsPromises);

    // Собираем все taskId, участвующие в трудозатратах
    const taskIds = new Set<number>();
    const userCostsMap = new Map<number, LaborCostResponseDto[]>();

    users.forEach((user, index) => {
      const costs = costsArrays[index];
      if (costs.length > 0) {
        userCostsMap.set(user.id, costs);
        costs.forEach((cost) => taskIds.add(cost.taskId));
      }
    });

    // Предзагружаем все нужные задачи
    const tasks = await Promise.all(
      Array.from(taskIds).map((id) => this.taskService.getTaskById(id))
    );
    const taskMap = new Map<number, TaskResponseDto | null>(
      tasks.map((t) => [t?.id ?? -1, t])
    );

    // Формируем результат
    const result: LaborCostsReportEntry[] = [];

    for (const user of users) {
      const costs = userCostsMap.get(user.id);
      if (!costs || costs.length === 0) continue;

      const fullName = this.getFullName(user);

      const tasks = costs.map((cost) => {
        const taskDto = taskMap.get(cost.taskId);
        const title = taskDto?.title || `Задача ${cost.taskId}`;

        return {
          time: cost.time, // ✅ cost.time — уже число в минутах → передаём напрямую
          title,
          details: cost.details || undefined,
          activity: cost.activity,
        };
      });

      result.push({
        full_name: fullName,
        tasks,
      });
    }

    return result;
  }

  /**
   * Формирует полное имя пользователя
   */
  private getFullName(user: UserResponseDto): string {
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return name || user.nickname || `Пользователь ${user.id}`;
  }
}
