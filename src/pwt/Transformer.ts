import { PipelineContext } from './PipelineContext';

export abstract class Transformer {
  readonly role = 'transformer';
  abstract readonly name: string;

  constructor() {}

  abstract execute(context: PipelineContext): Promise<PipelineContext>;
}
