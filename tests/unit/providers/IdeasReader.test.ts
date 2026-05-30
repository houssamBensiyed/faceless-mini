import { IdeasReader } from '../../../src/providers/IdeasReader';
import { StubDataStore } from '../../stubs/StubDataStore';
import { createInitialContext, PipelineContext } from '../../../src/pwt/PipelineContext';

describe('IdeasReader Provider', () => {
  let dataStore: StubDataStore;
  let reader: IdeasReader;
  let context: PipelineContext;

  beforeEach(() => {
    dataStore = new StubDataStore();
    reader = new IdeasReader(dataStore);
    context = createInitialContext('run-id', 'pattern');
  });

  it('Reads ideas and sets tempLocalIdeas on context', async () => {
    dataStore.seed('ideas', [{ id: '1', title: 'Idea 1' }]);
    
    const result = await reader.execute(context);
    
    expect(result.tempLocalIdeas).toEqual([{ id: '1', title: 'Idea 1' }]);
  });

  it('Deep copies (mutating result doesn\'t affect stub data)', async () => {
    const originalIdea = { id: '1', title: 'Idea 1' };
    dataStore.seed('ideas', [originalIdea]);
    
    const result = await reader.execute(context);
    result.tempLocalIdeas[0].title = 'Modified Idea';
    
    const storedIdeas = await dataStore.getAll('ideas');
    expect(storedIdeas[0].title).toBe('Idea 1');
    expect(storedIdeas[0].title).not.toBe('Modified Idea');
  });

  it('Handles empty data store (returns empty array, not null)', async () => {
    const result = await reader.execute(context);
    expect(result.tempLocalIdeas).toEqual([]);
    expect(Array.isArray(result.tempLocalIdeas)).toBe(true);
  });

  it('Calls ensureExists before getAll', async () => {
    const ensureExistsSpy = jest.spyOn(dataStore, 'ensureExists');
    const getAllSpy = jest.spyOn(dataStore, 'getAll');
    
    await reader.execute(context);
    
    expect(ensureExistsSpy).toHaveBeenCalledWith('ideas', [
      'id', 'title', 'status', 'batchId', 'ideaContent', 'script', 'score'
    ]);
    expect(getAllSpy).toHaveBeenCalledWith('ideas');
    
    const ensureExistsCallOrder = ensureExistsSpy.mock.invocationCallOrder[0];
    const getAllCallOrder = getAllSpy.mock.invocationCallOrder[0];
    
    expect(ensureExistsCallOrder).toBeLessThan(getAllCallOrder);
  });

  it('Works with seeded data (3 ideas → 3 returned)', async () => {
    dataStore.seed('ideas', [
      { id: '1', title: 'A' },
      { id: '2', title: 'B' },
      { id: '3', title: 'C' }
    ]);
    
    const result = await reader.execute(context);
    expect(result.tempLocalIdeas).toHaveLength(3);
  });
});
