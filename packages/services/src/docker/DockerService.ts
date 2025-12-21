import Docker from "dockerode";

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker(); // Подключается к локальному демону Docker
  }

  /**
   * Запускает контейнер по имени образа
   * @param image Имя образа, например 'nginx:latest'
   * @param name Опциональное имя контейнера
   * @returns Идентификатор контейнера
   */
  async startContainer(image: string, name?: string): Promise<string> {
    const container = await this.docker.createContainer({
      Image: image,
      name,
      Tty: true,
    });

    await container.start();
    console.log(`Контейнер запущен с ID: ${container.id}`);
    return container.id;
  }

  /**
   * Получает список всех контейнеров (включая остановленные)
   * @returns Список контейнеров
   */
  async listContainers(): Promise<Docker.ContainerInfo[]> {
    const containers = await this.docker.listContainers({ all: true });
    return containers;
  }

  /**
   * Останавливает контейнер по ID
   * @param containerId ID контейнера
   */
  async stopContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.stop();
    console.log(`Контейнер ${containerId} остановлен`);
  }

  /**
   * Удаляет контейнер по ID
   * @param containerId ID контейнера
   */
  async removeContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.remove();
    console.log(`Контейнер ${containerId} удалён`);
  }

  /**
   * Получает логи контейнера
   * @param containerId ID контейнера
   * @returns Логи в виде строки
   */
  async getLogs(containerId: string): Promise<string> {
    const container = this.docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: false,
    });

    // Docker возвращает поток (Buffer), преобразуем в строку
    return Buffer.from(logs).toString("utf8");
  }
}
