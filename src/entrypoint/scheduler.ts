import { AiEntryPoint } from "./types";
import { ChatProcessor } from "../ai/chat-processor";
import { SchedulerService } from "../services/SchedulerService";

export class SchedulerEntryPoint implements AiEntryPoint {
  private readonly scheduler = new SchedulerService();

  constructor(private readonly processor: ChatProcessor) {}

  async run(): Promise<void> {
    const now = new Date();
    const triggerInOneMinute = new Date(now.getTime() + 60000);

    const hour = triggerInOneMinute.getHours();
    const minute = triggerInOneMinute.getMinutes();

    this.scheduler.startDailyAtTime(
      () => this.handleDailyTrigger(),
      hour,
      minute
    );

    console.log(
      `[SchedulerEntryPoint] Запланировано выполнение на ${hour}:${minute
        .toString()
        .padStart(2, "0")} (через ~1 минуту)`
    );
  }

  /**
   * Приватный метод — содержит логику обработки ежедневного срабатывания
   */
  private async handleDailyTrigger(): Promise<void> {
    const SESSION_ID = "scheduler-session";
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    const query = `Собери статистику по трудозатратам за ${yesterday}`;

    console.log(
      "📊 [Scheduler] Запрос к ИИ: Собираем статистику по трудозатратам за вчера..."
    );

    const start = Date.now();
    const response = await this.processor.processMessage(SESSION_ID, query);
    const end = Date.now();
    const durationSec = ((end - start) / 1000).toFixed(2);

    console.log(`\n🤖 AI (${durationSec} сек):\n${response.message}`);
    if (response.tools.length > 0) {
      console.log(`🛠️  Использованные инструменты:`);
      response.tools.forEach((tool, i) => {
        console.log(
          `  ${i + 1}. ${tool.name} ${JSON.stringify(tool.arguments)}`
        );
      });
    }
  }
}
