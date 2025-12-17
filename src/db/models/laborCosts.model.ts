import { Sequelize, DataTypes, Model } from "sequelize";

// ✅ Определяем ActivityType здесь — как источник правды
export enum ActivityType {
  Analysis = "analysis",
  Design = "design",
  Development = "development",
  Testing = "testing",
  Other = "other",
}

interface LaborCostsAttributes {
  id?: number;
  userId: number;
  taskId: number;
  time: number;
  details?: string;
  activity: ActivityType;
  date: string | Date; // 👈 Обязательное поле: дата трудозатрат
}

class LaborCosts
  extends Model<LaborCostsAttributes>
  implements LaborCostsAttributes
{
  public id!: number;
  public userId!: number;
  public taskId!: number;
  public time!: number;
  public details?: string;
  public activity!: ActivityType;
  public date!: Date; // 👈 Поле добавлено и обязательно

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initLaborCostsModel(sequelize: Sequelize) {
  LaborCosts.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "user_id",
        references: {
          model: "users",
          key: "id",
        },
      },
      taskId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "task_id",
        references: {
          model: "tasks",
          key: "id",
        },
      },
      time: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "Время в минутах",
        validate: {
          min: {
            args: [10],
            msg: "Время должно быть не менее 10 минут",
          },
        },
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      activity: {
        type: DataTypes.ENUM(
          ActivityType.Analysis,
          ActivityType.Design,
          ActivityType.Development,
          ActivityType.Testing,
          ActivityType.Other
        ),
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY, // Хранит только дату (без времени)
        allowNull: false, // 👈 Обязательное поле
        defaultValue: DataTypes.NOW, // Значение по умолчанию — сегодня
      },
    },
    {
      sequelize,
      tableName: "labor_costs",
      timestamps: true,
    }
  );
}

export { LaborCosts };
