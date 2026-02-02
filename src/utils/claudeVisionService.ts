import { monitoringService } from './monitoringService';

export interface ClaudeVisionAnalysis {
  description: string;
  technicalContent: TechnicalContent;
  textContent: OCRResult;
  visualElements: VisualElement[];
  confidence: number;
  processingTime: number;
}

export interface TechnicalContent {
  containsCode: boolean;
  codeLanguage?: string;
  extractedCode?: string;
  codeDescription?: string;
  containsDiagrams: boolean;
  diagramType?: string;
  diagramDescription?: string;
  containsUI: boolean;
  uiElements?: string[];
  technicalTerms: string[];
  concepts: string[];
}

export interface OCRResult {
  extractedText: string;
  confidence: number;
  language: string;
  wordCount: number;
  structuredData?: {
    headings: string[];
    bulletPoints: string[];
    tables: any[];
  };
}

export interface VisualElement {
  type: 'button' | 'input' | 'menu' | 'dialog' | 'chart' | 'graph' | 'image' | 'icon';
  description: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface VisionAnalysisOptions {
  focusAreas?: ('code' | 'diagrams' | 'ui' | 'text' | 'general')[];
  includeBoundingBoxes?: boolean;
  maxTokens?: number;
  detailLevel?: 'low' | 'medium' | 'high';
  extractCode?: boolean;
  identifyTechnicalTerms?: boolean;
}

export class ClaudeVisionService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.anthropic.com/v1/messages';
  private readonly model = 'claude-3-5-sonnet-20241022';
  
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '';
  }

  private ensureApiKey(): void {
    if (!this.apiKey) {
      throw new Error('Claude API key not found in environment variables');
    }
  }

  /**
   * Analyze a video frame using Claude Vision
   */
  async analyzeFrame(
    imageBuffer: Buffer,
    frameId: string,
    options: VisionAnalysisOptions = {}
  ): Promise<ClaudeVisionAnalysis> {
    this.ensureApiKey();
    return await monitoringService.timeFunction(
      'claude_vision_analysis',
      'vision_processing',
      async () => {
        try {
          const defaultOptions: Required<VisionAnalysisOptions> = {
            focusAreas: options.focusAreas || ['general'],
            includeBoundingBoxes: options.includeBoundingBoxes ?? false,
            maxTokens: options.maxTokens || 2000,
            detailLevel: options.detailLevel || 'medium',
            extractCode: options.extractCode ?? true,
            identifyTechnicalTerms: options.identifyTechnicalTerms ?? true,
          };

          const startTime = Date.now();

          // Convert image to base64
          const base64Image = imageBuffer.toString('base64');
          const mimeType = this.detectImageMimeType(imageBuffer);

          // Create focused prompt based on options
          const prompt = this.createAnalysisPrompt(defaultOptions);

          const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: this.model,
              max_tokens: defaultOptions.maxTokens,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: mimeType,
                        data: base64Image,
                      },
                    },
                    {
                      type: 'text',
                      text: prompt,
                    },
                  ],
                },
              ],
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
          }

          const result = await response.json();
          const processingTime = Date.now() - startTime;

          // Parse Claude's response
          const analysis = this.parseClaudeResponse(result.content[0].text, processingTime);

          await monitoringService.log({
            level: 'info',
            component: 'vision_processing',
            action: 'claude_vision_analysis_complete',
            message: `Claude Vision analysis completed for frame ${frameId}`,
            metadata: {
              frameId,
              confidence: analysis.confidence,
              processingTime,
              containsCode: analysis.technicalContent.containsCode,
              containsDiagrams: analysis.technicalContent.containsDiagrams,
              textLength: analysis.textContent.extractedText.length,
            },
          });

          return analysis;

        } catch (error) {
          await monitoringService.log({
            level: 'error',
            component: 'vision_processing',
            action: 'claude_vision_analysis_failed',
            message: `Claude Vision analysis failed for frame ${frameId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: { frameId, error },
          });
          throw error;
        }
      }
    );
  }

  /**
   * Analyze multiple frames in batch
   */
  async analyzeFramesBatch(
    frames: Array<{ id: string; imageBuffer: Buffer }>,
    options: VisionAnalysisOptions = {}
  ): Promise<Map<string, ClaudeVisionAnalysis>> {
    const results = new Map<string, ClaudeVisionAnalysis>();
    const batchSize = 3; // Process 3 frames concurrently to respect rate limits

    for (let i = 0; i < frames.length; i += batchSize) {
      const batch = frames.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async frame => {
        try {
          const analysis = await this.analyzeFrame(frame.imageBuffer, frame.id, options);
          return { frameId: frame.id, analysis, success: true };
        } catch (error) {
          return { frameId: frame.id, error, success: false };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value.success && result.value.analysis) {
          results.set(result.value.frameId, result.value.analysis);
        } else {
          console.error(`Frame analysis failed:`, result);
        }
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < frames.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Specialized analysis for technical content
   */
  async analyzeTechnicalContent(
    imageBuffer: Buffer,
    frameId: string,
    contentType: 'code' | 'diagram' | 'ui' | 'mixed'
  ): Promise<ClaudeVisionAnalysis> {
    const focusAreas = {
      code: ['code'] as const,
      diagram: ['diagrams'] as const,
      ui: ['ui'] as const,
      mixed: ['code', 'diagrams', 'ui'] as const,
    };

    return this.analyzeFrame(imageBuffer, frameId, {
      focusAreas: [...focusAreas[contentType]],
      detailLevel: 'high',
      extractCode: contentType === 'code' || contentType === 'mixed',
      identifyTechnicalTerms: true,
      maxTokens: 3000,
    });
  }

  /**
   * Private helper methods
   */
  private createAnalysisPrompt(options: Required<VisionAnalysisOptions>): string {
    const focusInstructions = this.getFocusInstructions(options.focusAreas);
    const detailLevel = options.detailLevel;
    
    return `Analyze this image and provide a comprehensive analysis in JSON format. Focus on: ${options.focusAreas.join(', ')}.

Please respond with a JSON object with this exact structure:
{
  "description": "Overall description of what's shown in the image",
  "technicalContent": {
    "containsCode": boolean,
    "codeLanguage": "programming language if code is present",
    "extractedCode": "actual code text if present and extractCode is true",
    "codeDescription": "description of what the code does",
    "containsDiagrams": boolean,
    "diagramType": "type of diagram (flowchart, architecture, database schema, etc.)",
    "diagramDescription": "detailed description of the diagram",
    "containsUI": boolean,
    "uiElements": ["list", "of", "UI", "elements"],
    "technicalTerms": ["extracted", "technical", "terms"],
    "concepts": ["key", "technical", "concepts"]
  },
  "textContent": {
    "extractedText": "all readable text in the image",
    "confidence": 0.0-1.0,
    "language": "detected language",
    "wordCount": number,
    "structuredData": {
      "headings": ["any", "headings"],
      "bulletPoints": ["bullet", "points"],
      "tables": []
    }
  },
  "visualElements": [
    {
      "type": "button|input|menu|dialog|chart|graph|image|icon",
      "description": "description of the element",
      "confidence": 0.0-1.0
    }
  ],
  "confidence": 0.0-1.0
}

${focusInstructions}

Detail level: ${detailLevel}
${options.extractCode ? 'Extract any code exactly as written.' : 'Describe code without extracting it.'}
${options.identifyTechnicalTerms ? 'Identify and list technical terms and concepts.' : ''}

Be precise and accurate. If something is not present, set the appropriate boolean to false and omit optional fields.`;
  }

  private getFocusInstructions(focusAreas: string[]): string {
    const instructions: string[] = [];

    if (focusAreas.includes('code')) {
      instructions.push('- Look for any programming code, SQL queries, command lines, or scripts');
      instructions.push('- Identify the programming language and extract the code if possible');
    }

    if (focusAreas.includes('diagrams')) {
      instructions.push('- Identify flowcharts, architecture diagrams, database schemas, network diagrams');
      instructions.push('- Describe the relationships and flow shown in diagrams');
    }

    if (focusAreas.includes('ui')) {
      instructions.push('- Identify user interface elements like buttons, forms, menus, dialogs');
      instructions.push('- Note the layout and interactive elements');
    }

    if (focusAreas.includes('text')) {
      instructions.push('- Extract all readable text with high accuracy');
      instructions.push('- Identify headings, bullet points, and structured content');
    }

    if (focusAreas.includes('general')) {
      instructions.push('- Provide a comprehensive analysis of all visual content');
      instructions.push('- Focus on the most significant elements in the image');
    }

    return instructions.join('\n');
  }

  private parseClaudeResponse(responseText: string, processingTime: number): ClaudeVisionAnalysis {
    try {
      // Extract JSON from Claude's response (it might include additional text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and structure the response
      const analysis: ClaudeVisionAnalysis = {
        description: parsed.description || '',
        technicalContent: {
          containsCode: parsed.technicalContent?.containsCode || false,
          codeLanguage: parsed.technicalContent?.codeLanguage,
          extractedCode: parsed.technicalContent?.extractedCode,
          codeDescription: parsed.technicalContent?.codeDescription,
          containsDiagrams: parsed.technicalContent?.containsDiagrams || false,
          diagramType: parsed.technicalContent?.diagramType,
          diagramDescription: parsed.technicalContent?.diagramDescription,
          containsUI: parsed.technicalContent?.containsUI || false,
          uiElements: parsed.technicalContent?.uiElements || [],
          technicalTerms: parsed.technicalContent?.technicalTerms || [],
          concepts: parsed.technicalContent?.concepts || [],
        },
        textContent: {
          extractedText: parsed.textContent?.extractedText || '',
          confidence: parsed.textContent?.confidence || 0,
          language: parsed.textContent?.language || 'en',
          wordCount: parsed.textContent?.wordCount || 0,
          structuredData: parsed.textContent?.structuredData,
        },
        visualElements: parsed.visualElements || [],
        confidence: parsed.confidence || 0.5,
        processingTime,
      };

      return analysis;

    } catch (error) {
      // Fallback parsing for non-JSON responses
      return this.createFallbackAnalysis(responseText, processingTime);
    }
  }

  private createFallbackAnalysis(responseText: string, processingTime: number): ClaudeVisionAnalysis {
    // Basic text analysis as fallback
    const containsCode = /(?:function|class|def|SELECT|FROM|WHERE|import|const|let|var)/i.test(responseText);
    const containsDiagrams = /(?:diagram|flowchart|schema|architecture|flow)/i.test(responseText);
    const containsUI = /(?:button|input|form|menu|dialog|interface)/i.test(responseText);

    return {
      description: responseText.substring(0, 500),
      technicalContent: {
        containsCode,
        containsDiagrams,
        containsUI,
        technicalTerms: [],
        concepts: [],
      },
      textContent: {
        extractedText: responseText,
        confidence: 0.3,
        language: 'en',
        wordCount: responseText.split(/\s+/).length,
      },
      visualElements: [],
      confidence: 0.3,
      processingTime,
    };
  }

  private detectImageMimeType(buffer: Buffer): string {
    // Simple magic number detection
    if (buffer.length < 4) return 'image/jpeg';
    
    const header = buffer.toString('hex', 0, 4);
    
    if (header.startsWith('ffd8')) return 'image/jpeg';
    if (header.startsWith('8950')) return 'image/png';
    if (header.startsWith('4749')) return 'image/gif';
    if (header.startsWith('5249')) return 'image/webp';
    
    return 'image/jpeg'; // Default fallback
  }
}

// Export singleton instance
export const claudeVisionService = new ClaudeVisionService();