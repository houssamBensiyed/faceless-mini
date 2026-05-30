import { AIService } from '../services/interfaces/AIService';
import { PipelineContext } from './PipelineContext';

export abstract class Worker {
  readonly role = 'worker';
  abstract readonly name: string;

  constructor(protected readonly ai: AIService) {}

  abstract execute(context: PipelineContext): Promise<PipelineContext>;
}
