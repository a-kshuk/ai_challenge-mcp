export class SchedulerService {
  private timeoutId: NodeJS.Timeout | null = null;

  /**
   * Запускает ежедневное выполнение задачи в указанное время
   * @param onTrigger Функция, вызываемая при срабатывании таймера
   * @param hour - час (0–23), по умолчанию 8
   * @param minute - минута (0–59), по умолчанию 0
   */
  startDailyAtTime(
    onTrigger: (scheduledTime: Date) => void,
    hour: number = 8,
    minute: number = 0
  ): void {
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(
        "Некорректное время: час должен быть от 0 до 23, минуты — от 0 до 59."
      );
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log("[SchedulerService] Предыдущая задача остановлена.");
    }

    const scheduleNextRun = () => {
      const now = new Date();
      let nextRun = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
        0,
        0
      );

      if (now >= nextRun) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      const delay = nextRun.getTime() - now.getTime();

      this.timeoutId = setTimeout(() => {
        onTrigger(new Date()); // Вызываем переданный колбэк
        scheduleNextRun(); // Планируем следующий запуск
      }, delay);

      console.log(
        `[SchedulerService] Запланирована ежедневная задача на ${hour}:${minute
          .toString()
          .padStart(2, "0")} (следующий запуск: ${nextRun.toLocaleString()})`
      );
    };

    scheduleNextRun();
  }

  /**
   * Останавливает запланированную задачу
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log("[SchedulerService] Ежедневная задача остановлена.");
    }
  }
}
