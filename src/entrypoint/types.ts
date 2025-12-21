export interface AiEntryPoint<T = unknown> {
  run(): Promise<T> | void;
}
