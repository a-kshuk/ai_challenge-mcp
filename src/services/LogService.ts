import fs from "fs/promises";
import path from "path";

type LogEntry = {
  id: string;
  text: string;
  timestamp: string;
};

export class LogService {
  private filePath: string;

  constructor() {
    this.filePath = path.resolve(process.cwd(), "logs/logs.json");
  }

  private async loadLogs(): Promise<LogEntry[]> {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(data) as LogEntry[];
    } catch {
      return [];
    }
  }

  private async saveLogs(emails: LogEntry[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(emails, null, 2), "utf-8");
  }

  async saveLog(text: string): Promise<void> {
    const logs = await this.loadLogs();
    const newEntry: LogEntry = {
      id: crypto.randomUUID(),
      text,
      timestamp: new Date().toISOString(),
    };
    logs.push(newEntry);
    await this.saveLogs(logs);
  }
}
