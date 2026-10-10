/** Never expose a browser JSON parser exception when an upstream request fails. */
export async function readApiJson(response: Response): Promise<any> {
  const text = await response.text();
  try {
    if (text.trim()) return JSON.parse(text);
  } catch { /* An HTML/plain-text platform error is not an API response. */ }
  throw new Error('This request could not be completed. Please try again.');
}
