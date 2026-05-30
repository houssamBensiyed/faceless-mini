import { DataStore } from '../../src/services/interfaces/DataStore';

export class StubDataStore implements DataStore {
  private data: Record<string, Record<string, any>[]> = {};
  private schemas: Record<string, string[]> = {};
  private lastBatchIds: Record<string, string> = {};
  public batchCounter = 0;

  public async getAll(collection: string): Promise<Record<string, any>[]> {
    return this.data[collection] || [];
  }

  public seed(collection: string, items: Record<string, any>[]): void {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    this.data[collection] = [...this.data[collection], ...items];
  }

  public async saveAll(
    collection: string,
    data: Record<string, any>[]
  ): Promise<{ success: boolean; batchId: string }> {
    this.batchCounter++;
    const batchId = `batch-${this.batchCounter}`;
    
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    this.data[collection] = [...this.data[collection], ...data];
    this.lastBatchIds[collection] = batchId;

    return { success: true, batchId };
  }

  public async ensureExists(collection: string, schema: string[]): Promise<void> {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    this.schemas[collection] = schema;
  }

  public async getLastBatchId(collection: string): Promise<string | null> {
    return this.lastBatchIds[collection] || null;
  }

  public reset(): void {
    this.data = {};
    this.schemas = {};
    this.lastBatchIds = {};
    this.batchCounter = 0;
  }
}
