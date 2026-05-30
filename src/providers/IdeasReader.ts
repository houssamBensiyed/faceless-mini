import { Provider } from '../pwt/Provider';
import { PipelineContext } from '../pwt/PipelineContext';

export class IdeasReader extends Provider {
  readonly name = 'IdeasReader';

  async execute(context: PipelineContext): Promise<PipelineContext> {
    await this.dataStore.ensureExists("ideas", [
      "id",
      "title",
      "status",
      "batchId",
      "ideaContent",
      "script",
      "score"
    ]);
    
    const ideas = await this.dataStore.getAll("ideas");
    
    // Deep copy result using structuredClone
    context.tempLocalIdeas = structuredClone(ideas || []);
    
    return context;
  }
}
