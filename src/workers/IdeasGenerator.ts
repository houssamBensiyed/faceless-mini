import { Worker } from '../pwt/Worker';
import { PipelineContext } from '../pwt/PipelineContext';
import { callAIWithRetry } from '../utils/retry';
import { buildIdeasGeneratorPrompt } from '../prompts/ideas-generator';

export class IdeasGenerator extends Worker {
  readonly name = 'IdeasGenerator';

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.tempLocalIdeas) {
      throw new Error('tempLocalIdeas is missing from context');
    }

    const { prompt, systemPrompt } = buildIdeasGeneratorPrompt(context.tempLocalIdeas);

    const rawIdeasText = await callAIWithRetry(this.ai, prompt, systemPrompt);

    context.rawIdeasText = rawIdeasText;

    return context;
  }
}
