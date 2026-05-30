import { FileStorage } from '../../src/services/interfaces/FileStorage';

export class StubFileStorage implements FileStorage {
  private memory: Map<string, Map<string, string>> = new Map();

  async writeFile(folder: string, filename: string, content: string): Promise<string> {
    if (!this.memory.has(folder)) {
      this.memory.set(folder, new Map());
    }
    this.memory.get(folder)!.set(filename, content);
    return filename;
  }

  async readFile(folder: string, filename: string): Promise<string> {
    const folderMap = this.memory.get(folder);
    if (!folderMap || !folderMap.has(filename)) {
      throw new Error(`File ${filename} not found in folder ${folder}`);
    }
    return folderMap.get(filename)!;
  }

  async deleteFolder(folder: string): Promise<void> {
    this.memory.delete(folder);
  }

  async moveFolder(source: string, destination: string): Promise<void> {
    const sourceMap = this.memory.get(source);
    if (sourceMap) {
      this.memory.set(destination, new Map(sourceMap));
      this.memory.delete(source);
    }
  }

  async listFiles(folder: string): Promise<string[]> {
    const folderMap = this.memory.get(folder);
    if (!folderMap) return [];
    return Array.from(folderMap.keys());
  }

  async folderExists(folder: string): Promise<boolean> {
    return this.memory.has(folder);
  }

  seed(folder: string, filename: string, content: string): void {
    if (!this.memory.has(folder)) {
      this.memory.set(folder, new Map());
    }
    this.memory.get(folder)!.set(filename, content);
  }

  getFile(folder: string, filename: string): string | undefined {
    return this.memory.get(folder)?.get(filename);
  }

  reset() {
    this.memory.clear();
  }
}
