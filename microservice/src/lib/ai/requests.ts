type PostJsonResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  text?: string;
};

export async function postJson<T>(
  url: string,
  headers: Record<string, string>,
  body: unknown
): Promise<PostJsonResult<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: T | undefined;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = undefined;
      }
    }
    return { ok: res.ok, status: res.status, data, text: text || undefined };
  } catch (err) {
    return { ok: false, status: 0, text: err instanceof Error ? err.message : String(err) };
  }
}
