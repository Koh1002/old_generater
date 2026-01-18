import { NextRequest, NextResponse } from 'next/server';
import { validateProvider, validateApiKey } from '@/lib/validators';
import { createOpenAIProvider } from '@/lib/providers/openai';
import { createGeminiProvider } from '@/lib/providers/gemini';
import { ValidateKeyRequest, ValidateKeyResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/validate-key
 * Validates the API key and returns planned models to use
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ValidateKeyRequest = await request.json();
    const { provider, apiKey } = body;

    // Validate provider
    const providerValidation = validateProvider(provider);
    if (!providerValidation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: providerValidation.error,
        } as ValidateKeyResponse,
        { status: 400 }
      );
    }

    // Validate API key format
    const keyValidation = validateApiKey(apiKey, provider);
    if (!keyValidation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: keyValidation.error,
        } as ValidateKeyResponse,
        { status: 400 }
      );
    }

    // Create provider and validate key with actual API call
    let result;
    if (provider === 'openai') {
      const openaiProvider = createOpenAIProvider(apiKey);
      result = await openaiProvider.validateKey();
    } else if (provider === 'gemini') {
      const geminiProvider = createGeminiProvider(apiKey);
      result = await geminiProvider.validateKey();
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: 'サポートされていないプロバイダーです',
        } as ValidateKeyResponse,
        { status: 400 }
      );
    }

    // Return validation result
    const response: ValidateKeyResponse = {
      ok: result.ok,
      plannedImageModel: result.imageModel,
      plannedTextModel: result.textModel,
      notes: result.notes,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Validate key error:', error);

    // Return error without exposing sensitive details
    const errorMessage = error.message || '不明なエラーが発生しました';

    return NextResponse.json(
      {
        ok: false,
        error: `API接続エラー: ${errorMessage}`,
      } as ValidateKeyResponse,
      { status: 500 }
    );
  }
}
