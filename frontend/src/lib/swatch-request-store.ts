import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { usesCloudData, readCloudJson, mutateCloudJson } from './cloud-data';

export type LocalSwatchRequest = {
  id: string;
  customer_name: string;
  email: string;
  shipping_address: { line1: string; line2?: string; city: string; postcode: string };
  swatch_ids: string[];
  status: string;
  created_at: string;
};

const filePath = () => path.join(process.env.PRODUCT_DATA_DIR || path.join(process.cwd(), '.local-data'), 'swatch-requests.json');

export async function readLocalSwatchRequests(): Promise<LocalSwatchRequest[]> {
  if (usesCloudData()) return await readCloudJson<LocalSwatchRequest[]>('swatch-requests.json') || [];
  try { return JSON.parse(await readFile(filePath(), 'utf8')) as LocalSwatchRequest[]; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}

async function writeLocalSwatchRequests(requests: LocalSwatchRequest[]) {
  await mkdir(path.dirname(filePath()), { recursive: true });
  await writeFile(filePath(), JSON.stringify(requests, null, 2), 'utf8');
}

export async function addLocalSwatchRequest(request: Omit<LocalSwatchRequest, 'id' | 'created_at' | 'status'>) {
  const created: LocalSwatchRequest = { ...request, id: crypto.randomUUID(), status: 'pending', created_at: new Date().toISOString() };
  if (usesCloudData()) { await mutateCloudJson('swatch-requests.json', [] as LocalSwatchRequest[], requests => { requests.unshift(created); }); return created; }
  await writeLocalSwatchRequests([created, ...(await readLocalSwatchRequests())]);
  return created;
}

export async function updateLocalSwatchRequest(id: string, status: string) {
  if (usesCloudData()) return mutateCloudJson('swatch-requests.json', [] as LocalSwatchRequest[], requests => {
    const index = requests.findIndex(request => request.id === id); if (index < 0) return undefined;
    requests[index] = { ...requests[index], status }; return requests[index];
  });
  const requests = await readLocalSwatchRequests();
  const index = requests.findIndex((request) => request.id === id);
  if (index < 0) return undefined;
  requests[index] = { ...requests[index], status };
  await writeLocalSwatchRequests(requests);
  return requests[index];
}

export async function deleteLocalSwatchRequest(id: string) {
  if (usesCloudData()) return mutateCloudJson('swatch-requests.json', [] as LocalSwatchRequest[], requests => {
    const index = requests.findIndex(request => request.id === id); if (index < 0) return false;
    requests.splice(index, 1); return true;
  });
  const requests = await readLocalSwatchRequests();
  const next = requests.filter((request) => request.id !== id);
  if (next.length === requests.length) return false;
  await writeLocalSwatchRequests(next);
  return true;
}
