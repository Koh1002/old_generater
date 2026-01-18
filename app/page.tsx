'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { GenerationResult } from '@/lib/types';

type Provider = 'openai' | 'gemini';

interface ValidationResult {
  ok: boolean;
  plannedImageModel?: string;
  plannedTextModel?: string;
  notes?: string;
  error?: string;
}

export default function Home() {
  // Form state
  const [provider, setProvider] = useState<Provider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [photoAge, setPhotoAge] = useState<number | ''>('');
  const [targetAge, setTargetAge] = useState<number | ''>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // UI state
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Results state
  const [results, setResults] = useState<GenerationResult[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('JPEG、PNG、またはWebP形式の画像をアップロードしてください');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください');
      return;
    }

    setImageFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const fakeEvent = {
        target: { files: [file] },
      } as any;
      handleFileChange(fakeEvent);
    }
  };

  // Validate API key
  const handleValidateKey = async () => {
    if (!apiKey) {
      setError('APIキーを入力してください');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          apiKey,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setValidationResult(data);
      } else {
        setError(data.error || 'APIキーの検証に失敗しました');
      }
    } catch (err: any) {
      setError(`接続エラー: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Generate image and text
  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate all inputs
    if (!provider || !apiKey || !photoAge || !targetAge || !imageFile) {
      setError('すべての項目を入力してください');
      return;
    }

    setIsGenerating(true);

    try {
      const formData = new FormData();
      formData.append('provider', provider);
      formData.append('apiKey', apiKey);
      formData.append('photoAge', photoAge.toString());
      formData.append('targetAge', targetAge.toString());
      formData.append('imageFile', imageFile);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        // Add to results
        const newResult: GenerationResult = {
          id: data.debugId || Date.now().toString(),
          imageBase64Png: data.imageBase64Png,
          characterText: data.characterText,
          usedModels: data.usedModels,
          photoAge: photoAge as number,
          targetAge: targetAge as number,
          timestamp: Date.now(),
        };

        // Keep max 3 results
        setResults((prev) => [newResult, ...prev].slice(0, 3));
      }
    } catch (err: any) {
      setError(`生成エラー: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Check if form is valid
  const isFormValid =
    provider && apiKey && photoAge && targetAge && imageFile && !isGenerating;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            AgeShift Story
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            顔写真から年齢を変換し、小説風の人物紹介を生成
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Input Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <form onSubmit={handleGenerate}>
            {/* Provider Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AIプロバイダー
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="openai"
                    checked={provider === 'openai'}
                    onChange={(e) => setProvider(e.target.value as Provider)}
                    className="mr-2"
                  />
                  <span className="text-gray-900 dark:text-white">OpenAI</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="gemini"
                    checked={provider === 'gemini'}
                    onChange={(e) => setProvider(e.target.value as Provider)}
                    className="mr-2"
                  />
                  <span className="text-gray-900 dark:text-white">Gemini</span>
                </label>
              </div>
            </div>

            {/* API Key */}
            <div className="mb-6">
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                APIキー
              </label>
              <div className="flex gap-2">
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    provider === 'openai'
                      ? 'sk-...'
                      : 'Gemini APIキーを入力'
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleValidateKey}
                  disabled={isValidating || !apiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isValidating ? '検証中...' : '接続テスト'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                APIキーはサーバーにのみ送信され、保存されません
              </p>
            </div>

            {/* Validation Result */}
            {validationResult && validationResult.ok && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 text-sm font-medium mb-2">
                  ✓ API接続成功
                </p>
                <div className="text-xs text-green-700 dark:text-green-300">
                  <p>画像生成モデル: {validationResult.plannedImageModel}</p>
                  <p>テキスト生成モデル: {validationResult.plannedTextModel}</p>
                  {validationResult.notes && (
                    <p className="mt-1 italic">{validationResult.notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                顔写真
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                {imagePreview ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-xs max-h-64 rounded-lg mb-2"
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      クリックして画像を変更
                    </p>
                  </div>
                ) : (
                  <div>
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      クリックまたはドラッグ&ドロップで画像をアップロード
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      JPEG, PNG, WebP (最大10MB)
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Ages */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label
                  htmlFor="photoAge"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  写真時の年齢
                </label>
                <input
                  id="photoAge"
                  type="number"
                  min="18"
                  max="120"
                  value={photoAge}
                  onChange={(e) =>
                    setPhotoAge(e.target.value ? parseInt(e.target.value) : '')
                  }
                  placeholder="例: 25"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="targetAge"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  ターゲット年齢
                </label>
                <input
                  id="targetAge"
                  type="number"
                  min="18"
                  max="120"
                  value={targetAge}
                  onChange={(e) =>
                    setTargetAge(e.target.value ? parseInt(e.target.value) : '')
                  }
                  placeholder="例: 65"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={!isFormValid}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  生成中...（最大60秒かかる場合があります）
                </span>
              ) : (
                '画像と紹介文を生成'
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              生成結果
            </h2>

            {results.map((result) => (
              <div
                key={result.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Generated Image */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      生成画像（{result.targetAge}歳）
                    </h3>
                    <img
                      src={`data:image/png;base64,${result.imageBase64Png}`}
                      alt={`${result.targetAge}歳の顔`}
                      className="w-full rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-shadow"
                      onClick={() => {
                        const win = window.open();
                        win?.document.write(
                          `<img src="data:image/png;base64,${result.imageBase64Png}" />`
                        );
                      }}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      使用モデル: {result.usedModels.image}
                    </p>
                  </div>

                  {/* Character Text */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        人物紹介
                      </h3>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(result.characterText);
                          alert('コピーしました！');
                        }}
                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        コピー
                      </button>
                    </div>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {result.characterText}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                      使用モデル: {result.usedModels.text}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {result.photoAge}歳 → {result.targetAge}歳
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            未成年（18歳未満）の年齢変換は扱いません。
            <br />
            APIキーは安全に扱われ、サーバーに保存されません。
          </p>
        </footer>
      </div>
    </main>
  );
}
