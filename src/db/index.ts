import { Sequelize } from "sequelize";
import { initUserModel, User } from "./models/user.model";
import { initTaskModel, Task } from "./models/task.model";
import { initLaborCostsModel, LaborCosts } from "./models/laborCosts.model";

// Единый экземпляр Sequelize
export const sequelize = new Sequelize("sqlite::memory:");

/**
 * Асинхронная инициализация базы данных:
 * - инициализация моделей
 * - установка ассоциаций
 * - проверка подключения
 * - синхронизация с БД
 */
export async function initializeDatabase() {
  try {
    // Инициализируем модели
    initUserModel(sequelize);
    initTaskModel(sequelize);
    initLaborCostsModel(sequelize);

    // Устанавливаем связи
    User.hasMany(LaborCosts, { foreignKey: "user_id" });
    LaborCosts.belongsTo(User, { foreignKey: "user_id" });

    Task.hasMany(LaborCosts, { foreignKey: "task_id" });
    LaborCosts.belongsTo(Task, { foreignKey: "task_id" });

    // Проверяем подключение
    await sequelize.authenticate();
    console.log("✅ Подключение к БД установлено");

    // Синхронизируем модели (force: false — не пересоздаёт таблицы)
    await sequelize.sync({ force: false });
    console.log("✅ Модели синхронизированы");
  } catch (error) {
    console.error("❌ Ошибка при инициализации БД:", error);
    throw error;
  }
}
