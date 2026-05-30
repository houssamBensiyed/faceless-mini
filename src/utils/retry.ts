import { AIService } from '../services/interfaces/AIService';

export async function callAIWithRetry(
  ai: AIService,
  prompt: string,
  systemPrompt?: string,
  maxRetries: number = 3
): Promise<string> {
  let attempt = 0;
  while (true) {
    try {
      return await ai.generate(prompt, systemPrompt);
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s backoff
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
