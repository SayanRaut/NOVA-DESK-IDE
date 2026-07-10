import { LLMService } from '../services/llm';
import { MemoryStore } from '../services/memoryStore';
import { AgentContext } from './orchestrator';

export class MemoryAgent {
  private llm: LLMService;
  private memoryStore: MemoryStore;

  constructor(llm: LLMService, memoryStore: MemoryStore) {
    this.llm = llm;
    this.memoryStore = memoryStore;
  }

  async execute(context: AgentContext): Promise<string> {
    // Get conversation summary for context
    const conversationSummary = this.memoryStore.getConversationSummary();

    const projectMemory = context.projectPath
      ? this.memoryStore.getProjectMemory(context.projectPath)
      : undefined;

    const systemPrompt = `You are the Memory Agent in Reagen AI.
You help recall and manage conversation context:

- Remember what was discussed previously
- Recall decisions and preferences
- Track ongoing tasks and their status
- Remember project-specific patterns and conventions

## Previous Conversation Summary
${conversationSummary}

${
  projectMemory
    ? `## Project Memory
- Path: ${projectMemory.projectPath}
- Summary: ${projectMemory.summary}
- Tech Stack: ${projectMemory.techStack.join(', ')}
- Key Files: ${projectMemory.keyFiles.join(', ')}
`
    : ''
}

Use this context to provide relevant, contextual responses.
If the user asks about something discussed earlier, reference the specific conversation.`;

    const response = await this.llm.chat(
      [{ role: 'user', content: context.userMessage }],
      systemPrompt
    );

    return response.content;
  }
}
