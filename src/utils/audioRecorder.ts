import { Readable } from "stream";
import { exec } from "child_process";
import util from "util";
// @ts-ignore
import record from "node-record-lpcm16";
import fs from "fs";

const execPromise = util.promisify(exec);

interface AudioRecorderOptions {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  device?: string | null;
  filename?: string;
}

class AudioRecorder {
  private options: Required<AudioRecorderOptions>;
  private recording: Readable | null = null;
  private audioName = "recording.wav";
  private textName = "recording.wav";

  constructor(options: AudioRecorderOptions = {}) {
    console.log(record);
    this.options = {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      device: null,
      filename: "recording",
      // path: "_audio-files"
      ...options,
    };

    this.audioName = `_audio-files/${this.options.filename}.wav`;
    this.textName = `_audio-files/${this.options.filename}.txt`;
  }

  /**
   * Начать запись аудио
   * @throws {Error} При ошибке инициализации
   */
  public async startRecording(): Promise<void> {
    if (this.recording) {
      throw new Error("Запись уже активна");
    }

    const file = fs.createWriteStream(this.audioName, {
      encoding: "binary",
    });

    // Инициализируем захват аудио
    this.recording = record.record({
      sampleRate: this.options.sampleRate,
      channels: this.options.channels,
      device: this.options.device,
      encoding: "signed-16-le",
    });

    // Проверяем, что writer не null перед pipe()
    if (this.recording) {
      console.log(this.recording);
      // @ts-ignore
      this.recording.stream().pipe(file);
    } else {
      throw new Error("Не удалось подключить потоки записи");
    }

    // this.recording.on("error", (err) => {
    //   console.error("[AudioRecorder] Ошибка записи:", err.message);
    //   this.stopRecording();
    // });

    console.log(`Запись начата. Файл: ${this.audioName}`);
  }

  /**
   * Остановить запись
   * @returns Путь к сохранённому файлу или null, если запись не велась
   */
  public stopRecording() {
    if (!this.recording) {
      console.warn("[AudioRecorder] Запись не была начата");
      return null;
    }

    try {
      // @ts-ignore
      this.recording.stop();

      console.log(`Запись остановлена. Файл сохранён: ${this.audioName}`);

      // Освобождаем ресурсы
      this.recording = null;
    } catch (error) {
      console.error("[AudioRecorder] Ошибка при остановке:", error);
      return null;
    }
  }

  /**
   * Проверить существование файла
   * @param filePath Путь к файлу
   * @returns true, если файл существует
   */
  public fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Преобразовать аудио в текст через Whisper (Docker)
   * @param audioFilePath Путь к аудиофайлу (если не указан — берёт последний записанный)
   * @param language Язык распознавания (напр., 'it' для итальянского)
   * @returns Путь к TXT‑файлу или null при ошибке
   */
  public async transcribeAudio(
    language: string = "it",
  ): Promise<string | null> {
    const inputFile = this.audioName;

    if (!this.fileExists(inputFile)) {
      console.error(`[AudioRecorder] Аудиофайл не найден: ${inputFile}`);
      return null;
    }

    try {
      console.log(
        `[AudioRecorder] Начинаю распознавание: ${inputFile} (язык: ${language})`,
      );

      // Формируем команду Docker
      // --output_dir не указываем: Whisper сохранит рядом с входным файлом
      const command = `
        docker compose run --rm whisper-cpu whisper \\
          "${this.options.filename}.wav" \\
          --model turbo \\
          --language ${language} \\
          --output_format txt
      `;

      const { stdout, stderr } = await execPromise(command);

      console.log("[AudioRecorder] Распознавание завершено:", stdout);

      // Генерируем путь к TXT‑файлу (та же директория, то же имя, .txt)
      const txtPath = inputFile.replace(/\.\w+$/, ".txt");

      if (this.fileExists(txtPath)) {
        console.log(`[AudioRecorder] Текст сохранён: ${txtPath}`);
        return txtPath;
      } else {
        console.warn(
          "[AudioRecorder] TXT‑файл не найден (возможно, ошибка Whisper)",
        );
        return null;
      }
    } catch (error) {
      console.error("[AudioRecorder] Ошибка распознавания:", error);
      return null;
    }
  }

  /**
   * Прочитать текст из транскрипционного файла
   * @param txtFilePath Путь к TXT‑файлу (если не указан — использует путь по умолчанию)
   * @returns Текст из файла или null при ошибке
   */
  public readTranscription(txtFilePath?: string): string | null {
    try {
      if (!this.fileExists(this.textName)) {
        console.warn(
          `[AudioRecorder] Файл транскрипции не найден: ${this.textName}`,
        );
        return null;
      }

      const text = fs.readFileSync(this.textName, "utf-8");
      console.log(`[AudioRecorder] Транскрипция прочитана: ${this.textName}`);
      return text;
    } catch (error) {
      console.error(
        `[AudioRecorder] Ошибка чтения файла ${this.textName}:`,
        error,
      );
      return null;
    }
  }
}

export default AudioRecorder;
