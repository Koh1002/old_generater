import { TextGenerationParams } from '../types';

/**
 * Generates a prompt for character description text generation
 * Creates a novel-style character introduction based on age
 */
export function generateCharacterPrompt(params: TextGenerationParams): string {
  const { targetAge } = params;

  const prompt = `あなたは小説家です。${targetAge}歳の人物の「登場人物紹介」を書いてください。

以下の構成で、合計300〜500字程度の日本語で書いてください：

【構成】
1段落目：生活の様子
- 住環境（一人暮らし、家族と同居など）
- 仕事や学びの状況（${targetAge}歳として自然な設定）
- 人間関係の傾向
- 休日の過ごし方や趣味の傾向

2段落目：性格
- 長所と短所をバランスよく
- 価値観や考え方の特徴
- 口癖や話し方の特徴を少し含める
- ${targetAge}歳として年齢相応の成熟度や経験を反映

【重要な制約】
- 誹謗中傷的な表現は絶対に使わない
- 病名など医療診断を断定しない
- 過度にセンシティブな属性（政治的立場、宗教など）の断定は避ける
- ポジティブな側面とネガティブな側面の両方を自然に含める
- リアルで共感できる人物像にする
- 性別は断定せず、中性的に書くか、文脈から自然に推測できる程度にする

【トーン】
- 小説の登場人物紹介のような文学的で読みやすい文体
- 観察者の視点から客観的に描写
- ${targetAge}歳という年齢を活かした生活感とリアリティ

見出しは不要です。本文のみを出力してください。`;

  return prompt;
}

/**
 * Gets text generation configuration based on provider
 */
export function getTextGenerationConfig(provider: 'openai' | 'gemini') {
  if (provider === 'openai') {
    return {
      temperature: 0.8,
      max_tokens: 800,
      top_p: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    };
  } else {
    // Gemini configuration
    return {
      temperature: 0.8,
      maxOutputTokens: 800,
      topP: 0.9,
      topK: 40,
    };
  }
}

/**
 * Validates and sanitizes the generated character text
 */
export function sanitizeCharacterText(text: string): string {
  // Remove any potential harmful content markers
  let sanitized = text.trim();

  // Remove excessive newlines (keep paragraph structure)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // Remove any markdown headers that might have been added
  sanitized = sanitized.replace(/^#+\s+/gm, '');

  // Ensure proper length (300-600 characters)
  if (sanitized.length > 600) {
    // Try to cut at a sentence boundary
    const sentences = sanitized.substring(0, 600).split('。');
    sentences.pop(); // Remove incomplete sentence
    sanitized = sentences.join('。') + '。';
  }

  return sanitized;
}
