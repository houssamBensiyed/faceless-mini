import { Provider } from './Provider';
import { Worker } from './Worker';
import { Transformer } from './Transformer';
import { AITransformer } from './AITransformer';
import { Cleaner } from './Cleaner';
import { PipelineContext } from './PipelineContext';
import { log } from '../utils/logger';

export type PwtComponent = Provider | Worker | Transformer | AITransformer | Cleaner;

export class Pipeline {
  private stages: PwtComponent[] = [];
  private running: boolean = false;

  addStage(stage: PwtComponent): void {
    this.stages.push(stage);
  }

  async run(context: PipelineContext): Promise<
    | { status: 'completed'; context: PipelineContext }
    | { status: 'failed'; error: string; context: PipelineContext }
  > {
    if (this.running) {
      throw new Error("Pipeline already running");
    }

    this.running = true;
    let currentContext = context;

    try {
      for (const stage of this.stages) {
        const roleUpper = stage.role.toUpperCase();
        log(`[${roleUpper}] ${stage.name} — started`, 'info');
        const startTime = Date.now();

        currentContext = await stage.execute(currentContext);

        const duration = Date.now() - startTime;
        log(`[${roleUpper}] ${stage.name} — done (${duration}ms)`, 'info');
      }

      this.running = false;
      return { status: 'completed', context: currentContext };
    } catch (error: any) {
      this.running = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { status: 'failed', error: errorMessage, context: currentContext };
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}
