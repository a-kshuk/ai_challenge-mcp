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
   * Добавить новые трудозатраты
   */
  async addLaborCost(dto: CreateLaborCostDto) {
    const { userId, taskId, time, activity, details, date } = dto;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`Пользователь с ID ${userId} не найден`);
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      throw new Error(`Задача с ID ${taskId} не найдена`);
    }

    const costDate = date ? new Date(date) : null;
    if (!costDate || isNaN(costDate.getTime())) {
      throw new Error(
        "Поле 'date' обязательно и должно быть корректной датой в формате YYYY-MM-DD"
      );
    }

    const cost = await LaborCosts.create({
      userId,
      taskId,
      time,
      activity,
      details,
      date: costDate,
    });

    return this.toResponseDto(cost.toJSON());
  }

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
   * Обновить трудозатраты (время, описание, дата)
   */
  async updateLaborCost(dto: UpdateLaborCostDto) {
    const cost = await LaborCosts.findByPk(dto.id);
    if (!cost) {
      throw new Error(`Трудозатраты с ID ${dto.id} не найдены`);
    }

    if (dto.time !== undefined) {
      cost.time = dto.time;
    }

    if (dto.details !== undefined) {
      cost.details = dto.details;
    }

    const updateDate = new Date(dto.date);
    if (isNaN(updateDate.getTime())) {
      throw new Error(
        "Поле 'date' обязательно и должно быть корректной датой в формате YYYY-MM-DD"
      );
    }
    cost.date = updateDate;

    await cost.save();

    return this.toResponseDto(cost.toJSON());
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
  private toResponseDto(data: any): LaborCostResponseDto {
    return {
      id: data.id,
      userId: data.user_id,
      taskId: data.task_id,
      time: data.time,
      details: data.details,
      activity: data.activity,
      date: data.date.toISOString().split("T")[0],
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
