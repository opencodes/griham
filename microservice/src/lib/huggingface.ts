/**
 * Hugging Face Inference API client (serverless).
 * Uses fetch to call text-generation and zero-shot-classification.
 * No API key = all methods return null (caller should fallback).
 */
import { config } from '../../config/index.js';

const HF_BASE = 'https://api-inference.huggingface.co/models';

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
  options?: { max_new_tokens?: number; temperature?: number }
): Promise<string | null> {
  if (!config.huggingFaceApiKey) return null;
  try {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        inputs,
        parameters: {
          max_new_tokens: options?.max_new_tokens ?? 200,
          temperature: options?.temperature ?? 0.7,
          return_full_text: false,
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('[HF] textGeneration failed:', res.status, err);
      return null;
    }
    const out = (await res.json()) as Array<{ generated_text?: string }> | { generated_text?: string };
    if (Array.isArray(out) && out[0]?.generated_text) return out[0].generated_text.trim();
    if (out && typeof (out as { generated_text?: string }).generated_text === 'string') {
      return (out as { generated_text: string }).generated_text.trim();
    }
    return null;
  } catch (e) {
    console.warn('[HF] textGeneration error:', e);
    return null;
  }
}

/** Zero-shot classification: returns the top label or null. */
export async function zeroShotClassification(
  model: string,
  inputs: string,
  candidateLabels: string[]
): Promise<{ label: string; score: number } | null> {
  if (!config.huggingFaceApiKey) return null;
  if (candidateLabels.length === 0) return null;
  try {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        inputs,
        parameters: { candidate_labels: candidateLabels },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('[HF] zeroShot failed:', res.status, err);
      return null;
    }
    const out = (await res.json()) as {
      sequence?: string;
      labels?: string[];
      scores?: number[];
    };
    if (out?.labels?.[0] !== undefined && out?.scores?.[0] !== undefined) {
      return { label: out.labels[0], score: out.scores[0] };
    }
    return null;
  } catch (e) {
    console.warn('[HF] zeroShot error:', e);
    return null;
  }
}

/** Whether the client can call HF (has key). */
export function isHuggingFaceAvailable(): boolean {
  return Boolean(config.huggingFaceApiKey);
}