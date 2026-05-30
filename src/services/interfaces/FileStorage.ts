export interface FileStorage {
  writeFile(folder: string, filename: string, content: string): Promise<string>;
  readFile(folder: string, filename: string): Promise<string>;
  deleteFolder(folder: string): Promise<void>;
  moveFolder(source: string, destination: string): Promise<void>;
  listFiles(folder: string): Promise<string[]>;
  folderExists(folder: string): Promise<boolean>;
}
