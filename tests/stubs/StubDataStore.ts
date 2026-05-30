import { DataStore } from '../../src/services/interfaces/DataStore';

export class StubDataStore implements DataStore {
  private memory: Map<string, Record<string, any>[]> = new Map();
  private batchIds: Map<string, string> = new Map();

  async getAll(collection: string): Promise<Record<string, any>[]> {
    return this.memory.get(collection) || [];
  }

  async saveAll(
    collection: string,
    data: Record<string, any>[]
  ): Promise<{ success: boolean; batchId: string }> {
    const existing = this.memory.get(collection) || [];
    this.memory.set(collection, existing.concat(data));
    const batchId = `batch_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.batchIds.set(collection, batchId);
    return { success: true, batchId };
  }

  async ensureExists(collection: string, schema: string[]): Promise<void> {
    // no-op
  }

  async getLastBatchId(collection: string): Promise<string | null> {
    return this.batchIds.get(collection) || null;
  }

  seed(collection: string, data: Record<string, any>[]): void {
    const existing = this.memory.get(collection) || [];
    this.memory.set(collection, existing.concat(data));
  }

  reset() {
    this.memory.clear();
    this.batchIds.clear();
  }
}
