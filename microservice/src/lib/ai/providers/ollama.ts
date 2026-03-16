/**
 * Ollama local API client.
 * Uses /api/generate with stream=false.
 */
import { config } from '../../../../config/index.js';
import { postJson } from '../requests.js';
import { buildZeroShotPrompt, pickLabelFromText } from '../utils.js';
import type { TextGenerationOptions, ZeroShotResult } from '../types.js';

type OllamaGenerateResponse = {
  response?: string;
  done?: boolean;
};

export async function textGeneration(
  model: string,
  inputs: string,
  options?: TextGenerationOptions
): Promise<string | null> {
  const finalModel = model || config.ollamaTextModel;
  if (!finalModel) return null;
  const res = await postJson<OllamaGenerateResponse>(
    `${config.ollamaBaseUrl}/api/generate`,
    { 'Content-Type': 'application/json' },
    {
      model: finalModel,
      prompt: inputs,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        num_predict: options?.max_new_tokens ?? 200,
      },
    }
  );
  if (!res.ok) {
    console.warn('[Ollama] textGeneration failed:', res.status, res.text);
    return null;
  }
  const out = res.data?.response;
  return out ? out.trim() : null;
}

export async function zeroShotClassification(
  model: string,
  inputs: string,
  candidateLabels: string[]
): Promise<ZeroShotResult | null> {
  if (candidateLabels.length === 0) return null;
  const finalModel = model || config.ollamaZeroShotModel || config.ollamaTextModel;
  if (!finalModel) return null;
  const prompt = buildZeroShotPrompt(inputs, candidateLabels);
  const out = await textGeneration(finalModel, prompt, { temperature: 0 });
  const label = pickLabelFromText(out, candidateLabels);
  if (!label) return null;
  return { label, score: 1 };
}

export function isAvailable(): boolean {
  return Boolean(config.ollamaBaseUrl) && Boolean(config.ollamaTextModel || config.ollamaZeroShotModel);
}
