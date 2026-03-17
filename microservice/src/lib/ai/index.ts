import { config } from '../../../config/index.js';
import type { AiClient, AiProviderName, TextGenerationOptions, ZeroShotResult } from './types.js';
import * as huggingface from './providers/huggingface.js';
import * as ollama from './providers/ollama.js';
import * as openai from './providers/openai.js';

function getProvider(name: AiProviderName): AiClient {
  switch (name) {
    case 'ollama':
      return ollama;
    case 'openai':
      return openai;
    case 'huggingface':
    default:
      return huggingface;
  }
}

export function getActiveProvider(): AiProviderName {
  return config.aiProvider;
}

export function getDefaultTextModel(): string {
  switch (config.aiProvider) {
    case 'ollama':
      return config.ollamaTextModel;
    case 'openai':
      return config.openaiTextModel;
    case 'huggingface':
    default:
      return config.huggingFaceTextModel;
  }
}

export function getDefaultZeroShotModel(): string {
  switch (config.aiProvider) {
    case 'ollama':
      return config.ollamaZeroShotModel || config.ollamaTextModel;
    case 'openai':
      return config.openaiZeroShotModel || config.openaiTextModel;
    case 'huggingface':
    default:
      return config.huggingFaceZeroShotModel;
  }
}

export async function textGeneration(
  model: string,
  inputs: string,
  options?: TextGenerationOptions
): Promise<string | null> {
  console.log('TextGenerationOptions', JSON.stringify({
    model, inputs, options
  }));
  return getProvider(config.aiProvider).textGeneration(model, inputs, options);
}

export async function zeroShotClassification(
  model: string,
  inputs: string,
  candidateLabels: string[]
): Promise<ZeroShotResult | null> {
  return getProvider(config.aiProvider).zeroShotClassification(model, inputs, candidateLabels);
}

export function isAiAvailable(): boolean {
  return getProvider(config.aiProvider).isAvailable();
}
