export const OLD_SOFA_REMOVAL_COST = 20;
export function earliestDeliveryDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => Number(parts.find(item => item.type === name)!.value);
  return new Date(Date.UTC(part('year'), part('month') - 1, part('day') + 4)).toISOString().slice(0, 10);
}
export function validDeliveryDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= earliestDeliveryDate();
}
export const ASSEMBLY_FEE = 20;
