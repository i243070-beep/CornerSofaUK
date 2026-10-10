import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'node:crypto';
import type { BuildSnapshot } from './sofa-builder/types';
import { usesCloudData, readCloudJson, mutateCloudJson } from './cloud-data';

export interface LocalOrder {
  id: string;
  customer: string;
  email: string;
  address: string;
  postcode: string;
  phone: string;
  total: number;
  items: number;
  status: string;
  paymentMethod: string;
  paymentStatus?: 'unpaid' | 'paid';
  city?: string;
  subtotal?: number;
  deliveryOption?: string;
  deliveryCost?: number;
  assemblyCost?: number;
  deliveryPreference?: 'asap' | 'date';
  requestedDeliveryDate?: string;
  deliveryInstructions?: string;
  removeOldSofa?: boolean;
  removalCost?: number;

  checkoutKey?: string;
  checkoutFingerprint?: string;
  trackingToken?: string;
  trackingTokenHash?: string;
  assemblyFloor?: 'ground' | 'first';
  deliveryTime?: string;
  date: string;
  deliveryDate?: string;
  sofaDetails?: string;
  emailSentAt?: string;
  lines: Array<{ title: string; color: string; quantity: number; price: number; type?: 'sofa' | 'swatch'; productId?: string; variantId?: string; range_type?: string; image?: string; buildSnapshot?: BuildSnapshot }>;
}

const dataDirectory = path.join(process.cwd(), '.local-data');
const ordersFile = path.join(dataDirectory, 'orders.json');

async function readOrders(): Promise<LocalOrder[]> {
  if (usesCloudData()) return await readCloudJson<LocalOrder[]>('orders.json') || [];
  try {
    return JSON.parse(await readFile(ordersFile, 'utf8')) as LocalOrder[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return [];
  }
}

async function saveOrders(orders: LocalOrder[]) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${ordersFile}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(orders, null, 2), 'utf8');
  await rename(temporaryFile, ordersFile);
}

export const getLocalOrders = readOrders;

const orderWrites = globalThis as typeof globalThis & { sofaOrderWrites?: Promise<void> };
function mutateOrders<T>(update: (orders: LocalOrder[]) => Promise<T>): Promise<T> {
  if (usesCloudData()) return mutateCloudJson('orders.json', [] as LocalOrder[], update);
  const next = (orderWrites.sofaOrderWrites || Promise.resolve()).then(async () => {
    const orders = await readOrders(); const result = await update(orders); await saveOrders(orders); return result;
  });
  orderWrites.sofaOrderWrites = next.then(() => {}, () => {});
  return next;
}

export class OrderConflictError extends Error {}

export async function createLocalOrder(input: Omit<LocalOrder, 'id' | 'date'>) {
  return mutateOrders(async orders => {
  const existing = input.checkoutKey && orders.find(order => order.checkoutKey === input.checkoutKey);
  if (existing) {
    if (existing.checkoutFingerprint !== input.checkoutFingerprint) throw new OrderConflictError('Your checkout details changed. Please submit again.');
    return existing;
  }
  let id = '';
  const existingIds = new Set(orders.map(order => order.id));
  for (let attempt = 0; attempt < 32; attempt++) {
    const candidate = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    if (/\d/.test(candidate) && /[A-Z]/.test(candidate) && !existingIds.has(candidate)) { id = candidate; break; }
  }
  if (!id) throw new Error('Could not generate a unique order reference. Please retry.');
  const order: LocalOrder = {
    ...input,
    id,
    date: new Date().toISOString(),
  };
  orders.unshift(order);
  return order;
  });
}

export async function updateLocalOrderStatus(id: string, status: string) {
  return mutateOrders(async orders => {
  const order = orders.find((candidate) => candidate.id === id);
  if (!order) return undefined;
  order.status = status;
  return order;
  });
}

export async function updateLocalOrderDelivery(id: string, deliveryDate: string, deliveryTime: string, sofaDetails: string, approve = false) {
  return mutateOrders(async orders => {
  const order = orders.find((candidate) => candidate.id === id);
  if (!order) return undefined;
  order.deliveryDate = deliveryDate;
  order.deliveryTime = deliveryTime;
  order.sofaDetails = sofaDetails;
  if (approve) order.status = 'confirmed';
  return order;
  });
}

export async function markLocalOrderEmailSent(id: string) {
  return mutateOrders(async orders => {
  const order = orders.find((candidate) => candidate.id === id);
  if (!order) return undefined;
  order.emailSentAt = new Date().toISOString();
  return order;
  });
}
