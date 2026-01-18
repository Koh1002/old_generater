import { ValidationResult } from './types';

const MINIMUM_AGE = 18;
const MAXIMUM_AGE = 120;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validates age input
 * Must be >= 18 and <= 120
 */
export function validateAge(age: number, fieldName: string = '年齢'): ValidationResult {
  if (!age || isNaN(age)) {
    return {
      valid: false,
      error: `${fieldName}を入力してください`,
    };
  }

  if (!Number.isInteger(age)) {
    return {
      valid: false,
      error: `${fieldName}は整数で入力してください`,
    };
  }

  if (age < MINIMUM_AGE) {
    return {
      valid: false,
      error: `${fieldName}は${MINIMUM_AGE}歳以上である必要があります。未成年の年齢変換は扱いません。`,
    };
  }

  if (age > MAXIMUM_AGE) {
    return {
      valid: false,
      error: `${fieldName}は${MAXIMUM_AGE}歳以下である必要があります`,
    };
  }

  return { valid: true };
}

/**
 * Validates photo age and target age relationship
 */
export function validateAgeRelationship(
  photoAge: number,
  targetAge: number
): ValidationResult {
  const photoValidation = validateAge(photoAge, '写真時の年齢');
  if (!photoValidation.valid) {
    return photoValidation;
  }

  const targetValidation = validateAge(targetAge, 'ターゲット年齢');
  if (!targetValidation.valid) {
    return targetValidation;
  }

  if (photoAge === targetAge) {
    return {
      valid: false,
      error: '写真時の年齢とターゲット年齢が同じです。異なる年齢を指定してください。',
    };
  }

  return { valid: true };
}

/**
 * Validates API key format
 */
export function validateApiKey(apiKey: string, provider: string): ValidationResult {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      error: 'APIキーを入力してください',
    };
  }

  // Basic format validation
  if (provider === 'openai') {
    // OpenAI keys typically start with 'sk-'
    if (!apiKey.startsWith('sk-') && !apiKey.startsWith('org-')) {
      return {
        valid: false,
        error: 'OpenAI APIキーの形式が正しくありません（通常は "sk-" で始まります）',
      };
    }
  } else if (provider === 'gemini') {
    // Gemini keys are typically 39 characters
    if (apiKey.length < 30) {
      return {
        valid: false,
        error: 'Gemini APIキーの形式が正しくありません',
      };
    }
  }

  return { valid: true };
}

/**
 * Validates uploaded image file
 */
export function validateImageFile(file: File): ValidationResult {
  if (!file) {
    return {
      valid: false,
      error: '画像ファイルを選択してください',
    };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `サポートされていないファイル形式です。JPEG、PNG、またはWebP形式の画像をアップロードしてください。`,
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます。${MAX_IMAGE_SIZE / 1024 / 1024}MB以下の画像をアップロードしてください。`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'ファイルが空です',
    };
  }

  return { valid: true };
}

/**
 * Validates provider selection
 */
export function validateProvider(provider: string): ValidationResult {
  if (!provider || (provider !== 'openai' && provider !== 'gemini')) {
    return {
      valid: false,
      error: 'プロバイダーを選択してください（OpenAI または Gemini）',
    };
  }

  return { valid: true };
}

/**
 * Server-side buffer validation
 */
export function validateImageBuffer(buffer: Buffer): ValidationResult {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      error: '画像データが無効です',
    };
  }

  if (buffer.length > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `画像サイズが大きすぎます`,
    };
  }

  // Check for common image file signatures
  const signature = buffer.toString('hex', 0, 4).toUpperCase();
  const validSignatures = [
    'FFD8FF', // JPEG
    '89504E47', // PNG
    '52494646', // WebP (RIFF)
  ];

  const isValidImage = validSignatures.some(sig => signature.startsWith(sig));

  if (!isValidImage) {
    return {
      valid: false,
      error: '有効な画像ファイルではありません',
    };
  }

  return { valid: true };
}
