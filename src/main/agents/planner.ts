import { LLMService } from '../services/llm';
import { AgentContext } from './orchestrator';

export class PlannerAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async execute(context: AgentContext): Promise<string> {
    const systemPrompt = `You are the Planner Agent in Reagen AI, a multi-agent coding IDE.
Your role is to break down complex coding tasks into clear, actionable steps.

For each task, create a structured plan with:
1. A brief summary of the overall goal
2. Numbered steps with clear descriptions
3. Dependencies between steps
4. Files that need to be created or modified
5. Any potential risks or considerations

Be specific and technical. Include file paths, function names, and implementation details.
Format your plan in markdown for readability.`;

    const userMessage = this.buildPrompt(context);

    const response = await this.llm.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt
    );

    return response.content;
  }

  private buildPrompt(context: AgentContext): string {
    let prompt = `## Task\n${context.userMessage}\n\n`;

    if (context.projectPath) {
      prompt += `## Project\nPath: ${context.projectPath}\n\n`;
    }

    if (context.currentFile) {
      prompt += `## Current File\n${context.currentFile}\n`;
      if (context.currentFileContent) {
        prompt += `\`\`\`\n${context.currentFileContent.substring(0, 3000)}\n\`\`\`\n\n`;
      }
    }

    if (context.conversationHistory.length > 0) {
      prompt += `## Recent Conversation Context\n`;
      const recent = context.conversationHistory.slice(-6);
      for (const msg of recent) {
        prompt += `**${msg.role}**: ${msg.content.substring(0, 300)}\n`;
      }
    }

    prompt += `\nPlease create a detailed implementation plan for this task.`;
    return prompt;
  }
}
