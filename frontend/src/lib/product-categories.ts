export const SOFA_CATEGORIES = ['2-Seater', '3-Seater', 'Corner', 'U-Shape', 'Recliner', 'Sofa Bed', 'Sofa Sets', 'Armchairs', 'Footstools'] as const;

export function categoryLabel(category: string) {
  if (category === 'Sofa Sets') return '2+3 Seater';
  if (['Sofa Sets', 'Armchairs', 'Footstools'].includes(category)) return category;
  if (category === 'Sofa Bed') return 'Sofa beds';
  return `${category} sofas`;
}

export function inCategory(product: { category: string; categories?: string[] }, category: string) {
  return category.split(',').some(value => product.category === value || product.categories?.includes(value));
}
