import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ProviderInterface, ImageGenerationParams, TextGenerationParams } from '../types';
import { generateImagePrompt, getImageGenerationConfig } from '../prompt/imagePrompt';
import { generateCharacterPrompt, getTextGenerationConfig, sanitizeCharacterText } from '../prompt/characterPrompt';

export class GeminiProvider implements ProviderInterface {
  private client: GoogleGenerativeAI;
  private imageModel: string = 'gemini-3-pro-image-preview'; // Default to Nano Banana Pro
  private textModel: string = 'gemini-1.5-flash'; // Default

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
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
      ];

      let validationSuccess = false;
      let testError = null;

      for (const modelName of testModelCandidates) {
        try {
          const testModel = this.client.getGenerativeModel({ model: modelName });
          // Simplified test - just generate simple content
          const result = await testModel.generateContent('test');
          const response = await result.response;
          const text = response.text();

          if (text) {
            validationSuccess = true;
            this.textModel = modelName; // Use the working model
            break;
          }
        } catch (error: any) {
          console.log(`[Gemini] Model ${modelName} test failed:`, error.message);
          testError = error;
          continue;
        }
      }

      if (!validationSuccess) {
        const errorMsg = testError?.message || '全てのモデルでの検証に失敗しました';
        console.error('[Gemini] Validation failed:', errorMsg);
        throw new Error(errorMsg);
      }

      // Set image model - prioritize Nano Banana Pro for best quality
      const imageModelCandidates = [
        'gemini-3-pro-image-preview',  // Nano Banana Pro - best quality, supports reference images
        'gemini-2.5-flash-image',      // Nano Banana - faster, cheaper
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
      console.error('[Gemini] Validation error:', error);

      let errorMessage = error.message || '不明なエラー';

      // Provide more helpful error messages
      if (errorMessage.includes('API key not valid')) {
        errorMessage = 'APIキーが無効です。Google AI Studioで正しいキーを確認してください。';
      } else if (errorMessage.includes('quota')) {
        errorMessage = 'APIの利用枠を超過しています。';
      } else if (errorMessage.includes('permission')) {
        errorMessage = 'APIキーに必要な権限がありません。';
      }

      return {
        ok: false,
        notes: `APIキーの検証に失敗しました: ${errorMessage}`,
      };
    }
  }

  /**
   * Generates an aged image using Gemini image models (Nano Banana)
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

      // Create the model (Nano Banana / Gemini image generation model)
      const model = this.client.getGenerativeModel({
        model: this.imageModel,
      });

      // Gemini image generation uses reference images to maintain consistency
      // We pass the original image as a reference so the model maintains facial features
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: imageBase64,
                },
              },
              {
                text: `${prompt}\n\nIMPORTANT: Use the provided image as a reference. Maintain the EXACT same person's facial features, face structure, and identity. Only change the age-related characteristics.`
              },
            ],
          },
        ],
        generationConfig: {
          temperature: config.temperature,
          candidateCount: config.candidateCount,
          responseMimeType: 'image/png',
        },
      });

      const response = result.response;

      // Extract the generated image from the response
      // Gemini returns images in the parts array with inlineData
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('画像生成に失敗しました: レスポンスが空です');
      }

      const candidate = response.candidates[0];
      if (!candidate.content || !candidate.content.parts) {
        throw new Error('画像生成に失敗しました: コンテンツが空です');
      }

      // Find the image part in the response
      let generatedImageData: string | null = null;
      for (const part of candidate.content.parts) {
        if ((part as any).inlineData) {
          generatedImageData = (part as any).inlineData.data;
          break;
        }
      }

      if (!generatedImageData) {
        throw new Error('画像生成に失敗しました: 画像データが見つかりません');
      }

      return {
        imageBase64: generatedImageData,
        modelUsed: this.imageModel,
      };
    } catch (error: any) {
      console.error('Gemini image generation error:', error);

      // Provide helpful error messages
      let errorMessage = error.message || '不明なエラー';

      if (errorMessage.includes('responseMimeType') || errorMessage.includes('image/png')) {
        errorMessage = `画像生成モデル (${this.imageModel}) がサポートされていない可能性があります。別のモデルをお試しください。`;
      }

      throw new Error(`画像生成エラー: ${errorMessage}`);
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
