import { StubAIService } from '../../../tests/stubs/StubAIService';

describe('StubAIService', () => {
  let ai: StubAIService;

  beforeEach(() => {
    ai = new StubAIService();
  });

  it('returns default response when no keyword matches', async () => {
    const response = await ai.generate('hello');
    expect(response).toBe('Default stub response');
  });

  it('returns mapped response when keyword matches', async () => {
    ai.whenPromptContains('foo', 'bar');
    const response = await ai.generate('say foo please');
    expect(response).toBe('bar');
  });

  it('tracks all calls with getCalls', async () => {
    ai.whenPromptContains('test', 'success');
    await ai.generate('run test', 'system hint');
    const calls = ai.getCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ prompt: 'run test', systemPrompt: 'system hint', response: 'success' });
  });

  it('resets correctly', async () => {
    ai.whenPromptContains('foo', 'bar');
    await ai.generate('foo');
    ai.reset();
    expect(ai.getCalls()).toHaveLength(0);
    const response = await ai.generate('foo');
    expect(response).toBe('Default stub response');
  });
});
