import { AIService } from '../services/interfaces/AIService';
import { PipelineContext } from './PipelineContext';

/**
 * AITransformer Base Class
 *
 * EXCEPTION RULE JUSTIFICATION:
 * Typically, Transformers are pure data-reshaping units that have zero external dependencies
 * and never call AI. However, the Score Parser is an exception to this rule.
 *
 * The raw ranking response from the AI is unstructured natural language. Extracting a numeric
 * score solely with regular expressions is brittle and highly susceptible to breaking if the LLM
 * shifts its response format. Using a highly-focused AI prompt to extract the numeric score is
 * the most robust and reliable approach.
 *
 * Therefore, AITransformer exists ONLY to support the Score Parser, providing it access to the
 * AIService while retaining its semantic classification as a 'transformer' role in the pipeline.
 */
export abstract class AITransformer {
  readonly role = 'transformer';
  abstract readonly name: string;

  constructor(protected readonly ai: AIService) {}

  abstract execute(context: PipelineContext): Promise<PipelineContext>;
}
