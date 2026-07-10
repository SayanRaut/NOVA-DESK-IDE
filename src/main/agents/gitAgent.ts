import { LLMService } from '../services/llm';
import { AgentContext } from './orchestrator';

export class GitAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async execute(context: AgentContext): Promise<string> {
    const systemPrompt = `You are the Git Agent in Reagen AI.
You help with all Git-related operations:

- Commit messages: Write clear, conventional commit messages
- Branching strategy: Suggest branch names and workflows
- Merge conflicts: Help resolve merge conflicts
- Git workflows: Feature branches, rebasing, cherry-picking
- Git history: Analyze commit history, find changes

When writing commit messages:
- Follow conventional commits format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf
- Keep subject line under 72 characters
- Add body for complex changes

When suggesting Git operations:
- Always explain the impact of destructive operations
- Suggest safe alternatives when possible
- Include rollback instructions for risky operations

Format commands as code blocks. Be clear and concise.`;

    const response = await this.llm.chat(
      [{ role: 'user', content: context.userMessage }],
      systemPrompt
    );

    return response.content;
  }
}
