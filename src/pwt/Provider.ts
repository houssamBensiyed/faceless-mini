import { DataStore } from '../services/interfaces/DataStore';
import { PipelineContext } from './PipelineContext';

export abstract class Provider {
  readonly role = 'provider';
  abstract readonly name: string;

  constructor(protected readonly dataStore: DataStore) {}

  abstract execute(context: PipelineContext): Promise<PipelineContext>;
}
