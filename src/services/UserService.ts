import { User } from "../db/models/user.model";
import { Op } from "sequelize";
import { CreateUserDto, UpdateUserDto, UserResponseDto } from "../dto/user.dto";

export class UserService {
  /**
   * Добавляет нового пользователя
   */
  async addUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await User.create(dto);
    return this.toResponseDto(user.toJSON());
  }

  /**
   * Удаляет пользователя по ID
   */
  async removeUser(id: number): Promise<boolean> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error(`Пользователь с ID ${id} не найден`);
    }
    await user.destroy();
    return true;
  }

  /**
   * Обновляет ник пользователя
   */
  async updateUserNickname(
    id: number,
    dto: UpdateUserDto
  ): Promise<UserResponseDto> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error(`Пользователь с ID ${id} не найден`);
    }

    user.nickname = dto.nickname;
    await user.save();
    return this.toResponseDto(user.toJSON());
  }

  /**
   * Находит пользователей по имени или фамилии
   */
  async findUsersByName(query: string): Promise<UserResponseDto[]> {
    if (!query || typeof query !== "string") {
      throw new Error("Поисковой запрос должен быть непустой строкой");
    }

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${query}%` } },
          { lastName: { [Op.iLike]: `%${query}%` } },
        ],
      },
    });

    return users.map((user) => this.toResponseDto(user.toJSON()));
  }

  /**
   * Получает пользователя по ID
   */
  async getUserById(id: number): Promise<UserResponseDto | null> {
    const user = await User.findByPk(id);
    if (!user) return null;
    return this.toResponseDto(user.toJSON());
  }

  /**
   * Получает всех пользователей
   */
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await User.findAll();
    return users.map((user) => this.toResponseDto(user.toJSON()));
  }

  /**
   * Преобразует модель в Response DTO
   */
  private toResponseDto(data: any): UserResponseDto {
    return {
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
