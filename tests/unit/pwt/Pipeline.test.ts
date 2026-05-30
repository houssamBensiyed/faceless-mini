import { Pipeline } from '../../../src/pwt/Pipeline';
import { Provider } from '../../../src/pwt/Provider';
import { Worker } from '../../../src/pwt/Worker';
import { Transformer } from '../../../src/pwt/Transformer';
import { Cleaner } from '../../../src/pwt/Cleaner';
import { PipelineContext, createInitialContext } from '../../../src/pwt/PipelineContext';
import { callAIWithRetry } from '../../../src/utils/retry';
import { AIService } from '../../../src/services/interfaces/AIService';
import { DataStore } from '../../../src/services/interfaces/DataStore';
import { FileStorage } from '../../../src/services/interfaces/FileStorage';
import { log } from '../../../src/utils/logger';

// Mock logger to prevent actual console outputs during tests
jest.mock('../../../src/utils/logger', () => ({
  log: jest.fn(),
}));

describe('Pipeline Sequential Runner', () => {
  let mockDataStore: jest.Mocked<DataStore>;
  let mockAIService: jest.Mocked<AIService>;
  let mockFileStorage: jest.Mocked<FileStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataStore = {} as any;
    mockAIService = {} as any;
    mockFileStorage = {} as any;
  });

  // Mock stage classes
  class StepA extends Provider {
    readonly name = 'StepA';
    async execute(context: PipelineContext): Promise<PipelineContext> {
      return {
        ...context,
        tempLocalIdeas: [...context.tempLocalIdeas, { id: 'A', title: 'Idea A' }],
      };
    }
  }

  class StepB extends Worker {
    readonly name = 'StepB';
    async execute(context: PipelineContext): Promise<PipelineContext> {
      return {
        ...context,
        rawIdeasText: 'Response B',
      };
    }
  }

  class StepC extends Transformer {
    readonly name = 'StepC';
    async execute(context: PipelineContext): Promise<PipelineContext> {
      return {
        ...context,
        currentScore: 9.0,
      };
    }
  }

  class AsyncStep extends Cleaner {
    readonly name = 'AsyncStep';
    private delayMs: number;
    constructor(fileStorage: FileStorage, delayMs: number) {
      super(fileStorage);
      this.delayMs = delayMs;
    }
    async execute(context: PipelineContext): Promise<PipelineContext> {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      return {
        ...context,
        batchId: 'processed_batch',
      };
    }
  }

  class ThrowingStep extends Transformer {
    readonly name = 'ThrowingStep';
    async execute(context: PipelineContext): Promise<PipelineContext> {
      throw new Error('Something went wrong in StepC');
    }
  }

  it('runs stages in order and passes context from one stage to the next', async () => {
    const pipeline = new Pipeline();
    pipeline.addStage(new StepA(mockDataStore));
    pipeline.addStage(new StepB(mockAIService));
    pipeline.addStage(new StepC());

    const context = createInitialContext('run-123', 'pattern-abc');
    const result = await pipeline.run(context);

    expect(result.status).toBe('completed');
    expect(result.context.tempLocalIdeas).toEqual([{ id: 'A', title: 'Idea A' }]);
    expect(result.context.rawIdeasText).toBe('Response B');
    expect(result.context.currentScore).toBe(9.0);
  });

  it('rejects concurrent pipeline runs', async () => {
    const pipeline = new Pipeline();
    pipeline.addStage(new AsyncStep(mockFileStorage, 100));

    const context = createInitialContext('run-123', 'pattern-abc');

    const runPromise = pipeline.run(context);

    // Verify isRunning is true
    expect(pipeline.isRunning()).toBe(true);

    // Attempt to run concurrently
    await expect(pipeline.run(context)).rejects.toThrow('Pipeline already running');

    // Wait for the original pipeline to complete
    const result = await runPromise;
    expect(result.status).toBe('completed');
    expect(pipeline.isRunning()).toBe(false);
  });

  it('returns failed status and keeps running as false when a stage throws', async () => {
    const pipeline = new Pipeline();
    pipeline.addStage(new StepA(mockDataStore));
    pipeline.addStage(new ThrowingStep());

    const context = createInitialContext('run-123', 'pattern-abc');
    const result = await pipeline.run(context);

    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).toBe('Something went wrong in StepC');
    }
    expect(pipeline.isRunning()).toBe(false);
    // Context contains modifications made before the throw
    expect(result.context.tempLocalIdeas).toEqual([{ id: 'A', title: 'Idea A' }]);
  });

  it('logs stage name and role for each stage (start and done)', async () => {
    const pipeline = new Pipeline();
    pipeline.addStage(new StepA(mockDataStore));
    pipeline.addStage(new StepC());

    const context = createInitialContext('run-123', 'pattern-abc');
    await pipeline.run(context);

    // We expect log calls for each stage's started and done
    expect(log).toHaveBeenCalledWith('[PROVIDER] StepA — started', 'info');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[PROVIDER] StepA — done'), 'info');
    expect(log).toHaveBeenCalledWith('[TRANSFORMER] StepC — started', 'info');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[TRANSFORMER] StepC — done'), 'info');
  });
});

describe('callAIWithRetry Utility', () => {
  let mockAI: jest.Mocked<AIService>;

  beforeEach(() => {
    mockAI = {
      generate: jest.fn(),
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('succeeds on the first try', async () => {
    mockAI.generate.mockResolvedValue('First try success');

    const resultPromise = callAIWithRetry(mockAI, 'prompt', 'system');
    const result = await resultPromise;

    expect(result).toBe('First try success');
    expect(mockAI.generate).toHaveBeenCalledTimes(1);
    expect(mockAI.generate).toHaveBeenCalledWith('prompt', 'system');
  });

  it('retries and succeeds on the second try with 1s exponential backoff', async () => {
    mockAI.generate
      .mockRejectedValueOnce(new Error('Rate Limit Error'))
      .mockResolvedValueOnce('Second try success');

    const resultPromise = callAIWithRetry(mockAI, 'prompt');

    // Run first try which fails. We then have a pending timer for 1s.
    await Promise.resolve(); // Allow pending microtasks to execute
    expect(mockAI.generate).toHaveBeenCalledTimes(1);

    // Fast forward 1 second (1000ms)
    jest.advanceTimersByTime(1000);

    // Wait for the second call to execute and resolve
    const result = await resultPromise;

    expect(result).toBe('Second try success');
    expect(mockAI.generate).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries are exhausted (total 4 attempts when maxRetries is 3)', async () => {
    const aiError = new Error('Persistent Failure');
    mockAI.generate.mockRejectedValue(aiError);

    const flushMicrotasks = async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    };

    const resultPromise = callAIWithRetry(mockAI, 'prompt', undefined, 3);

    // Initial try (fails, schedules 1s backoff)
    await flushMicrotasks();
    expect(mockAI.generate).toHaveBeenCalledTimes(1);

    // 1st retry (fails, schedules 2s backoff)
    jest.advanceTimersByTime(1000);
    await flushMicrotasks();
    expect(mockAI.generate).toHaveBeenCalledTimes(2);

    // 2nd retry (fails, schedules 4s backoff)
    jest.advanceTimersByTime(2000);
    await flushMicrotasks();
    expect(mockAI.generate).toHaveBeenCalledTimes(3);

    // 3rd retry (fails, exhausts maxRetries and throws)
    jest.advanceTimersByTime(4000);
    await flushMicrotasks();

    await expect(resultPromise).rejects.toThrow('Persistent Failure');
    expect(mockAI.generate).toHaveBeenCalledTimes(4); // 1 initial + 3 retries = 4 attempts
  });
});
