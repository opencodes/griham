import { config } from '../../config/index.js';

const ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';

export interface HuggingFaceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletion(model: string, messages: HuggingFaceMessage[]): Promise<unknown> {
  if (!config.huggingFaceApiKey) {
    throw new Error('HUGGING_FACE_API_KEY is not configured');
  }

  const res = await fetch(ROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.huggingFaceApiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hugging Face error ${res.status}: ${text}`);
  }

  return res.json();
}
