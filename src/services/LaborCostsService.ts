import { LaborCosts } from "../db/models/laborCosts.model";
import { Task } from "../db/models/task.model";
import { User } from "../db/models/user.model";
import {
  CreateLaborCostDto,
  UpdateLaborCostDto,
  LaborCostResponseDto,
} from "../dto/labor-costs.dto";

export class LaborCostsService {
  /**
   * Добавить новые трудозатраты
   */
  async addLaborCost(dto: CreateLaborCostDto) {
    const { userId, taskId, time, activity, details } = dto;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`Пользователь с ID ${userId} не найден`);
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      throw new Error(`Задача с ID ${taskId} не найдена`);
    }

    const cost = await LaborCosts.create({
      userId,
      taskId,
      time,
      activity,
      details,
    });

    return this.toResponseDto(cost.toJSON()); // возвращаем чистый DTO
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
   * Обновить трудозатраты (время, описание)
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
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
