/**
 * DTO для создания задачи
 */
export interface CreateTaskDto {
  title: string;
  description?: string;
}

/**
 * DTO для обновления задачи
 */
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  isClosed?: boolean;
}

/**
 * DTO для ответа — публичные данные задачи
 */
export interface TaskResponseDto {
  id: number;
  title: string;
  description: string | null;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}
