import { LLMService } from '../services/llm';
import { AgentContext } from './orchestrator';

export class SearchAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async execute(context: AgentContext): Promise<string> {
    const systemPrompt = `You are the Search Agent in Reagen AI.
You help users search and navigate their codebase:

- Find functions, classes, variables by description
- Locate where specific logic is implemented
- Find files related to a feature
- Search for patterns and usage examples
- Identify dependencies between components

When presenting search results:
- Show file path and line numbers
- Include relevant code snippets
- Explain the relevance of each result
- Sort by relevance

Note: In the future, this agent will use vector embeddings for semantic search.
For now, provide your best analysis based on available context.`;

    const response = await this.llm.chat(
      [{ role: 'user', content: context.userMessage }],
      systemPrompt
    );

    return response.content;
  }
}
