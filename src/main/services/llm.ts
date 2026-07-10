import { ConfigStore } from './configStore';

export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'gemini';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMStreamCallback {
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: Error) => void;
}

export class LLMService {
  private configStore: ConfigStore;
  private abortController: AbortController | null = null;

  constructor(configStore: ConfigStore) {
    this.configStore = configStore;
  }

  async chat(messages: LLMMessage[], systemPrompt?: string): Promise<LLMResponse> {
    const provider = this.configStore.get('llmProvider', 'openai') as LLMProvider;
    const model = this.configStore.get('llmModel', 'gpt-4o') as string;

    const allMessages: LLMMessage[] = [];
    if (systemPrompt) {
      allMessages.push({ role: 'system', content: systemPrompt });
    }
    allMessages.push(...messages);

    switch (provider) {
      case 'openai':
        return this.chatOpenAI(allMessages, model);
      case 'anthropic':
        return this.chatAnthropic(allMessages, model);
      case 'gemini':
        return this.chatGemini(allMessages, model);
      case 'ollama':
        return this.chatOllama(allMessages, model);
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }

  async chatStream(
    messages: LLMMessage[],
    systemPrompt: string,
    callbacks: LLMStreamCallback
  ): Promise<void> {
    const provider = this.configStore.get('llmProvider', 'openai') as LLMProvider;
    const model = this.configStore.get('llmModel', 'gpt-4o') as string;

    const allMessages: LLMMessage[] = [];
    if (systemPrompt) {
      allMessages.push({ role: 'system', content: systemPrompt });
    }
    allMessages.push(...messages);

    this.abortController = new AbortController();

    switch (provider) {
      case 'openai':
        return this.streamOpenAI(allMessages, model, callbacks);
      case 'anthropic':
        return this.streamAnthropic(allMessages, model, callbacks);
      case 'gemini':
        return this.streamGemini(allMessages, model, callbacks);
      case 'ollama':
        return this.streamOllama(allMessages, model, callbacks);
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // ─── OpenAI ───────────────────────────────────────

  private async chatOpenAI(messages: LLMMessage[], model: string): Promise<LLMResponse> {
    const apiKey = this.configStore.get('openaiApiKey', '') as string;
    if (!apiKey) throw new Error('OpenAI API key not configured. Go to Settings to add it.');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data: any = await response.json();
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  private async streamOpenAI(
    messages: LLMMessage[],
    model: string,
    callbacks: LLMStreamCallback
  ): Promise<void> {
    const apiKey = this.configStore.get('openaiApiKey', '') as string;
    if (!apiKey) throw new Error('OpenAI API key not configured. Go to Settings to add it.');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
        }),
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.substring(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              callbacks.onChunk(content);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      callbacks.onComplete(fullContent);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      callbacks.onError(error);
    }
  }

  // ─── Anthropic ────────────────────────────────────

  private async chatAnthropic(messages: LLMMessage[], model: string): Promise<LLMResponse> {
    const apiKey = this.configStore.get('anthropicApiKey', '') as string;
    if (!apiKey) throw new Error('Anthropic API key not configured. Go to Settings to add it.');

    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemMsg?.content || '',
        messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data: any = await response.json();
    return {
      content: data.content[0].text,
      model: data.model,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }

  private async streamAnthropic(
    messages: LLMMessage[],
    model: string,
    callbacks: LLMStreamCallback
  ): Promise<void> {
    const apiKey = this.configStore.get('anthropicApiKey', '') as string;
    if (!apiKey) throw new Error('Anthropic API key not configured. Go to Settings to add it.');

    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          stream: true,
          system: systemMsg?.content || '',
          messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.substring(6).trim();
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta') {
              const content = parsed.delta?.text || '';
              if (content) {
                fullContent += content;
                callbacks.onChunk(content);
              }
            }
          } catch {
            // Ignore
          }
        }
      }

      callbacks.onComplete(fullContent);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      callbacks.onError(error);
    }
  }

  // ─── Gemini ───────────────────────────────────────

  private async chatGemini(messages: LLMMessage[], model: string): Promise<LLMResponse> {
    const authToken = this.configStore.get('authToken', '') as string;
    if (!authToken) throw new Error('Not logged in. Please log in to Reagen AI.');

    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloud API error: ${error}`);
    }

    const data: any = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return {
      content,
      model: model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  private async streamGemini(
    messages: LLMMessage[],
    model: string,
    callbacks: LLMStreamCallback
  ): Promise<void> {
    const authToken = this.configStore.get('authToken', '') as string;
    if (!authToken) throw new Error('Not logged in. Please log in to Reagen AI.');

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true
        }),
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`Cloud API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // The backend proxies SSE chunks from Gemini directly
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.substring(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (content) {
              fullContent += content;
              callbacks.onChunk(content);
            }
          } catch {
            // Ignore parse errors on incomplete chunks
          }
        }
      }

      callbacks.onComplete(fullContent);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      callbacks.onError(error);
    }
  }

  // ─── Ollama ───────────────────────────────────────

  private async chatOllama(messages: LLMMessage[], model: string): Promise<LLMResponse> {
    const baseUrl = this.configStore.get('ollamaUrl', 'http://localhost:11434') as string;

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3',
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}. Is Ollama running?`);
    }

    const data: any = await response.json();
    return {
      content: data.message.content,
      model: data.model,
    };
  }

  private async streamOllama(
    messages: LLMMessage[],
    model: string,
    callbacks: LLMStreamCallback
  ): Promise<void> {
    const baseUrl = this.configStore.get('ollamaUrl', 'http://localhost:11434') as string;

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3',
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const content = parsed.message?.content || '';
            if (content) {
              fullContent += content;
              callbacks.onChunk(content);
            }
          } catch {
            // Ignore
          }
        }
      }

      callbacks.onComplete(fullContent);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      callbacks.onError(error);
    }
  }
}
