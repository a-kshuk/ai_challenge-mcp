import { ActivityType } from "../db/models/laborCosts.model"; // 👈 Импортируем из модели

/**
 * DTO для создания трудозатрат
 */
export interface CreateLaborCostDto {
  userId: number;
  taskId: number;
  time: number;
  activity: ActivityType;
  details?: string;
}

/**
 * DTO для обновления трудозатрат
 */
export interface UpdateLaborCostDto {
  id: number;
  time?: number;
  details?: string;
}

/**
 * DTO для ответа
 */
export interface LaborCostResponseDto {
  id: number;
  userId: number;
  taskId: number;
  time: number;
  details: string | null;
  activity: ActivityType;
  createdAt: string;
  updatedAt: string;
}
