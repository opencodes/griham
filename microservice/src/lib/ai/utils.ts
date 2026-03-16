export function buildZeroShotPrompt(input: string, labels: string[]): string {
  const labelList = labels.map((l) => `- ${l}`).join('\n');
  return `Pick the single best label from this list and reply with ONLY the label.\n${labelList}\nText: "${input}"\nLabel:`;
}

export function pickLabelFromText(text: string | null | undefined, labels: string[]): string | null {
  if (!text) return null;
  const normalized = text.trim().toLowerCase();
  const exact = labels.find((l) => l.toLowerCase() === normalized);
  if (exact) return exact;
  const contains = labels.find((l) => normalized.includes(l.toLowerCase()));
  return contains || null;
}
