import { Sequelize, DataTypes, Model } from "sequelize";

interface TaskAttributes {
  id?: number;
  isClosed: boolean;
  title: string;
  description?: string;
}

class Task extends Model<TaskAttributes> implements TaskAttributes {
  public id!: number;
  public isClosed!: boolean;
  public title!: string;
  public description?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initTaskModel(sequelize: Sequelize) {
  Task.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      isClosed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_close", // Соответствие полю в БД
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: "tasks",
      timestamps: true,
    }
  );
}

export { Task };
