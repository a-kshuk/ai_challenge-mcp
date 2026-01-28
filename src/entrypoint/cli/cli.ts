import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { ChatProcessor } from "../../ai-agent";
import { AiEntryPoint } from "../types";
import AudioRecorder from "../../utils/audioRecorder";

export class CliEntryPoint implements AiEntryPoint {
  private readonly SESSION_ID = "cli-session";
  // Создаём экземпляр рекордера
  private readonly audioRecorder = new AudioRecorder({
    filename: "cli-recording",
  });

  constructor(private readonly processor: ChatProcessor) {}

  async configure(): Promise<void> {
    const systemPrompt =
      "Вы — ИИ в интерактивном режиме. Отвечайте подробно, дружелюбно и по делу.";

    this.processor.setConfig({
      systemPrompt,
      rag: {
        paths: ["README.md", "package.json"],
      },
    });
  }

  async run(): Promise<void> {
    console.log("CLI mode started");
    console.log("Доступные команды:");
    console.log("  record — начать запись голоса");
    console.log("  stop   — остановить запись и распознать речь");
    console.log("  exit   — выйти из программы");

    const rl = createInterface({ input, output });

    while (true) {
      const query = await rl.question("\n🗣️  Ваш запрос: ");
      const trimmedQuery = query.trim().toLowerCase();

      if (trimmedQuery === "exit") {
        console.log("👋 До свидания!");
        rl.close();
        return;
      }

      // Начать запись
      if (trimmedQuery === "record") {
        try {
          await this.audioRecorder.startRecording();
          console.log(
            "🔴 Запись активна. Говорите... (введите 'stop' для завершения)",
          );
          continue;
        } catch (error: any) {
          console.error("❌ Ошибка при старте записи:", error.message);
          continue;
        }
      }

      // Остановить запись и распознать
      if (trimmedQuery === "stop") {
        console.log("Обрабатываю аудио...");

        // Распознаём речь через Whisper (язык можно сделать настраиваемым)
        const txtPath = await this.audioRecorder.transcribeAudio("ru");
        if (!txtPath) {
          console.log("❌ Не удалось распознать речь.");
          continue;
        }

        const recognizedText = this.audioRecorder.readTranscription(txtPath);
        if (!recognizedText) {
          console.log("🎙️  Аудио распознано, но текст пуст или не прочитан.");
          continue;
        }

        console.log(`📝 Распознано: ${recognizedText}`);

        // Отправляем распознанный текст в ИИ
        const start = Date.now();
        console.log("🤖 Думаю...");

        try {
          const response = await this.processor.processMessage({
            sessionId: this.SESSION_ID,
            text: recognizedText,
          });
          const durationSec = ((Date.now() - start) / 1000).toFixed(2);

          console.log(`\n🤖 AI (${durationSec} сек):\n${response.message}`);

          if (response.tools.length > 0) {
            console.log(`🛠️  Использованные инструменты:`);
            response.tools.forEach((tool, i) => {
              console.log(
                `  ${i + 1}. ${tool.name} ${JSON.stringify(tool.arguments)}`,
              );
            });
          }
        } catch (error) {
          console.error("❌ Ошибка обработки запроса:", error);
          console.log("Извините, произошла ошибка. Попробуйте ещё раз.");
        }

        continue;
      }

      // Обычный текстовый ввод
      const start = Date.now();
      console.log("🤖 Думаю...");

      try {
        const response = await this.processor.processMessage({
          sessionId: this.SESSION_ID,
          text: query,
        });
        const durationSec = ((Date.now() - start) / 1000).toFixed(2);

        console.log(`\n🤖 AI (${durationSec} сек):\n${response.message}`);

        if (response.tools.length > 0) {
          console.log(`🛠️  Использованные инструменты:`);
          response.tools.forEach((tool, i) => {
            console.log(
              `  ${i + 1}. ${tool.name} ${JSON.stringify(tool.arguments)}`,
            );
          });
        }
      } catch (error) {
        console.error("❌ Ошибка обработки запроса:", error);
        console.log("Извините, произошла ошибка. Попробуйте ещё раз.");
      }
    }
  }
}
