import { AIService } from '../../src/services/interfaces/AIService';

export class StubAIService implements AIService {
  public calls: { prompt: string; systemPrompt?: string; response: string }[] = [];
  public responses: { keyword: string; response: string }[] = [];
  public defaultResponse: string = 'Default stub response';

  public async generate(prompt: string, systemPrompt?: string): Promise<string> {
    let chosenResponse = this.defaultResponse;

    for (const { keyword, response } of this.responses) {
      if (prompt.includes(keyword) || (systemPrompt && systemPrompt.includes(keyword))) {
        chosenResponse = response;
        break;
      }
    }

    this.calls.push({ prompt, systemPrompt, response: chosenResponse });
    return chosenResponse;
  }

  public whenPromptContains(keyword: string, response: string): void {
    this.responses.push({ keyword, response });
  }

  public getCalls(): { prompt: string; systemPrompt?: string; response: string }[] {
    return this.calls;
  }

  public reset(): void {
    this.calls = [];
    this.responses = [];
    this.defaultResponse = 'Default stub response';
  }
}
