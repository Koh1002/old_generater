import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ProviderInterface, ImageGenerationParams, TextGenerationParams } from '../types';
import { generateImagePrompt, getImageGenerationConfig } from '../prompt/imagePrompt';
import { generateCharacterPrompt, getTextGenerationConfig, sanitizeCharacterText } from '../prompt/characterPrompt';

export class GeminiProvider implements ProviderInterface {
  private client: GoogleGenerativeAI;
  private imageModel: string = 'gemini-2.5-flash-image'; // Default
  private textModel: string = 'gemini-2.5-flash'; // Default

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Validates the API key and discovers available models
   */
  async validateKey(): Promise<{
    ok: boolean;
    imageModel?: string;
    textModel?: string;
    notes?: string;
  }> {
    try {
      // Try to use the API to validate the key with available models
      // Test with the most recent stable text models
      const testModelCandidates = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
      ];

      let validationSuccess = false;
      let testError = null;

      for (const modelName of testModelCandidates) {
        try {
          const testModel = this.client.getGenerativeModel({ model: modelName });
          await testModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'test' }] }],
          });
          validationSuccess = true;
          this.textModel = modelName; // Use the working model
          break;
        } catch (error: any) {
          testError = error;
          continue;
        }
      }

      if (!validationSuccess) {
        throw testError || new Error('全てのモデルでの検証に失敗しました');
      }

      // Set image model (note: Gemini image generation is still in development)
      const imageModelCandidates = [
        'gemini-3-pro-image-preview',
        'gemini-2.5-flash-image',
        'gemini-pro-vision',
      ];

      let notes = '';
      let foundImageModel = false;

      for (const candidate of imageModelCandidates) {
        try {
          const model = this.client.getGenerativeModel({ model: candidate });
          if (model) {
            this.imageModel = candidate;
            foundImageModel = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!foundImageModel) {
        notes += '画像生成モデルの自動検出に失敗しました。デフォルトの gemini-2.5-flash-image を使用します。';
      }

      return {
        ok: true,
        imageModel: this.imageModel,
        textModel: this.textModel,
        notes: notes || undefined,
      };
    } catch (error: any) {
      return {
        ok: false,
        notes: `APIキーの検証に失敗しました: ${error.message || '不明なエラー'}`,
      };
    }
  }

  /**
   * Generates an aged image using Gemini image models
   */
  async generateAgedImage(params: ImageGenerationParams): Promise<{
    imageBase64: string;
    modelUsed: string;
  }> {
    const { imageBuffer, photoAge, targetAge } = params;

    try {
      const prompt = generateImagePrompt(photoAge, targetAge);
      const config = getImageGenerationConfig('gemini');

      // Convert buffer to base64
      const imageBase64 = imageBuffer.toString('base64');

      // Create the model
      const model = this.client.getGenerativeModel({
        model: this.imageModel,
      });

      // For Gemini, we use the multimodal approach with both image and text
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/png',
        },
      };

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              imagePart,
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: config.temperature,
          candidateCount: config.candidateCount,
        },
      });

      const response = result.response;

      // For image generation, Gemini might return the image differently
      // This is a placeholder for the actual Gemini image generation API
      // which might work differently

      // Note: As of early 2025, Gemini's image generation capabilities
      // are still evolving. The actual API might differ.
      // This implementation assumes a future API structure.

      // For now, we'll return an error indicating the feature needs proper Gemini API support
      throw new Error(
        'Gemini画像生成機能は開発中です。現在はOpenAIプロバイダーをご利用ください。' +
        'Gemini APIの画像生成機能が正式にリリースされ次第対応します。'
      );

    } catch (error: any) {
      console.error('Gemini image generation error:', error);
      throw new Error(`画像生成エラー: ${error.message || '不明なエラー'}`);
    }
  }

  /**
   * Generates character description text using Gemini
   */
  async generateCharacterText(params: TextGenerationParams): Promise<{
    text: string;
    modelUsed: string;
  }> {
    try {
      const prompt = generateCharacterPrompt(params);
      const config = getTextGenerationConfig('gemini');

      const model = this.client.getGenerativeModel({
        model: this.textModel,
      });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxOutputTokens,
          topP: config.topP,
          topK: config.topK,
        },
      });

      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error('テキスト生成に失敗しました: レスポンスが空です');
      }

      const sanitized = sanitizeCharacterText(text);

      return {
        text: sanitized,
        modelUsed: this.textModel,
      };
    } catch (error: any) {
      console.error('Gemini text generation error:', error);
      throw new Error(`テキスト生成エラー: ${error.message || '不明なエラー'}`);
    }
  }
}

/**
 * Factory function to create Gemini provider
 */
export function createGeminiProvider(apiKey: string): GeminiProvider {
  return new GeminiProvider(apiKey);
}
