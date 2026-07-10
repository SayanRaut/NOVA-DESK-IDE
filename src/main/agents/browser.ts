import { LLMService } from '../services/llm';
import { AgentContext } from './orchestrator';

export class BrowserAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async execute(context: AgentContext): Promise<string> {
    const systemPrompt = `You are the Browser Agent in Reagen AI.
You help users find information from documentation and the web:

- Look up API documentation
- Find code examples and tutorials
- Research libraries and packages
- Answer technical questions using your knowledge
- Explain framework-specific patterns

When providing information:
- Cite sources when referencing specific documentation
- Include code examples where relevant
- Note the version of libraries/frameworks you're referencing
- Distinguish between official docs and community resources

Always provide practical, actionable information.`;

    const response = await this.llm.chat(
      [{ role: 'user', content: context.userMessage }],
      systemPrompt
    );

    return response.content;
  }
}
