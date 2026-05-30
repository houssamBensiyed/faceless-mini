import { StubFileStorage } from '../../../tests/stubs/StubFileStorage';

describe('StubFileStorage', () => {
  let storage: StubFileStorage;

  beforeEach(() => {
    storage = new StubFileStorage();
  });

  it('writes and reads a file', async () => {
    const filename = await storage.writeFile('docs', 'file.txt', 'hello world');
    expect(filename).toBe('file.txt');

    const content = await storage.readFile('docs', 'file.txt');
    expect(content).toBe('hello world');
  });

  it('throws when reading a missing file', async () => {
    await expect(storage.readFile('docs', 'missing.txt')).rejects.toThrow('File missing.txt not found in folder docs');
  });

  it('deletes a folder', async () => {
    await storage.writeFile('docs', 'file.txt', 'hello');
    await storage.deleteFolder('docs');
    const exists = await storage.folderExists('docs');
    expect(exists).toBe(false);
  });

  it('moves a folder', async () => {
    await storage.writeFile('source', 'file.txt', 'hello');
    await storage.moveFolder('source', 'dest');

    const existsSource = await storage.folderExists('source');
    expect(existsSource).toBe(false);

    const existsDest = await storage.folderExists('dest');
    expect(existsDest).toBe(true);

    const content = await storage.readFile('dest', 'file.txt');
    expect(content).toBe('hello');
  });

  it('lists files in a folder', async () => {
    await storage.writeFile('docs', 'file1.txt', 'a');
    await storage.writeFile('docs', 'file2.txt', 'b');
    const files = await storage.listFiles('docs');
    expect(files).toEqual(['file1.txt', 'file2.txt']);
  });

  it('returns empty array when listing missing folder', async () => {
    const files = await storage.listFiles('missing');
    expect(files).toEqual([]);
  });

  it('seeds data correctly and getFile works', () => {
    storage.seed('docs', 'seeded.txt', 'seeded data');
    const content = storage.getFile('docs', 'seeded.txt');
    expect(content).toBe('seeded data');
  });

  it('resets correctly', async () => {
    await storage.writeFile('docs', 'file.txt', 'hello');
    storage.reset();
    const exists = await storage.folderExists('docs');
    expect(exists).toBe(false);
  });
});
