export type TextGenerationOptions = {
  max_new_tokens?: number;
  temperature?: number;
};

export type ZeroShotResult = {
  label: string;
  score: number;
};

export type AiClient = {
  textGeneration: (model: string, inputs: string, options?: TextGenerationOptions) => Promise<string | null>;
  zeroShotClassification: (model: string, inputs: string, candidateLabels: string[]) => Promise<ZeroShotResult | null>;
  isAvailable: () => boolean;
};

export type AiProviderName = 'huggingface' | 'openai' | 'ollama';
