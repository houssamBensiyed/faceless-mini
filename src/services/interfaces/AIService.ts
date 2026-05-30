export interface AIService {
  generate(prompt: string, systemPrompt?: string): Promise<string>;
}
