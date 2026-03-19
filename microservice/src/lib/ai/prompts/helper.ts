export function normalizeSms(text: string): string {
  return text
    .normalize("NFKD") // removes fancy unicode styling
    .replace(/[^\x00-\x7F]/g, "") // keep ASCII only
    .replace(/\s+/g, " ")
    .trim();
}