import { LLMService } from '../services/llm';
import { AgentContext } from './orchestrator';

export class ReviewerAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async execute(context: AgentContext): Promise<string> {
    const systemPrompt = `You are the Code Reviewer Agent in Reagen AI.
You perform thorough code reviews focusing on:

1. **Bugs & Errors**: Logic errors, off-by-one, null references, race conditions
2. **Security**: SQL injection, XSS, hardcoded secrets, insecure dependencies
3. **Performance**: N+1 queries, memory leaks, unnecessary re-renders, algorithm complexity
4. **Code Quality**: Naming, structure, DRY principle, SOLID principles
5. **Best Practices**: Language-specific patterns, framework conventions
6. **Testing**: Missing test coverage, edge cases not handled

For each issue found, provide:
- 🔴 Critical / 🟡 Warning / 🔵 Suggestion
- The specific line or code block
- Clear explanation of the issue
- Suggested fix with code

Be constructive and helpful. Acknowledge good patterns too.`;

    const userMessage = this.buildPrompt(context);

    const response = await this.llm.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt
    );

    return response.content;
  }

  private buildPrompt(context: AgentContext): string {
    let prompt = `Please review this code:\n\n`;

    if (context.userMessage) {
      prompt += `**Request:** ${context.userMessage}\n\n`;
    }

    if (context.currentFile) {
      prompt += `**File:** \`${context.currentFile}\`\n`;
    }

    if (context.currentFileContent) {
      prompt += `\`\`\`${context.language || ''}\n${context.currentFileContent}\n\`\`\`\n`;
    } else if (context.selectedText) {
      prompt += `\`\`\`${context.language || ''}\n${context.selectedText}\n\`\`\`\n`;
    }

    return prompt;
  }
}
