export const DELIVERY_OPTIONS = [
  { id: 'standard', name: 'Standard delivery', description: 'Delivered to your room of choice', price: 0, days: '5–7 working days' },
  { id: 'express', name: 'Express delivery', description: 'Priority room-of-choice delivery', price: 29.99, days: '2–3 working days' },
  { id: 'room-of-choice', name: 'Room of choice + assembly', description: 'White-glove service with full assembly', price: 49.99, days: '3–5 working days' },
] as const;

export type CustomerDetails = { name: string; email: string; phone: string; address: string; city: string; postcode: string };
export const EMPTY_CUSTOMER: CustomerDetails = { name: '', email: '', phone: '', address: '', city: '', postcode: '' };
const COMPACT_UK_POSTCODE = /^(?:GIR0AA|[A-PR-UWYZ][A-HK-Y]?\d[A-Z\d]?\d[ABD-HJLNP-UW-Z]{2})$/;

export function normalizeUkPostcode(value: string) {
  const compact = value.toUpperCase().replace(/\s/g, '');
  return COMPACT_UK_POSTCODE.test(compact) ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : undefined;
}

export function checkCustomerDetails(input: unknown) {
  const values = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const customer = Object.fromEntries(Object.keys(EMPTY_CUSTOMER).map(key => [key, typeof values[key] === 'string' ? values[key].trim() : ''])) as CustomerDetails;
  const errors: Partial<Record<keyof CustomerDetails, string>> = {};
  if (customer.name.length < 2 || customer.name.length > 120) errors.name = 'Enter your full name (2–120 characters).';
  if (customer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.email = 'Enter a valid email address.';
  const phoneDigits = customer.phone.replace(/\D/g, '');
  if (!/^\+?[\d\s().-]+$/.test(customer.phone) || phoneDigits.length < 10 || phoneDigits.length > 15) errors.phone = 'Enter a valid contact phone number.';
  if (customer.address.length < 5 || customer.address.length > 250) errors.address = 'Enter your house number or name and street.';
  if (customer.city.length < 2 || customer.city.length > 100) errors.city = 'Enter your town or city.';
  const normalizedPostcode = normalizeUkPostcode(customer.postcode);
  if (!normalizedPostcode) errors.postcode = 'Enter a valid UK postcode, for example SW1A 1AA.';
  else customer.postcode = normalizedPostcode;
  return { customer, errors, valid: Object.keys(errors).length === 0 };
}
