// Provider types
export type Provider = 'openai' | 'gemini';

// Request/Response types
export interface ValidateKeyRequest {
  provider: Provider;
  apiKey: string;
}

export interface ValidateKeyResponse {
  ok: boolean;
  plannedImageModel?: string;
  plannedTextModel?: string;
  notes?: string;
  error?: string;
}

export interface GenerateRequest {
  provider: Provider;
  apiKey: string;
  photoAge: number;
  targetAge: number;
  imageFile: File;
}

export interface GenerateResponse {
  imageBase64Png?: string;
  characterText?: string;
  usedModels?: {
    image: string;
    text: string;
  };
  debugId?: string;
  error?: string;
}

// Internal types
export interface ImageGenerationParams {
  imageBuffer: Buffer;
  photoAge: number;
  targetAge: number;
}

export interface TextGenerationParams {
  targetAge: number;
  gender?: 'male' | 'female' | 'unknown';
}

export interface ProviderInterface {
  validateKey(): Promise<{
    ok: boolean;
    imageModel?: string;
    textModel?: string;
    notes?: string;
  }>;

  generateAgedImage(params: ImageGenerationParams): Promise<{
    imageBase64: string;
    modelUsed: string;
  }>;

  generateCharacterText(params: TextGenerationParams): Promise<{
    text: string;
    modelUsed: string;
  }>;
}

// Validation result types
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Generation history types
export interface GenerationResult {
  id: string;
  imageBase64Png: string;
  characterText: string;
  usedModels: {
    image: string;
    text: string;
  };
  photoAge: number;
  targetAge: number;
  timestamp: number;
}
