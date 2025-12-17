/**
 * DTO для создания пользователя
 */
export interface CreateUserDto {
  firstName: string;
  lastName: string;
  nickname: string;
}

/**
 * DTO для обновления пользователя (никнейм)
 */
export interface UpdateUserDto {
  nickname: string;
}

/**
 * DTO для ответа — публичные данные пользователя
 */
export interface UserResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}
