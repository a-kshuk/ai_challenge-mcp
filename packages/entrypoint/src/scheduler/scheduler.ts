import { AiEntryPoint } from "../types";
import { ChatProcessor } from "@agentkit/ai-agent";
import { SchedulerService } from "./services/SchedulerService";

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
    const today = new Date(Date.now()).toISOString().split("T")[0];

    const query = `**TASK 1: Get Weather Forecast**


PLAN:
1. Prepare the call to \`get_weather_forecast\` with \`location="Moscow"\`.
2. Parse the JSON response.
3. Format data into a readable weather summary.
4. Store the result for later use.


EXECUTE:
- Step 1: Invoke \`get_weather_forecast(location="Moscow")\`.
- Step 2: Assume response:
  \`\`\`json
  {
    "temp": 2.5,
    "condition": "Partly cloudy",
    "humidity": 82,
    "wind_speed": 4.3
  }
  \`\`\`
- Step 3: Format as:
  \`\`\`md
  Погода в Москве:
  - Температура: 2.5°C
  - Состояние: Переменная облачность
  - Влажность: 82%
  - Ветер: 4.3 м/с
  \`\`\`
- Step 4: Save this text to a variable weather_report.

OUTPUT:
Return weather_report text.


**TASK 2: Save to Markdown**

PLAN:
1. Use weather_report as the content to save.
2. Call save_text_md({text:weather_report}).
3. Confirm success.

EXECUTE:

- Step 1: Take weather_report from Task 1.
- Step 2 : Invoke save_text_md({text: weather_report}).
- Step 3: Assume response:
  \`\`\`json
  {"status": "success"}
  \`\`\`

VERIFY:
- Check status == "success".

OUTPUT:
Return:
  \`\`\`
  Отчёт успешно сохранён
  \`\`\`



**FINAL OUTPUT**


Combine both task outputs into a single response. Ensure:
- Weather data is accurate and formatted correctly.
- Markdown file is confirmed saved.
- No technical tool details (e.g., JSON keys) are exposed in the final text.

Deliver the final message in Russian, including:
- The formatted weather report.
- The success confirmation.`;

    console.log("📊 [Scheduler] Запрос к ИИ");

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
