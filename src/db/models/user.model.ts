import { Sequelize, DataTypes, Model } from "sequelize";

// Интерфейсы
interface UserAttributes {
  id?: number;
  firstName: string;
  lastName: string;
  nickname: string;
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: number;
  public firstName!: string;
  public lastName!: string;
  public nickname!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Метод для инициализации модели (принимает экземпляр Sequelize)
export function initUserModel(sequelize: Sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      firstName: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      nickname: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        validate: {
          is: /^[a-zA-Z0-9_-]+$/i, // Только латиница, цифры, _, -
        },
      },
    },
    {
      sequelize,
      tableName: "users",
      timestamps: true,
    }
  );
}

export { User };
