import { FileStorage } from '../services/interfaces/FileStorage';
import { PipelineContext } from './PipelineContext';

export abstract class Cleaner {
  readonly role = 'cleaner';
  abstract readonly name: string;

  constructor(protected readonly fileStorage: FileStorage) {}

  abstract execute(context: PipelineContext): Promise<PipelineContext>;
}
