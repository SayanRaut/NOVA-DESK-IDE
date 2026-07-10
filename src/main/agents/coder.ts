import { LLMService } from '../services/llm';
import { AgentContext } from './orchestrator';

export class CoderAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async execute(context: AgentContext): Promise<string> {
    const systemPrompt = `You are the Coder Agent in Reagen AI, an advanced AI coding IDE.
You are an expert programmer who writes clean, efficient, well-documented code.

Your capabilities:
- Write new code from scratch in any language
- Edit and modify existing code
- Refactor code for better quality
- Fix bugs and errors
- Explain code clearly
- Generate code across multiple files

When generating code:
- Always include proper error handling
- Add clear comments for complex logic
- Follow the language's best practices and conventions
- Use meaningful variable/function names
- Consider edge cases

When editing code, clearly show what changed using markdown diff blocks.
When creating new files, specify the full file path and include complete, runnable code.

Format code in markdown code blocks with the appropriate language tag.`;

    const userMessage = this.buildPrompt(context);

    const response = await this.llm.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt
    );

    return response.content;
  }

  private buildPrompt(context: AgentContext): string {
    let prompt = `${context.userMessage}\n\n`;

    if (context.currentFile) {
      prompt += `**Current File:** \`${context.currentFile}\`\n`;
      if (context.language) {
        prompt += `**Language:** ${context.language}\n`;
      }
    }

    if (context.selectedText) {
      prompt += `\n**Selected Code:**\n\`\`\`\n${context.selectedText}\n\`\`\`\n`;
    }

    if (context.currentFileContent) {
      prompt += `\n**Full File Content:**\n\`\`\`\n${context.currentFileContent.substring(0, 6000)}\n\`\`\`\n`;
    }

    if (context.conversationHistory.length > 0) {
      const recent = context.conversationHistory.slice(-4);
      prompt += `\n**Previous context:**\n`;
      for (const msg of recent) {
        prompt += `${msg.role}: ${msg.content.substring(0, 500)}\n`;
      }
    }

    return prompt;
  }
}
