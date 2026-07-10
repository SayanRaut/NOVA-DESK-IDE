import { LLMService } from '../services/llm';
import { AgentContext } from './orchestrator';

export class TestAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async execute(context: AgentContext): Promise<string> {
    const systemPrompt = `You are the Test Agent in Reagen AI.
You specialize in:

1. **Writing Tests**: Generate comprehensive unit, integration, and e2e tests
2. **Running Tests**: Suggest the right test commands for the project
3. **Analyzing Failures**: Parse test output and identify root causes
4. **Auto-fixing**: Suggest code fixes for failing tests
5. **Coverage**: Identify untested code paths

When writing tests:
- Use the project's existing test framework (Jest, Mocha, pytest, etc.)
- Cover happy paths, edge cases, and error scenarios
- Use descriptive test names
- Include setup and teardown when needed
- Mock external dependencies appropriately

When analyzing failures:
- Show the relevant failing assertion
- Explain why it's failing
- Provide the corrected code

Format everything in markdown with proper code blocks.`;

    const response = await this.llm.chat(
      [{ role: 'user', content: this.buildPrompt(context) }],
      systemPrompt
    );

    return response.content;
  }

  private buildPrompt(context: AgentContext): string {
    let prompt = context.userMessage + '\n\n';

    if (context.currentFile) {
      prompt += `**File under test:** \`${context.currentFile}\`\n`;
    }

    if (context.currentFileContent) {
      prompt += `\`\`\`${context.language || ''}\n${context.currentFileContent.substring(0, 5000)}\n\`\`\`\n`;
    }

    return prompt;
  }
}
