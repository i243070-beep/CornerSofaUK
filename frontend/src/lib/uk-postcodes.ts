import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { normalizeUkPostcode } from '@/lib/checkout-details';

export type PostcodeCheck =
  | { valid: true; postcode: string; townOrCity: string }
  | { valid: false; message: string; expectedCity?: string };

function normalizeTown(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-GB').replace(/[^a-z0-9]/g, '');
}

export function verifyPostcodeAndCity(postcodeInput: string, cityInput: string): PostcodeCheck {
  const postcode = normalizeUkPostcode(postcodeInput);
  if (!postcode) return { valid: false, message: 'Please enter a valid UK postcode.' };
  const city = cityInput.trim();
  if (!city) return { valid: false, message: 'Enter your town or city to verify this postcode.' };

  const databasePath = path.resolve(process.cwd(), '..', 'uk_postcodes.sqlite');
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = database.prepare('SELECT town_or_city FROM postcodes WHERE full_postcode = ? LIMIT 1').get(postcode) as { town_or_city: string | null } | undefined;
    if (!row) return { valid: false, message: 'Please enter a valid UK postcode.' };
    const expectedCity = (row.town_or_city || '').trim();
    if (normalizeTown(expectedCity) !== normalizeTown(city)) {
      return {
        valid: false,
        expectedCity,
        message: `This postcode is associated with ${expectedCity || 'a different town or city'}. Please check your town or city.`,
      };
    }
    return { valid: true, postcode, townOrCity: expectedCity };
  } finally {
    database.close();
  }
}
