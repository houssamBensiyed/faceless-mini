import { FileStorage } from '../../src/services/interfaces/FileStorage';

export class StubFileStorage implements FileStorage {
  // Map of folder -> Map of filename -> content
  private memory: Map<string, Map<string, string>> = new Map();

  public async writeFile(folder: string, filename: string, content: string): Promise<string> {
    if (!this.memory.has(folder)) {
      this.memory.set(folder, new Map());
    }
    this.memory.get(folder)!.set(filename, content);
    return filename;
  }

  public seed(folder: string, filename: string, content: string): void {
    if (!this.memory.has(folder)) {
      this.memory.set(folder, new Map());
    }
    this.memory.get(folder)!.set(filename, content);
  }

  public getFile(folder: string, filename: string): string | undefined {
    return this.memory.get(folder)?.get(filename);
  }

  public async readFile(folder: string, filename: string): Promise<string> {
    const folderFiles = this.memory.get(folder);
    if (!folderFiles || !folderFiles.has(filename)) {
      throw new Error(`File ${filename} not found in folder ${folder}`);
    }
    return folderFiles.get(filename)!;
  }

  public async deleteFolder(folder: string): Promise<void> {
    // Idempotent on missing folders
    this.memory.delete(folder);
  }

  public async moveFolder(source: string, destination: string): Promise<void> {
    if (!this.memory.has(source)) {
      // Idempotent/silent on missing folders as per some interpretations, 
      // but let's just do nothing if source doesn't exist
      return;
    }

    const sourceFiles = this.memory.get(source)!;
    
    if (!this.memory.has(destination)) {
      this.memory.set(destination, new Map());
    }

    const destFiles = this.memory.get(destination)!;
    for (const [filename, content] of sourceFiles.entries()) {
      destFiles.set(filename, content);
    }

    this.memory.delete(source);
  }

  public async listFiles(folder: string): Promise<string[]> {
    if (!this.memory.has(folder)) {
      return [];
    }
    return Array.from(this.memory.get(folder)!.keys());
  }

  public async folderExists(folder: string): Promise<boolean> {
    return this.memory.has(folder);
  }

  public reset(): void {
    this.memory.clear();
  }
}
