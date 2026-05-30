export interface PipelineContext {
  tempLocalIdeas: Record<string, any>[];
  rawIdeasText: string;
  internalIdeasArray: Record<string, any>[];
  ideasToWrite: Record<string, any>[];
  currentIdeaObject: Record<string, any> | null;
  currentScriptText: string;
  currentRawRankResponse: string;
  currentScore: number;
  pattern: string;
  batchId: string;
  pipelineRunId: string;
}

export function createInitialContext(
  pipelineRunId: string,
  pattern: string
): PipelineContext {
  return {
    tempLocalIdeas: [],
    rawIdeasText: "",
    internalIdeasArray: [],
    ideasToWrite: [],
    currentIdeaObject: null,
    currentScriptText: "",
    currentRawRankResponse: "",
    currentScore: 0,
    pattern: pattern,
    batchId: "",
    pipelineRunId: pipelineRunId,
  };
}
