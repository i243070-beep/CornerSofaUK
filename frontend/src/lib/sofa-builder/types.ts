import type { FabricSwatch } from '../fabric-options';
export type BuilderOption = {
  id: string; label: string; group: 'feet' | 'piping' | 'comfort';
  productIds: string[]; variantIds?: string[]; image?: string; finish?: string; heightMm?: number;
  priceMode: 'included' | 'fixed' | 'quote_required'; amountPence?: number; published: boolean;
};
export type BuilderRules = {
  revision: number; disabledProductIds: string[]; options: BuilderOption[];
  products: Record<string, { back?: string; orientation?: string; leadTime?: string; approvalRequired?: boolean;
    matchingProductIds?: string[]; packagedMm?: { width: number; height: number; depth: number };
    minMm?: number; maxMm?: number; variantIds?: string[] }>;
};
export type RoomPlan = { widthMm: number; lengthMm: number; xMm: number; yMm: number; rotation: number;
  obstacles: { type: 'door' | 'window'; xMm: number; yMm: number; widthMm: number; depthMm: number }[] };
export type BuildSelection = {
  fabricId?: string; customColour?: string;
  schemaVersion: 1; shape: string; productId: string; variantId: string;
  feet: string; piping: string; pipingColour: string; comfort: string;
  customSize: boolean; dimensionsMm: Record<string, number>; customShape: string;
  request: boolean; notes: string; extras: { productId: string; variantId: string; quantity: number }[];
  roomPlan?: RoomPlan; access?: { doorwayMm?: number; heightMm?: number; hallwayMm?: number; turns?: boolean; lift?: boolean };
  services: { floor: 'ground' | 'first'; removal: boolean };
};
export const EMPTY_BUILD: BuildSelection = { schemaVersion: 1, shape: '', productId: '', variantId: '', feet: 'standard', piping: 'standard', pipingColour: '', comfort: 'standard', customSize: false, dimensionsMm: {}, customShape: '', request: false, notes: '', extras: [], services: { floor: 'ground', removal: false } };
export const DEFAULT_RULES: BuilderRules = { revision: 1, disabledProductIds: [], options: [], products: {} };
export type PriceLine = { id: string; label: string; quantity: number; unitPence: number; totalPence: number };
export type BuildPrice = { fabric?: FabricSwatch; status: 'fixed' | 'estimate' | 'quote_required' | 'unavailable'; lines: PriceLine[]; merchandisePence: number; knownPence: number; totalPence: number | null; unresolved: string[]; errors: string[]; specification: string[]; title: string; image: string; revision: string; expiresAt?: string };
export type BuildSnapshot = { id: string; created: string; selection: BuildSelection; price: BuildPrice };
export type BuildQuote = { id: string; created: string; build: BuildSnapshot; name: string; email: string; phone: string; postcode: string; status: 'pending' | 'reviewed' | 'approved'; approvedPence?: number; expires?: string; adminNotes?: string; revision: number };
