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
    },
    {
      sequelize,
      tableName: "labor_costs",
      timestamps: true,
    }
  );
}

// ✅ Экспортируем и модель, и тип
export { LaborCosts };
