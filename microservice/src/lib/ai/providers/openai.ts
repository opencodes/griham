/**
 * OpenAI client stub (not implemented yet).
 * Placeholder so providers can be swapped via config.
 */
import { config } from '../../../../config/index.js';
import type { TextGenerationOptions, ZeroShotResult } from '../types.js';

export async function textGeneration(
  _model: string,
  _inputs: string,
  _options?: TextGenerationOptions
): Promise<string | null> {
  if (!config.openaiApiKey) return null;
  console.warn('[OpenAI] textGeneration not implemented yet.');
  return null;
}

export async function zeroShotClassification(
  _model: string,
  _inputs: string,
  _candidateLabels: string[]
): Promise<ZeroShotResult | null> {
  if (!config.openaiApiKey) return null;
  console.warn('[OpenAI] zeroShotClassification not implemented yet.');
  return null;
}

export function isAvailable(): boolean {
  return Boolean(config.openaiApiKey);
}
