import { LLMService } from '../services/llm';
import { AgentContext } from './orchestrator';

export class DocumentationAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async execute(context: AgentContext): Promise<string> {
    const systemPrompt = `You are the Documentation Agent in Reagen AI.
You specialize in generating high-quality documentation:

1. **README files**: Project overviews, installation, usage, API docs
2. **Inline docs**: JSDoc, docstrings, comments
3. **API documentation**: Endpoint descriptions, request/response schemas
4. **Architecture docs**: System design, data flow, component diagrams
5. **Changelogs**: Version history with categorized changes

When writing documentation:
- Be clear, concise, and complete
- Include code examples for every API/function
- Add tables for parameters, options, etc.
- Use proper markdown formatting
- Follow the project's existing documentation style

Generate documentation that developers will actually want to read.`;

    const response = await this.llm.chat(
      [{ role: 'user', content: this.buildPrompt(context) }],
      systemPrompt
    );

    return response.content;
  }

  private buildPrompt(context: AgentContext): string {
    let prompt = context.userMessage + '\n\n';

    if (context.currentFileContent) {
      prompt += `**Code to document:**\n\`\`\`${context.language || ''}\n${context.currentFileContent.substring(0, 5000)}\n\`\`\`\n`;
    }

    return prompt;
  }
}
