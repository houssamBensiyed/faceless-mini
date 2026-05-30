import { FileStorage } from '../services/interfaces/FileStorage';

export async function resolveScript(
  fileStorage: FileStorage,
  scriptId: string
): Promise<string> {
  try {
    // Check prod first
    return await fileStorage.readFile('prod', scriptId);
  } catch (error) {
    try {
      // Fallback to dev
      return await fileStorage.readFile('dev', scriptId);
    } catch (innerError) {
      // If missing from both, throw custom error
      throw new Error("Script not found");
    }
  }
}
