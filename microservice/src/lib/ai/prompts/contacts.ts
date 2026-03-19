type ContactCleanupPromptInput = {
  payloadJson: string;
};

export function buildContactCleanupPrompt(input: ContactCleanupPromptInput): string {
  return `You are a contact cleanup assistant. Identify contacts that look like junk, corrupted, or placeholders.
Return ONLY a JSON array of objects: [{"id":"<id>","reason":"<short reason>"}].
Use only the provided ids. If none, return [].
Contacts: ${input.payloadJson}`;
}
