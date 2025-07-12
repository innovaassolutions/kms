import { embeddingService } from './enhancedEmbeddingService';
import { claudeVisionService } from './claudeVisionService';
import { monitoringService } from './monitoringService';

export interface MultiModalEmbedding {
  textEmbedding?: number[];
  visualEmbedding?: number[];
  combinedEmbedding: number[];
  confidence: number;
  metadata: {
    hasText: boolean;
    hasVisual: boolean;
    textLength: number;
    visualConfidence: number;
    combinationMethod: string;
  };
}

export interface MultiModalContent {
  text?: string;
  imageBuffer?: Buffer;
  imageUrl?: string;
  visualDescription?: string;
  technicalTerms?: string[];
  concepts?: string[];
}

export interface EmbeddingWeights {
  text: number;
  visual: number;
  technical: number;
  semantic: number;
}

export class MultiModalEmbeddingService {
  private readonly defaultWeights: EmbeddingWeights = {
    text: 0.4,
    visual: 0.3,
    technical: 0.2,
    semantic: 0.1,
  };

  /**
   * Generate multi-modal embedding from various content types
   */
  async generateMultiModalEmbedding(
    content: MultiModalContent,
    weights: Partial<EmbeddingWeights> = {}
  ): Promise<MultiModalEmbedding> {
    return await monitoringService.timeFunction(
      'generate_multimodal_embedding',
      'multimodal_processing',
      async () => {
        const finalWeights = { ...this.defaultWeights, ...weights };
        let textEmbedding: number[] | undefined;
        let visualEmbedding: number[] | undefined;
        let visualConfidence = 0;

        // Process text content
        if (content.text && content.text.trim().length > 0) {
          const textResult = await embeddingService.generateEmbedding(content.text);
          textEmbedding = textResult.embedding;
        }

        // Process visual content
        if (content.imageBuffer || content.imageUrl) {
          let imageBuffer = content.imageBuffer;
          
          // Download image if URL provided
          if (!imageBuffer && content.imageUrl) {
            try {
              const response = await fetch(content.imageUrl);
              imageBuffer = Buffer.from(await response.arrayBuffer());
            } catch (error) {
              console.error('Failed to download image:', error);
            }
          }

          if (imageBuffer) {
            try {
              // Analyze image with Claude Vision
              const visionAnalysis = await claudeVisionService.analyzeFrame(
                imageBuffer,
                'multimodal_embedding',
                {
                  focusAreas: ['general', 'code', 'diagrams', 'ui', 'text'],
                  detailLevel: 'high',
                  extractCode: true,
                  identifyTechnicalTerms: true,
                }
              );

              visualConfidence = visionAnalysis.confidence;

              // Create comprehensive visual description
              const visualDescription = this.createVisualDescription(visionAnalysis);
              
              if (visualDescription.trim().length > 0) {
                const visualResult = await embeddingService.generateEmbedding(visualDescription);
                visualEmbedding = visualResult.embedding;
              }
            } catch (error) {
              console.error('Vision analysis failed:', error);
              visualConfidence = 0;
            }
          }
        }

        // Use provided visual description if no image processing occurred
        if (!visualEmbedding && content.visualDescription) {
          const visualResult = await embeddingService.generateEmbedding(content.visualDescription);
          visualEmbedding = visualResult.embedding;
          visualConfidence = 0.7; // Default confidence for provided descriptions
        }

        // Generate technical content embedding
        let technicalEmbedding: number[] | undefined;
        if (content.technicalTerms && content.technicalTerms.length > 0) {
          const technicalText = content.technicalTerms.join(' ');
          const techResult = await embeddingService.generateEmbedding(technicalText);
          technicalEmbedding = techResult.embedding;
        }

        // Generate concept embedding
        let conceptEmbedding: number[] | undefined;
        if (content.concepts && content.concepts.length > 0) {
          const conceptText = content.concepts.join(' ');
          const conceptResult = await embeddingService.generateEmbedding(conceptText);
          conceptEmbedding = conceptResult.embedding;
        }

        // Combine embeddings using weighted average
        const combinedEmbedding = this.combineEmbeddings([
          { embedding: textEmbedding, weight: finalWeights.text },
          { embedding: visualEmbedding, weight: finalWeights.visual },
          { embedding: technicalEmbedding, weight: finalWeights.technical },
          { embedding: conceptEmbedding, weight: finalWeights.semantic },
        ]);

        const confidence = this.calculateCombinedConfidence(
          textEmbedding,
          visualEmbedding,
          visualConfidence,
          finalWeights
        );

        const result: MultiModalEmbedding = {
          textEmbedding,
          visualEmbedding,
          combinedEmbedding,
          confidence,
          metadata: {
            hasText: !!textEmbedding,
            hasVisual: !!visualEmbedding,
            textLength: content.text?.length || 0,
            visualConfidence,
            combinationMethod: 'weighted_average',
          },
        };

        await monitoringService.log({
          level: 'info',
          component: 'multimodal_processing',
          action: 'multimodal_embedding_generated',
          message: 'Generated multi-modal embedding',
          metadata: {
            hasText: result.metadata.hasText,
            hasVisual: result.metadata.hasVisual,
            confidence: result.confidence,
            textLength: result.metadata.textLength,
          },
        });

        return result;
      }
    );
  }

  /**
   * Generate embeddings for video frame with context
   */
  async generateFrameEmbedding(
    frameImageBuffer: Buffer,
    frameId: string,
    contextText?: string,
    previousFrameContext?: string[]
  ): Promise<MultiModalEmbedding> {
    // Analyze the frame
    const visionAnalysis = await claudeVisionService.analyzeFrame(
      frameImageBuffer,
      frameId,
      {
        focusAreas: ['code', 'diagrams', 'ui', 'text'],
        detailLevel: 'high',
        extractCode: true,
        identifyTechnicalTerms: true,
      }
    );

    // Create comprehensive content description
    const contentParts = [
      visionAnalysis.description,
      visionAnalysis.textContent.extractedText,
      visionAnalysis.technicalContent.extractedCode,
      visionAnalysis.technicalContent.codeDescription,
      visionAnalysis.technicalContent.diagramDescription,
      contextText,
      ...(previousFrameContext || []),
    ].filter(Boolean);

    const content: MultiModalContent = {
      text: contentParts.join(' '),
      imageBuffer: frameImageBuffer,
      technicalTerms: visionAnalysis.technicalContent.technicalTerms,
      concepts: visionAnalysis.technicalContent.concepts,
    };

    // Use specialized weights for video frames
    const frameWeights: Partial<EmbeddingWeights> = {
      visual: 0.5, // Higher visual weight for video frames
      text: 0.3,
      technical: 0.15,
      semantic: 0.05,
    };

    return this.generateMultiModalEmbedding(content, frameWeights);
  }

  /**
   * Generate document embedding combining text and any visual elements
   */
  async generateDocumentEmbedding(
    textContent: string,
    visualElements?: Buffer[],
    documentType?: string
  ): Promise<MultiModalEmbedding> {
    let combinedVisualDescription = '';

    // Process visual elements if present
    if (visualElements && visualElements.length > 0) {
      const visualDescriptions: string[] = [];
      
      for (const imageBuffer of visualElements.slice(0, 5)) { // Limit to 5 images
        try {
          const analysis = await claudeVisionService.analyzeFrame(
            imageBuffer,
            'document_visual',
            {
              focusAreas: documentType === 'technical' ? ['code', 'diagrams'] : ['general'],
              detailLevel: 'medium',
            }
          );
          
          visualDescriptions.push(analysis.description);
        } catch (error) {
          console.error('Failed to analyze visual element:', error);
        }
      }
      
      combinedVisualDescription = visualDescriptions.join(' ');
    }

    const content: MultiModalContent = {
      text: textContent,
      visualDescription: combinedVisualDescription,
    };

    // Adjust weights based on document type
    const documentWeights: Partial<EmbeddingWeights> = 
      documentType === 'technical' 
        ? { text: 0.5, visual: 0.3, technical: 0.2 }
        : { text: 0.7, visual: 0.2, technical: 0.1 };

    return this.generateMultiModalEmbedding(content, documentWeights);
  }

  /**
   * Search for similar content using multi-modal embeddings
   */
  async findSimilarContent(
    queryEmbedding: MultiModalEmbedding,
    candidateEmbeddings: MultiModalEmbedding[],
    similarityThreshold = 0.7
  ): Promise<Array<{ index: number; similarity: number; embedding: MultiModalEmbedding }>> {
    const results: Array<{ index: number; similarity: number; embedding: MultiModalEmbedding }> = [];

    for (let i = 0; i < candidateEmbeddings.length; i++) {
      const candidate = candidateEmbeddings[i];
      
      // Calculate similarity using combined embeddings
      const similarity = this.calculateCosineSimilarity(
        queryEmbedding.combinedEmbedding,
        candidate.combinedEmbedding
      );

      if (similarity > similarityThreshold) {
        results.push({
          index: i,
          similarity,
          embedding: candidate,
        });
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);
    
    return results;
  }

  /**
   * Private helper methods
   */
  private createVisualDescription(visionAnalysis: any): string {
    const parts = [
      visionAnalysis.description,
      visionAnalysis.textContent.extractedText,
    ];

    // Add technical content descriptions
    if (visionAnalysis.technicalContent.containsCode) {
      parts.push(`Contains ${visionAnalysis.technicalContent.codeLanguage || 'programming'} code`);
      if (visionAnalysis.technicalContent.codeDescription) {
        parts.push(visionAnalysis.technicalContent.codeDescription);
      }
    }

    if (visionAnalysis.technicalContent.containsDiagrams) {
      parts.push(`Contains ${visionAnalysis.technicalContent.diagramType || 'technical'} diagram`);
      if (visionAnalysis.technicalContent.diagramDescription) {
        parts.push(visionAnalysis.technicalContent.diagramDescription);
      }
    }

    if (visionAnalysis.technicalContent.containsUI) {
      parts.push('Contains user interface elements');
      if (visionAnalysis.technicalContent.uiElements) {
        parts.push(`UI elements: ${visionAnalysis.technicalContent.uiElements.join(', ')}`);
      }
    }

    // Add technical terms and concepts
    if (visionAnalysis.technicalContent.technicalTerms?.length > 0) {
      parts.push(`Technical terms: ${visionAnalysis.technicalContent.technicalTerms.join(', ')}`);
    }

    if (visionAnalysis.technicalContent.concepts?.length > 0) {
      parts.push(`Concepts: ${visionAnalysis.technicalContent.concepts.join(', ')}`);
    }

    return parts.filter(Boolean).join(' ');
  }

  private combineEmbeddings(weightedEmbeddings: Array<{ embedding?: number[]; weight: number }>): number[] {
    // Filter out undefined embeddings
    const validEmbeddings = weightedEmbeddings.filter(item => item.embedding);
    
    if (validEmbeddings.length === 0) {
      throw new Error('No valid embeddings to combine');
    }

    const embeddingDim = validEmbeddings[0].embedding!.length;
    const combined = new Array(embeddingDim).fill(0);
    let totalWeight = 0;

    for (const { embedding, weight } of validEmbeddings) {
      if (embedding) {
        totalWeight += weight;
        for (let i = 0; i < embeddingDim; i++) {
          combined[i] += embedding[i] * weight;
        }
      }
    }

    // Normalize by total weight
    if (totalWeight > 0) {
      for (let i = 0; i < embeddingDim; i++) {
        combined[i] /= totalWeight;
      }
    }

    return combined;
  }

  private calculateCombinedConfidence(
    textEmbedding?: number[],
    visualEmbedding?: number[],
    visualConfidence?: number,
    weights?: EmbeddingWeights
  ): number {
    let confidence = 0;
    let totalWeight = 0;

    if (textEmbedding && weights) {
      confidence += 0.9 * weights.text; // High confidence for text
      totalWeight += weights.text;
    }

    if (visualEmbedding && visualConfidence && weights) {
      confidence += visualConfidence * weights.visual;
      totalWeight += weights.visual;
    }

    return totalWeight > 0 ? confidence / totalWeight : 0.5;
  }

  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Utility methods for specific use cases
   */
  async generateQueryEmbedding(
    query: string,
    imageData?: string,
    queryType: 'text' | 'image' | 'mixed' = 'text'
  ): Promise<MultiModalEmbedding> {
    const content: MultiModalContent = { text: query };

    if (imageData && (queryType === 'image' || queryType === 'mixed')) {
      content.imageBuffer = Buffer.from(imageData, 'base64');
    }

    const weights = queryType === 'image' 
      ? { visual: 0.7, text: 0.3 }
      : queryType === 'mixed'
      ? { visual: 0.5, text: 0.5 }
      : { text: 1.0, visual: 0.0 };

    return this.generateMultiModalEmbedding(content, weights);
  }

  async batchGenerateEmbeddings(
    contentItems: MultiModalContent[],
    weights?: Partial<EmbeddingWeights>
  ): Promise<MultiModalEmbedding[]> {
    const results: MultiModalEmbedding[] = [];
    const batchSize = 3; // Process in small batches to manage resources

    for (let i = 0; i < contentItems.length; i += batchSize) {
      const batch = contentItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(content => 
        this.generateMultiModalEmbedding(content, weights)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch embedding generation failed:', result.reason);
          // Add placeholder embedding for failed items
          results.push({
            combinedEmbedding: new Array(1536).fill(0),
            confidence: 0,
            metadata: {
              hasText: false,
              hasVisual: false,
              textLength: 0,
              visualConfidence: 0,
              combinationMethod: 'error',
            },
          });
        }
      }

      // Add delay between batches
      if (i + batchSize < contentItems.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

// Export singleton instance
export const multiModalEmbeddingService = new MultiModalEmbeddingService();