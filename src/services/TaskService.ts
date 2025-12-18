import { Task } from "../db/models/task.model";
import { Op } from "sequelize";
import { CreateTaskDto, UpdateTaskDto, TaskResponseDto } from "../dto/task.dto";

export class TaskService {
  /**
   * Добавить новую задачу
   */
  async addTask(dto: CreateTaskDto): Promise<TaskResponseDto> {
    const task = await Task.create({
      ...dto,
      isClosed: false,
    });
    return this.toResponseDto(task.toJSON());
  }

  /**
   * Удалить задачу по ID
   */
  async removeTask(id: number): Promise<boolean> {
    const task = await Task.findByPk(id);
    if (!task) {
      throw new Error(`Задача с ID ${id} не найдена`);
    }
    await task.destroy();
    return true;
  }

  /**
   * Закрыть задачу
   */
  async closeTask(id: number): Promise<TaskResponseDto> {
    const task = await Task.findByPk(id);
    if (!task) {
      throw new Error(`Задача с ID ${id} не найдена`);
    }
    task.isClosed = true;
    await task.save();
    return this.toResponseDto(task.toJSON());
  }

  /**
   * Открыть задачу
   */
  async openTask(id: number): Promise<TaskResponseDto> {
    const task = await Task.findByPk(id);
    if (!task) {
      throw new Error(`Задача с ID ${id} не найдена`);
    }
    task.isClosed = false;
    await task.save();
    return this.toResponseDto(task.toJSON());
  }

  /**
   * Обновить задачу (название, описание, статус)
   */
  async updateTask(id: number, dto: UpdateTaskDto): Promise<TaskResponseDto> {
    const task = await Task.findByPk(id);
    if (!task) {
      throw new Error(`Задача с ID ${id} не найдена`);
    }

    if (dto.title !== undefined) {
      task.title = dto.title;
    }
    if (dto.description !== undefined) {
      task.description = dto.description;
    }
    if (dto.isClosed !== undefined) {
      task.isClosed = dto.isClosed;
    }

    await task.save();
    return this.toResponseDto(task.toJSON());
  }

  /**
   * Найти задачу по заголовку
   */
  async findTasksByTitle(title: string): Promise<TaskResponseDto[]> {
    if (!title || typeof title !== "string") {
      throw new Error("Заголовок для поиска должен быть непустой строкой");
    }

    const tasks = await Task.findAll({
      where: {
        title: {
          [Op.iLike]: `%${title}%`,
        },
      },
    });

    return tasks.map((task) => this.toResponseDto(task.toJSON()));
  }

  /**
   * Получить задачу по ID
   */
  async getTaskById(id: number): Promise<TaskResponseDto | null> {
    const task = await Task.findByPk(id);
    if (!task) return null;
    return this.toResponseDto(task.toJSON());
  }

  /**
   * Получить все задачи
   */
  async getAllTasks(): Promise<TaskResponseDto[]> {
    const tasks = await Task.findAll();
    return tasks.map((task) => this.toResponseDto(task.toJSON()));
  }

  /**
   * Преобразует модель в Response DTO
   */
  private toResponseDto(data: Task): TaskResponseDto {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      isClosed: data.isClosed,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
