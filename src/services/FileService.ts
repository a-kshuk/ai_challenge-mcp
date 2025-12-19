import fs from "fs/promises";
import path from "path";

export class FileService {
  private filePath: string;

  constructor() {
    this.filePath = path.resolve(process.cwd(), "logs/text.md");
  }

  async saveFile(text: string): Promise<void> {
    await fs.writeFile(this.filePath, text, "utf-8");
  }
}
