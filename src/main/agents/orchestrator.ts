import { BrowserWindow } from 'electron';
import { LLMService, LLMMessage } from '../services/llm';
import { MemoryStore } from '../services/memoryStore';
import { ConfigStore } from '../services/configStore';
import { PlannerAgent } from './planner';
import { CoderAgent } from './coder';
import { ReviewerAgent } from './reviewer';
import { TerminalAgent } from './terminal';
import { TestAgent } from './testAgent';
import { GitAgent } from './gitAgent';
import { BrowserAgent } from './browser';
import { DocumentationAgent } from './documentation';
import { SearchAgent } from './search';
import { ContextAgent } from './context';
import { MemoryAgent } from './memory';

export interface AgentContext {
  userMessage: string;
  projectPath?: string;
  currentFile?: string;
  currentFileContent?: string;
  selectedText?: string;
  openFiles?: string[];
  language?: string;
  conversationHistory: LLMMessage[];
}

type AgentName =
  | 'orchestrator'
  | 'planner'
  | 'coder'
  | 'reviewer'
  | 'terminal'
  | 'test'
  | 'git'
  | 'browser'
  | 'documentation'
  | 'search'
  | 'context'
  | 'memory';

export class Orchestrator {
  private mainWindow: BrowserWindow;
  private llm: LLMService;
  private memoryStore: MemoryStore;
  private configStore: ConfigStore;
  private isCancelled = false;

  // Sub-agents
  private planner: PlannerAgent;
  private coder: CoderAgent;
  private reviewer: ReviewerAgent;
  private terminalAgent: TerminalAgent;
  private testAgent: TestAgent;
  private gitAgent: GitAgent;
  private browserAgent: BrowserAgent;
  private documentationAgent: DocumentationAgent;
  private searchAgent: SearchAgent;
  private contextAgent: ContextAgent;
  private memoryAgent: MemoryAgent;

  constructor(mainWindow: BrowserWindow, memoryStore: MemoryStore, configStore: ConfigStore) {
    this.mainWindow = mainWindow;
    this.memoryStore = memoryStore;
    this.configStore = configStore;
    this.llm = new LLMService(configStore);

    // Initialize all sub-agents
    this.planner = new PlannerAgent(this.llm);
    this.coder = new CoderAgent(this.llm);
    this.reviewer = new ReviewerAgent(this.llm);
    this.terminalAgent = new TerminalAgent(this.llm);
    this.testAgent = new TestAgent(this.llm);
    this.gitAgent = new GitAgent(this.llm);
    this.browserAgent = new BrowserAgent(this.llm);
    this.documentationAgent = new DocumentationAgent(this.llm);
    this.searchAgent = new SearchAgent(this.llm);
    this.contextAgent = new ContextAgent(this.llm);
    this.memoryAgent = new MemoryAgent(this.llm, this.memoryStore);
  }

  async processMessage(message: string, context?: any): Promise<void> {
    this.isCancelled = false;

    // Save user message
    this.memoryStore.addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    // Build conversation context
    const conversationHistory = this.memoryStore
      .getRecentContext(20)
      .map((c) => ({ role: c.role as 'user' | 'assistant' | 'system', content: c.content }));

    const agentContext: AgentContext = {
      userMessage: message,
      projectPath: context?.projectPath,
      currentFile: context?.currentFile,
      currentFileContent: context?.currentFileContent,
      selectedText: context?.selectedText,
      openFiles: context?.openFiles,
      language: context?.language,
      conversationHistory,
    };

    // Step 1: Route the request
    this.sendStatus('orchestrator', 'thinking', 'Analyzing your request...');

    const route = await this.routeRequest(message, agentContext);

    if (this.isCancelled) return;

    // Step 2: Execute the routed plan
    await this.executeRoute(route, agentContext);
  }

  private async routeRequest(
    message: string,
    context: AgentContext
  ): Promise<{ agents: AgentName[]; plan: string }> {
    const routingPrompt = `You are the Orchestrator of a multi-agent AI coding IDE called Reagen AI.
Your job is to analyze the user's request and determine which agents should handle it.

Available agents:
- planner: For complex tasks that need to be broken down into steps
- coder: For writing, editing, or generating code
- reviewer: For reviewing code quality, finding bugs
- terminal: For running shell commands, installing packages
- test: For running tests, fixing test failures
- git: For git operations (commit, branch, merge, etc.)
- browser: For browsing documentation or the web
- documentation: For generating docs, README files
- search: For searching the codebase semantically
- context: For understanding the project structure
- memory: For recalling previous conversations

User's message: "${message}"

${context.currentFile ? `Current file: ${context.currentFile}` : ''}
${context.language ? `Language: ${context.language}` : ''}
${context.projectPath ? `Project: ${context.projectPath}` : ''}

Respond with a JSON object:
{
  "agents": ["agent1", "agent2"],
  "plan": "Brief description of what to do"
}

Choose the minimal set of agents needed. For simple chat/questions, use ["coder"].
For complex multi-step tasks, include "planner" first.`;

    try {
      const response = await this.llm.chat(
        [{ role: 'user', content: routingPrompt }],
        'You are a task router. Always respond with valid JSON only, no markdown.'
      );

      // Parse the routing decision
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          agents: parsed.agents || ['coder'],
          plan: parsed.plan || 'Process the request',
        };
      }
    } catch (error) {
      console.error('Routing error:', error);
    }

    // Default: use coder agent
    return { agents: ['coder'], plan: 'Process the request directly' };
  }

  private async executeRoute(
    route: { agents: AgentName[]; plan: string },
    context: AgentContext
  ): Promise<void> {
    const responseId = Date.now().toString();
    let fullResponse = '';

    for (const agentName of route.agents) {
      if (this.isCancelled) return;

      this.sendStatus(agentName, 'working', `${agentName} is processing...`);

      try {
        const agentResponse = await this.executeAgent(agentName, context);

        if (this.isCancelled) return;

        fullResponse += agentResponse;

        // Stream the response
        this.mainWindow.webContents.send('ai:streamChunk', {
          id: responseId,
          content: agentResponse,
          agent: agentName,
          isComplete: agentName === route.agents[route.agents.length - 1],
        });

        this.sendStatus(agentName, 'complete', `${agentName} finished`);
      } catch (error: any) {
        this.sendStatus(agentName, 'error', error.message);
        fullResponse += `\n\n❌ ${agentName} error: ${error.message}`;
      }
    }

    // Save assistant response
    this.memoryStore.addMessage({
      id: responseId,
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now(),
      agent: route.agents.join(', '),
    });

    // Send final response
    this.mainWindow.webContents.send('ai:response', {
      id: responseId,
      content: fullResponse,
      agent: route.agents.join(', '),
      isComplete: true,
    });
  }

  private async executeAgent(agentName: AgentName, context: AgentContext): Promise<string> {
    switch (agentName) {
      case 'planner':
        return this.planner.execute(context);
      case 'coder':
        return this.coder.execute(context);
      case 'reviewer':
        return this.reviewer.execute(context);
      case 'terminal':
        return this.terminalAgent.execute(context);
      case 'test':
        return this.testAgent.execute(context);
      case 'git':
        return this.gitAgent.execute(context);
      case 'browser':
        return this.browserAgent.execute(context);
      case 'documentation':
        return this.documentationAgent.execute(context);
      case 'search':
        return this.searchAgent.execute(context);
      case 'context':
        return this.contextAgent.execute(context);
      case 'memory':
        return this.memoryAgent.execute(context);
      default:
        return this.coder.execute(context);
    }
  }

  private sendStatus(agent: string, status: string, message: string): void {
    this.mainWindow.webContents.send('ai:agentStatus', { agent, status, message });
  }

  cancel(): void {
    this.isCancelled = true;
    this.llm.cancel();
  }
}
