// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readApiJson } from '../lib/api-json';

describe('API response handling', () => {
  it('preserves successful payloads and API validation errors', async () => {
    expect(await readApiJson(Response.json({ price: 529 }))).toEqual({ price: 529 });
    expect(await readApiJson(Response.json({ error: 'Choose a sofa.' }, { status: 400 }))).toEqual({ error: 'Choose a sofa.' });
  });
  it.each(['', '<html>Server error</html>', '{"price":'])('handles an empty or interrupted platform response', async body => {
    await expect(readApiJson(new Response(body, { status: 500 }))).rejects.toThrow('This request could not be completed. Please try again.');
  });
});
