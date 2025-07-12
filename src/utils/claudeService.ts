import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ClaudeService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
  }

  async generateResponse(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      });

      // Extract text content from the response
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      return textContent;
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`Failed to generate Claude response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStreamResponse(
    systemPrompt: string, 
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const stream = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ],
        stream: true,
      });

      for await (const messageStreamEvent of stream) {
        if (messageStreamEvent.type === 'content_block_delta' && 
            messageStreamEvent.delta.type === 'text_delta') {
          onChunk(messageStreamEvent.delta.text);
        }
      }
    } catch (error) {
      console.error('Claude streaming error:', error);
      throw new Error(`Failed to stream Claude response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get available models
  static getAvailableModels() {
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most capable model, best for complex tasks' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and efficient for simple tasks' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Previous generation, very capable' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and cost' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest, most affordable' }
    ];
  }
}