import { AIService } from '../../src/services/interfaces/AIService';

export class StubAIService implements AIService {
  private responses: Map<string, string> = new Map();
  private calls: Array<{ prompt: string; systemPrompt?: string; response: string }> = [];

  whenPromptContains(keyword: string, response: string): void {
    this.responses.set(keyword, response);
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    let matchedResponse = "Default stub response";
    for (const [keyword, response] of this.responses.entries()) {
      if (prompt.includes(keyword)) {
        matchedResponse = response;
        break;
      }
    }

    this.calls.push({ prompt, systemPrompt, response: matchedResponse });
    return matchedResponse;
  }

  getCalls() {
    return this.calls;
  }

  reset() {
    this.responses.clear();
    this.calls = [];
  }
}
