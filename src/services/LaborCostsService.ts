import { LaborCosts } from "../db/models/laborCosts.model";
import { Task } from "../db/models/task.model";
import { User } from "../db/models/user.model";
import {
  CreateLaborCostDto,
  UpdateLaborCostDto,
  LaborCostResponseDto,
} from "../dto/labor-costs.dto";
import { Op } from "sequelize";

export class LaborCostsService {
  /**
   * Удалить трудозатраты по ID
   */
  async removeLaborCost(id: number) {
    const cost = await LaborCosts.findByPk(id);
    if (!cost) {
      throw new Error(`Трудозатраты с ID ${id} не найдены`);
    }
    await cost.destroy();
    return true;
  }

  /**
   * Получить трудозатраты по ID
   */
  async getLaborCostById(id: number): Promise<LaborCostResponseDto | null> {
    const cost = await LaborCosts.findByPk(id);
    if (!cost) return null;
    return this.toResponseDto(cost.toJSON());
  }

  /**
   * Получить все трудозатраты
   */
  async getAllLaborCosts(): Promise<LaborCostResponseDto[]> {
    const costs = await LaborCosts.findAll();
    return costs.map((cost) => this.toResponseDto(cost.toJSON()));
  }

  /**
   * Получить трудозатраты по дате и пользователю
   * @param date - дата в формате YYYY-MM-DD
   * @param userId - ID пользователя (обязательно)
   */
  async getLaborCostsByDate(
    date: string,
    userId: number
  ): Promise<LaborCostResponseDto[]> {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Некорректный формат даты. Ожидается YYYY-MM-DD.");
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Поле 'userId' должно быть положительным целым числом.");
    }

    const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

    const costs = await LaborCosts.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
    });

    return costs.map((cost) => this.toResponseDto(cost.toJSON()));
  }

  /**
   * Преобразует модель в Response DTO
   */
  private toResponseDto(data: LaborCosts): LaborCostResponseDto {
    return {
      id: data.id,
      userId: data.userId,
      taskId: data.taskId,
      time: data.time,
      details: data.details || undefined,
      activity: data.activity,
      date: data.date,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
