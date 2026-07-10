import { LLMService } from '../services/llm';
import { AgentContext } from './orchestrator';

export class ContextAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async execute(context: AgentContext): Promise<string> {
    const systemPrompt = `You are the Context Agent in Reagen AI.
You help understand project structure and context:

- Analyze project architecture and file organization
- Identify tech stack and dependencies
- Map relationships between components
- Understand data flow and state management
- Provide project-level insights

When analyzing a project:
- Identify the framework/language being used
- Note the project structure pattern (MVC, etc.)
- List key configuration files
- Identify entry points and main modules
- Note testing setup if present

Present your analysis in a structured, readable format.`;

    const response = await this.llm.chat(
      [{ role: 'user', content: context.userMessage }],
      systemPrompt
    );

    return response.content;
  }
}
