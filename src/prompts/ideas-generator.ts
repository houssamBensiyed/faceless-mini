export function buildIdeasGeneratorPrompt(existingIdeas: Record<string, any>[]): { prompt: string, systemPrompt: string } {
  const titles = existingIdeas.map(idea => idea.title).filter(Boolean);
  
  const systemPrompt = "You are an expert content generator. Your task is to brainstorm new content ideas.";
  
  let prompt = "Please generate new, unique ideas. Provide them as a numbered list where each item has a title and a description.\n";
  
  if (titles.length > 0) {
    prompt += "\nDo not duplicate or create variations of the following existing ideas:\n";
    titles.forEach((title) => {
      prompt += `- ${title}\n`;
    });
  }
  
  return { prompt, systemPrompt };
}
