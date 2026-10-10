import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isDatabaseConfigured, sql } from './db';
import { usesCloudData, listCloudJson, writeCloudJson, deleteCloudData } from './cloud-data';

export type AiRange = { min: number; max: number; floor?: number };
export type DeliveryZone = { postcode: string; charge: number };
export type ProductFacts = { warranty: string; materials: string; colours: string };
export type VisitRequest = { name:string; contact:string; date:string; status:'pending'|'reviewed' };
export type Knowledge = { id: string; title: string; text: string; updated: string };
export type Question = { id: string; text: string; created: string; answer?: string };
export type AlashiRecord = { kind: 'knowledge' | 'question' | 'range' | 'delivery' | 'facts' | 'appointment'; id: string; value: Knowledge | Question | AiRange | DeliveryZone | ProductFacts | VisitRequest };
const directory = () => path.join(process.env.ALASHI_DATA_DIR || process.env.PRODUCT_DATA_DIR || path.join(process.cwd(), '.local-data'), 'alashi');
async function table() {
  await sql`CREATE TABLE IF NOT EXISTS alashi_records (id text PRIMARY KEY, kind text NOT NULL, value jsonb NOT NULL)`;
}
export async function records(): Promise<AlashiRecord[]> {
  if (isDatabaseConfigured) { await table(); return await sql`SELECT id, kind, value FROM alashi_records` as AlashiRecord[]; }
  if (usesCloudData()) return listCloudJson<AlashiRecord>('alashi/');
  const { readdir } = await import('node:fs/promises');
  await mkdir(directory(), { recursive: true });
  return Promise.all((await readdir(directory())).filter(name => name.endsWith('.json')).map(async name => JSON.parse(await readFile(path.join(directory(), name), 'utf8'))));
}
export async function putRecord(record: AlashiRecord) {
  if (!isDatabaseConfigured && usesCloudData()) { await writeCloudJson(`alashi/${createRecordKey(record.id)}.json`, record); return; }
  if (isDatabaseConfigured) {
    await table();
    await sql`INSERT INTO alashi_records (id,kind,value) VALUES (${record.id},${record.kind},${JSON.stringify(record.value)}::jsonb) ON CONFLICT (id) DO UPDATE SET kind=EXCLUDED.kind,value=EXCLUDED.value`;
  } else {
    await mkdir(directory(), { recursive: true });
    // Filenames never contain user-provided paths.
    const { createHash } = await import('node:crypto');
    const file = path.join(directory(), createHash('sha256').update(record.id).digest('hex') + '.json');
    const temporary = file + '.' + randomUUID() + '.tmp';
    await writeFile(temporary, JSON.stringify(record), 'utf8'); await rename(temporary, file);
  }
}
export async function deleteRecord(id: string) {
  if (!isDatabaseConfigured && usesCloudData()) { await deleteCloudData(`alashi/${createRecordKey(id)}.json`); return; }
  if (isDatabaseConfigured) { await table(); await sql`DELETE FROM alashi_records WHERE id=${id}`; }
  else {
    const { createHash } = await import('node:crypto'); const { rm } = await import('node:fs/promises');
    await rm(path.join(directory(), createHash('sha256').update(id).digest('hex') + '.json'), { force: true });
  }
}
function createRecordKey(id: string) { return createHash('sha256').update(id).digest('hex'); }
export function validateRange(value: unknown): AiRange {
  const range = value as AiRange;
  if (!range || ![range.min, range.max].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 99999999.99 && Math.abs(n * 100 - Math.round(n * 100)) < 0.00001) || range.min > range.max) throw new Error('Enter valid minimum and maximum GBP prices; maximum must be at least minimum.');
  if (range.floor !== undefined && (!Number.isFinite(range.floor) || range.floor <= 0 || range.floor > range.min || Math.abs(range.floor*100-Math.round(range.floor*100))>0.00001)) throw new Error('The private minimum must be positive and no higher than the listed minimum.');
  return { min: range.min, max: range.max, ...(range.floor !== undefined ? {floor:range.floor} : {}) };
}
export function priceRange(data: AlashiRecord[], id: string, category: string): AiRange | undefined {
  return data.find(r => r.kind === 'range' && r.id === `product:${id}`)?.value as AiRange | undefined
    || data.find(r => r.kind === 'range' && r.id === `category:${category}`)?.value as AiRange | undefined;
}
export async function queueQuestion(text: string) {
  const { createHash } = await import('node:crypto');
  const id = 'question:' + createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
  if (!(await records()).some(r => r.id === id)) await putRecord({ id, kind: 'question', value: { id, text, created: new Date().toISOString() } });
  return id;
}
