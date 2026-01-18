import OpenAI from 'openai';
import { ProviderInterface, ImageGenerationParams, TextGenerationParams } from '../types';
import { generateImagePrompt, getImageGenerationConfig } from '../prompt/imagePrompt';
import { generateCharacterPrompt, getTextGenerationConfig, sanitizeCharacterText } from '../prompt/characterPrompt';

export class OpenAIProvider implements ProviderInterface {
  private client: OpenAI;
  private imageModel: string = 'dall-e-3'; // Default, will be updated
  private textModel: string = 'gpt-4o'; // Default, will be updated

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
    });
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
      // Try to list models to validate the key
      const models = await this.client.models.list();
      const modelList = models.data.map(m => m.id);

      // Find the best image model
      // Priority: gpt-image-1.5 > dall-e-3 > dall-e-2
      const imageModelCandidates = [
        'gpt-image-1.5',
        'dall-e-3',
        'dall-e-2',
      ];

      for (const candidate of imageModelCandidates) {
        if (modelList.includes(candidate)) {
          this.imageModel = candidate;
          break;
        }
      }

      // Find the best text model
      // Priority: gpt-5 variants > gpt-4o variants > gpt-4-turbo variants
      const textModelPatterns = [
        /^gpt-5/,
        /^gpt-4o/,
        /^gpt-4-turbo/,
        /^gpt-4-/,
      ];

      for (const pattern of textModelPatterns) {
        const matchingModels = modelList
          .filter(m => pattern.test(m))
          .sort()
          .reverse();

        if (matchingModels.length > 0) {
          this.textModel = matchingModels[0];
          break;
        }
      }

      let notes = '';
      if (!modelList.includes('gpt-image-1.5') && this.imageModel === 'dall-e-3') {
        notes = '画像生成には DALL-E 3 を使用します。';
      }

      return {
        ok: true,
        imageModel: this.imageModel,
        textModel: this.textModel,
        notes,
      };
    } catch (error: any) {
      // If listing models fails, try a simple completion to validate the key
      try {
        await this.client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        });

        // Key is valid but we can't list models
        return {
          ok: true,
          imageModel: this.imageModel,
          textModel: this.textModel,
          notes: 'APIキーは有効です。モデル一覧の取得に制限があるため、デフォルトモデルを使用します。',
        };
      } catch (validationError: any) {
        return {
          ok: false,
          notes: `APIキーの検証に失敗しました: ${validationError.message || '不明なエラー'}`,
        };
      }
    }
  }

  /**
   * Generates an aged image using DALL-E or future image models
   */
  async generateAgedImage(params: ImageGenerationParams): Promise<{
    imageBase64: string;
    modelUsed: string;
  }> {
    const { imageBuffer, photoAge, targetAge } = params;

    try {
      const prompt = generateImagePrompt(photoAge, targetAge);
      const config = getImageGenerationConfig('openai');

      // Convert buffer to base64 for the API
      const imageBase64 = imageBuffer.toString('base64');
      const imageDataUrl = `data:image/png;base64,${imageBase64}`;

      // Check if we're using DALL-E or a newer image model
      if (this.imageModel.startsWith('dall-e')) {
        // DALL-E doesn't support image editing with reference images in the same way
        // We'll use image generation with a detailed prompt
        // Note: This is a limitation of current DALL-E API
        const response = await this.client.images.generate({
          model: this.imageModel,
          prompt: prompt + `\n\nGenerate a photorealistic portrait of a person at age ${targetAge}.`,
          n: 1,
          size: config.size,
          quality: config.quality,
          response_format: 'b64_json',
        });

        if (!response.data || !response.data[0] || !response.data[0].b64_json) {
          throw new Error('画像生成に失敗しました: レスポンスが空です');
        }

        return {
          imageBase64: response.data[0].b64_json,
          modelUsed: this.imageModel,
        };
      } else {
        // For future models like gpt-image-1.5, we might have edit capabilities
        // This is a placeholder for future API structure
        throw new Error(`モデル ${this.imageModel} はまだサポートされていません`);
      }
    } catch (error: any) {
      console.error('OpenAI image generation error:', error);
      throw new Error(`画像生成エラー: ${error.message || '不明なエラー'}`);
    }
  }

  /**
   * Generates character description text using GPT
   */
  async generateCharacterText(params: TextGenerationParams): Promise<{
    text: string;
    modelUsed: string;
  }> {
    try {
      const prompt = generateCharacterPrompt(params);
      const config = getTextGenerationConfig('openai');

      const response = await this.client.chat.completions.create({
        model: this.textModel,
        messages: [
          {
            role: 'system',
            content: 'あなたは優れた小説家です。リアルで共感できる人物描写を得意としています。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        frequency_penalty: config.frequency_penalty,
        presence_penalty: config.presence_penalty,
      });

      const text = response.choices[0]?.message?.content;

      if (!text) {
        throw new Error('テキスト生成に失敗しました: レスポンスが空です');
      }

      const sanitized = sanitizeCharacterText(text);

      return {
        text: sanitized,
        modelUsed: this.textModel,
      };
    } catch (error: any) {
      console.error('OpenAI text generation error:', error);
      throw new Error(`テキスト生成エラー: ${error.message || '不明なエラー'}`);
    }
  }
}

/**
 * Factory function to create OpenAI provider
 */
export function createOpenAIProvider(apiKey: string): OpenAIProvider {
  return new OpenAIProvider(apiKey);
}
