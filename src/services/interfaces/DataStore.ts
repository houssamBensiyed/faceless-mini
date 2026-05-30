export interface DataStore {
  getAll(collection: string): Promise<Record<string, any>[]>;
  saveAll(
    collection: string,
    data: Record<string, any>[]
  ): Promise<{ success: boolean; batchId: string }>;
  ensureExists(collection: string, schema: string[]): Promise<void>;
  getLastBatchId(collection: string): Promise<string | null>;
}
