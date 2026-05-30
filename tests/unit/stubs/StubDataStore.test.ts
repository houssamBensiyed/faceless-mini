import { StubDataStore } from '../../../tests/stubs/StubDataStore';

describe('StubDataStore', () => {
  let store: StubDataStore;

  beforeEach(() => {
    store = new StubDataStore();
  });

  it('returns empty array when collection does not exist', async () => {
    const result = await store.getAll('missing');
    expect(result).toEqual([]);
  });

  it('saves and retrieves data', async () => {
    const { success, batchId } = await store.saveAll('users', [{ name: 'Alice' }]);
    expect(success).toBe(true);
    expect(batchId).toBeDefined();

    const data = await store.getAll('users');
    expect(data).toEqual([{ name: 'Alice' }]);

    const lastBatchId = await store.getLastBatchId('users');
    expect(lastBatchId).toBe(batchId);
  });

  it('seeds data correctly', async () => {
    store.seed('users', [{ name: 'Bob' }]);
    const data = await store.getAll('users');
    expect(data).toEqual([{ name: 'Bob' }]);
  });

  it('resets correctly', async () => {
    await store.saveAll('users', [{ name: 'Alice' }]);
    store.reset();
    const data = await store.getAll('users');
    expect(data).toEqual([]);
    const lastBatchId = await store.getLastBatchId('users');
    expect(lastBatchId).toBeNull();
  });

  it('ensureExists does nothing and does not throw', async () => {
    await expect(store.ensureExists('users', ['name'])).resolves.toBeUndefined();
  });
});
