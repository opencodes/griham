/**
 * Hugging Face Inference API client (serverless).
 * Uses fetch to call text-generation and zero-shot-classification.
 * No API key = all methods return null (caller should fallback).
 */
import { config } from '../../../../config/index.js';
import { postJson } from '../requests.js';
import type { TextGenerationOptions, ZeroShotResult } from '../types.js';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.huggingFaceApiKey) {
    headers['Authorization'] = `Bearer ${config.huggingFaceApiKey}`;
  }
  return headers;
}

export async function textGeneration(
  model: string,
  inputs: string,
  options?: TextGenerationOptions
): Promise<string | null> {
  if (!config.huggingFaceApiKey) return null;
  const res = await postJson<Array<{ generated_text?: string }> | { generated_text?: string }>(
    `${config.huggingFaceBaseUrl}/${model}`,
    getHeaders(),
    {
      inputs,
      parameters: {
        max_new_tokens: options?.max_new_tokens ?? 200,
        temperature: options?.temperature ?? 0.7,
        return_full_text: false,
      },
    }
  );
  if (!res.ok) {
    console.warn('[HF] textGeneration failed:', res.status, res.text);
    return null;
  }
  const out = res.data;
  if (Array.isArray(out) && out[0]?.generated_text) return out[0].generated_text.trim();
  if (out && typeof (out as { generated_text?: string }).generated_text === 'string') {
    return (out as { generated_text: string }).generated_text.trim();
  }
  return null;
}

/** Zero-shot classification: returns the top label or null. */
export async function zeroShotClassification(
  model: string,
  inputs: string,
  candidateLabels: string[]
): Promise<ZeroShotResult | null> {
  if (!config.huggingFaceApiKey) return null;
  if (candidateLabels.length === 0) return null;
  const res = await postJson<{
    sequence?: string;
    labels?: string[];
    scores?: number[];
  }>(
    `${config.huggingFaceBaseUrl}/${model}`,
    getHeaders(),
    {
      inputs,
      parameters: { candidate_labels: candidateLabels },
    }
  );
  if (!res.ok) {
    console.warn('[HF] zeroShot failed:', res.status, res.text);
    return null;
  }
  const out = res.data;
  if (out?.labels?.[0] !== undefined && out?.scores?.[0] !== undefined) {
    return { label: out.labels[0], score: out.scores[0] };
  }
  return null;
}

/** Whether the client can call HF (has key). */
export function isAvailable(): boolean {
  return Boolean(config.huggingFaceApiKey);
}
