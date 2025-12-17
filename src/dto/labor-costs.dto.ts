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
  date: string;
}

/**
 * DTO для обновления трудозатрат
 */
export interface UpdateLaborCostDto {
  id: number;
  time?: number;
  details?: string;
  date: string;
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
  date: string;
  createdAt: string;
  updatedAt: string;
}
