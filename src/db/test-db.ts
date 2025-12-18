import { sequelize } from "./index";
import { initializeDatabase } from "./index";
import { User } from "./models/user.model";
import { Task } from "./models/task.model";
import { LaborCosts, ActivityType } from "./models/laborCosts.model";

function generateMockData() {
  // Получаем текущую дату в формате YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  // Получаем вчерашнюю дату
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]; // 86400000 = 24 часа в мс

  // Моковые данные
  const mockUsers = [
    { firstName: "Иван", lastName: "Иванов", nickname: "ivan_i" },
    { firstName: "Петр", lastName: "Петров", nickname: "petr_p" },
    { firstName: "Анна", lastName: "Сидорова", nickname: "anna_s" },
  ];

  const mockTasks = [
    {
      title: "Разработка API",
      description: "Создать маршруты и контроллеры",
      isClosed: false,
    },
    {
      title: "Тестирование",
      description: "Написать unit-тесты",
      isClosed: false,
    },
    { title: "Документация", description: "Обновить README", isClosed: true },
  ];

  const mockLaborCosts = [
    {
      userId: 1,
      taskId: 1,
      time: 120,
      activity: ActivityType.Development,
      details: "Реализация маршрутов",
      date: today,
    },
    {
      userId: 1,
      taskId: 1,
      time: 60,
      activity: ActivityType.Testing,
      details: "Покрытие тестами",
      date: today,
    },
    {
      userId: 2,
      taskId: 2,
      time: 90,
      activity: ActivityType.Development,
      details: "Настройка Jest",
      date: today,
    },
    {
      userId: 3,
      taskId: 3,
      time: 30,
      activity: ActivityType.Design,
      details: "Обновление структуры",
      date: yesterday,
    },
  ];

  return { mockUsers, mockTasks, mockLaborCosts };
}

/**
 * Запускает тестовую базу данных и заполняет её моками
 */
export async function setupTestDB() {
  await initializeDatabase();
  await sequelize.sync({ force: true });

  const { mockUsers, mockTasks, mockLaborCosts } = generateMockData();
  const users = await Promise.all(mockUsers.map((user) => User.create(user)));
  const tasks = await Promise.all(mockTasks.map((task) => Task.create(task)));
  const laborCosts = await Promise.all(
    mockLaborCosts.map((cost) => LaborCosts.create(cost))
  );

  console.log("✅ Тестовая БД запущена. Добавлено:");
  console.log(`👤 Пользователи: ${users.length}`);
  console.log(`📝 Задачи: ${tasks.length}`);
  console.log(`⏱️  Трудозатраты: ${laborCosts.length}`);

  return { users, tasks, laborCosts };
}

/**
 * Закрывает соединение с БД
 */
export async function closeTestDB() {
  await sequelize.close();
}
