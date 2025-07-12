import { ClaudeService } from './claudeService';

export type LLMProvider = 'openai' | 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export class LLMService {
  private provider: LLMProvider;
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private claudeService?: ClaudeService;

  constructor(config: LLMConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;

    // Set default models based on provider
    if (config.model) {
      this.model = config.model;
    } else {
      this.model = this.provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-20241022';
    }

    // Initialize Claude service if needed
    if (this.provider === 'claude') {
      this.claudeService = new ClaudeService({
        apiKey: this.apiKey,
        model: this.model,
        maxTokens: this.maxTokens,
        temperature: this.temperature
      });
    }
  }

  async generateResponse(systemPrompt: string, userMessage: string): Promise<LLMResponse> {
    switch (this.provider) {
      case 'openai':
        return this.generateOpenAIResponse(systemPrompt, userMessage);
      case 'claude':
        return this.generateClaudeResponse(systemPrompt, userMessage);
      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  private async generateOpenAIResponse(systemPrompt: string, userMessage: string): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      provider: 'openai',
      model: this.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens
      }
    };
  }

  private async generateClaudeResponse(systemPrompt: string, userMessage: string): Promise<LLMResponse> {
    if (!this.claudeService) {
      throw new Error('Claude service not initialized');
    }

    const content = await this.claudeService.generateResponse(systemPrompt, userMessage);
    return {
      content,
      provider: 'claude',
      model: this.model,
      // Note: Claude API doesn't return token usage in the same way as OpenAI
    };
  }

  // Static method to get available models for each provider
  static getAvailableModels(provider: LLMProvider) {
    switch (provider) {
      case 'openai':
        return [
          { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable OpenAI model' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Faster, more affordable GPT-4' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation, very capable' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' }
        ];
      case 'claude':
        return [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most capable model, best for complex tasks' },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and efficient for simple tasks' },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Previous generation, very capable' },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and cost' },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest, most affordable' }
        ];
      default:
        return [];
    }
  }

  // Helper method to validate API keys
  static async validateApiKey(provider: LLMProvider, apiKey: string): Promise<boolean> {
    try {
      const llm = new LLMService({ provider, apiKey });
      await llm.generateResponse('You are a helpful assistant.', 'Say "Hello" in one word.');
      return true;
    } catch (error) {
      console.error(`API key validation failed for ${provider}:`, error);
      return false;
    }
  }
}