import { IdeasGenerator } from '../../../src/workers/IdeasGenerator';
import { StubAIService } from '../../stubs/StubAIService';
import { createInitialContext } from '../../../src/pwt/PipelineContext';

describe('IdeasGenerator', () => {
  let worker: IdeasGenerator;
  let aiService: StubAIService;

  beforeEach(() => {
    aiService = new StubAIService();
    worker = new IdeasGenerator(aiService);
  });

  it('sends ideas to AI and sets rawIdeasText', async () => {
    const context = createInitialContext('run-1', 'pattern');
    context.tempLocalIdeas = [
      { title: 'Idea 1' },
      { title: 'Idea 2' }
    ];

    aiService.defaultResponse = '1. Idea 3: New idea\n2. Idea 4: Another new idea';

    await worker.execute(context);

    expect(context.rawIdeasText).toBe('1. Idea 3: New idea\n2. Idea 4: Another new idea');
    
    const calls = aiService.getCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].prompt).toContain('Idea 1');
    expect(calls[0].prompt).toContain('Idea 2');
  });

  it('works with empty tempLocalIdeas (first run)', async () => {
    const context = createInitialContext('run-1', 'pattern');
    context.tempLocalIdeas = [];

    aiService.defaultResponse = '1. Idea 1: First idea ever';

    await worker.execute(context);

    expect(context.rawIdeasText).toBe('1. Idea 1: First idea ever');
    
    const calls = aiService.getCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].prompt).not.toContain('Do not duplicate');
  });

  it('throws if tempLocalIdeas is missing', async () => {
    const context = createInitialContext('run-1', 'pattern');
    (context as any).tempLocalIdeas = undefined;

    await expect(worker.execute(context)).rejects.toThrow('tempLocalIdeas is missing from context');
  });
});
