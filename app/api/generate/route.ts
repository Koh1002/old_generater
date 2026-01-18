import { NextRequest, NextResponse } from 'next/server';
import {
  validateProvider,
  validateApiKey,
  validateAgeRelationship,
  validateImageBuffer,
} from '@/lib/validators';
import { createOpenAIProvider } from '@/lib/providers/openai';
import { createGeminiProvider } from '@/lib/providers/gemini';
import { processImage } from '@/lib/imageUtils';
import { GenerateResponse } from '@/lib/types';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout for image generation

/**
 * POST /api/generate
 * Generates aged image and character description
 */
export async function POST(request: NextRequest) {
  const debugId = randomUUID();

  try {
    // Parse multipart form data
    const formData = await request.formData();

    const provider = formData.get('provider') as string;
    const apiKey = formData.get('apiKey') as string;
    const photoAge = parseInt(formData.get('photoAge') as string, 10);
    const targetAge = parseInt(formData.get('targetAge') as string, 10);
    const imageFile = formData.get('imageFile') as File;

    // Validate provider
    const providerValidation = validateProvider(provider);
    if (!providerValidation.valid) {
      return NextResponse.json(
        {
          error: providerValidation.error,
        } as GenerateResponse,
        { status: 400 }
      );
    }

    // Validate API key
    const keyValidation = validateApiKey(apiKey, provider);
    if (!keyValidation.valid) {
      return NextResponse.json(
        {
          error: keyValidation.error,
        } as GenerateResponse,
        { status: 400 }
      );
    }

    // Validate ages
    const ageValidation = validateAgeRelationship(photoAge, targetAge);
    if (!ageValidation.valid) {
      return NextResponse.json(
        {
          error: ageValidation.error,
        } as GenerateResponse,
        { status: 400 }
      );
    }

    // Validate image file exists
    if (!imageFile) {
      return NextResponse.json(
        {
          error: '画像ファイルがアップロードされていません',
        } as GenerateResponse,
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Validate image buffer
    const bufferValidation = validateImageBuffer(imageBuffer);
    if (!bufferValidation.valid) {
      return NextResponse.json(
        {
          error: bufferValidation.error,
        } as GenerateResponse,
        { status: 400 }
      );
    }

    // Process image (resize, optimize)
    console.log(`[${debugId}] Processing image...`);
    const processedBuffer = await processImage(imageBuffer, debugId);

    // Create provider instance
    let providerInstance;
    if (provider === 'openai') {
      providerInstance = createOpenAIProvider(apiKey);
    } else if (provider === 'gemini') {
      providerInstance = createGeminiProvider(apiKey);
    } else {
      return NextResponse.json(
        {
          error: 'サポートされていないプロバイダーです',
        } as GenerateResponse,
        { status: 400 }
      );
    }

    // Generate aged image and character text in parallel
    console.log(`[${debugId}] Starting generation...`);

    const [imageResult, textResult] = await Promise.all([
      providerInstance
        .generateAgedImage({
          imageBuffer: processedBuffer,
          photoAge,
          targetAge,
        })
        .catch((error) => {
          console.error(`[${debugId}] Image generation failed:`, error);
          throw error;
        }),
      providerInstance
        .generateCharacterText({
          targetAge,
        })
        .catch((error) => {
          console.error(`[${debugId}] Text generation failed:`, error);
          throw error;
        }),
    ]);

    console.log(`[${debugId}] Generation completed successfully`);

    // Return response
    const response: GenerateResponse = {
      imageBase64Png: imageResult.imageBase64,
      characterText: textResult.text,
      usedModels: {
        image: imageResult.modelUsed,
        text: textResult.modelUsed,
      },
      debugId,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error(`[${debugId}] Generation error:`, error);

    // Check for specific error types
    let errorMessage = error.message || '不明なエラーが発生しました';

    // Rate limiting
    if (error.status === 429 || errorMessage.includes('rate limit')) {
      errorMessage = 'APIのレート制限に達しました。しばらく待ってから再試行してください。';
    }

    // Authentication
    if (error.status === 401 || errorMessage.includes('auth')) {
      errorMessage = 'APIキーが無効です。正しいキーを入力してください。';
    }

    // Quota exceeded
    if (error.status === 402 || errorMessage.includes('quota')) {
      errorMessage = 'APIの利用枠を超過しました。プランを確認してください。';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        debugId,
      } as GenerateResponse,
      { status: 500 }
    );
  }
}
